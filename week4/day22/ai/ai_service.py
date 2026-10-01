# ai/ai_service.py
from flask import Flask, request, jsonify
import numpy as np
import pandas as pd
import joblib
import logging
from typing import Dict, Any, List


class AIService:
    def __init__(self, model_path: str, pipeline_path: str):
        self.app = Flask(__name__)
        self.model = joblib.load(model_path)
        self.pipeline = joblib.load(pipeline_path)
        self.logger = logging.getLogger(__name__)
        self.setup_routes()

    def setup_routes(self):
        """Setup API routes"""
        @self.app.route('/predict', methods=['POST'])
        def predict():
            try:
                data = request.get_json()
                prediction = self.make_prediction(data)
                return jsonify({
                    'success': True,
                    'prediction': prediction,
                    'confidence': self.get_confidence(data)
                })
            except Exception as e:
                self.logger.error(f"Prediction error: {e}")
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 400

        @self.app.route('/batch_predict', methods=['POST'])
        def batch_predict():
            try:
                data = request.get_json()
                predictions = self.make_batch_predictions(data)
                return jsonify({
                    'success': True,
                    'predictions': predictions
                })
            except Exception as e:
                self.logger.error(f"Batch prediction error: {e}")
                return jsonify({
                    'success': False,
                    'error': str(e)
                }), 400

        @self.app.route('/health', methods=['GET'])
        def health():
            return jsonify({
                'status': 'healthy',
                'model_loaded': self.model is not None,
                'pipeline_loaded': self.pipeline is not None
            })

    def _expected_features(self):
        """Feature names (in fit order) the scaler was trained on."""
        stored = self.pipeline.get('feature_columns')
        if stored:
            return list(stored)
        scaler = self.pipeline.get('scaler')
        if hasattr(scaler, 'feature_names_in_'):
            return list(scaler.feature_names_in_)
        return None

    def preprocess_input(self, data: Dict[str, Any]) -> np.ndarray:
        """Preprocess input data for prediction"""
        # Convert to DataFrame
        df = pd.DataFrame([data])

        # Encode raw categorical values with the per-column encoders
        # fitted during training. Pipelines saved before per-column
        # encoders existed simply skip this step (encoders == {}).
        # NOTE: numeric-dtype check (not `== object`) because pandas >= 2
        # infers the dedicated 'str' dtype for string columns.
        encoders = self.pipeline.get('encoders') or {}
        for col, encoder in encoders.items():
            if col in df.columns and not pd.api.types.is_numeric_dtype(df[col]):
                try:
                    df[col] = encoder.transform(df[col])
                except ValueError as e:
                    raise ValueError(f"Unseen category in column '{col}': {e}")

        # Reorder/select columns to match training order. This is required
        # because JSON object key order is not guaranteed (Flask's test
        # client and many serializers sort keys alphabetically), while
        # sklearn validates DataFrame column order on transform.
        expected = self._expected_features()
        if expected is not None:
            missing = [c for c in expected if c not in df.columns]
            if missing:
                raise ValueError(f"Missing features for prediction: {missing}")
            df = df[expected]

        # Apply preprocessing pipeline
        return self.pipeline['scaler'].transform(df)

    def make_prediction(self, data: Dict[str, Any]) -> Any:
        """Make a single prediction"""
        processed_data = self.preprocess_input(data)
        prediction = self.model.predict(processed_data)
        # Convert numpy scalars (e.g. np.int64) to native Python types so
        # Flask's jsonify can serialize the response.
        value = prediction[0]
        return value.item() if hasattr(value, 'item') else value

    def make_batch_predictions(self, data: List[Dict[str, Any]]) -> List[Any]:
        """Make batch predictions"""
        if not data:
            return []
        df = pd.DataFrame(data)

        encoders = self.pipeline.get('encoders') or {}
        for col, encoder in encoders.items():
            if col in df.columns and not pd.api.types.is_numeric_dtype(df[col]):
                try:
                    df[col] = encoder.transform(df[col])
                except ValueError as e:
                    raise ValueError(f"Unseen category in column '{col}': {e}")

        expected = self._expected_features()
        if expected is not None:
            missing = [c for c in expected if c not in df.columns]
            if missing:
                raise ValueError(f"Missing features for prediction: {missing}")
            df = df[expected]

        processed_data = self.pipeline['scaler'].transform(df)
        predictions = self.model.predict(processed_data)
        return predictions.tolist()

    def get_confidence(self, data: Dict[str, Any]) -> float:
        """Get prediction confidence"""
        processed_data = self.preprocess_input(data)
        if hasattr(self.model, 'predict_proba'):
            probabilities = self.model.predict_proba(processed_data)
            return float(np.max(probabilities))
        return 1.0

    def run(self, host: str = '0.0.0.0', port: int = 5000):
        """Run the AI service"""
        self.logger.info(f"Starting AI service on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)
