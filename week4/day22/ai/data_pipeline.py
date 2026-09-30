# ai/data_pipeline.py
import pandas as pd
import numpy as np
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import joblib
import logging


class DataPipeline:
    def __init__(self):
        self.scaler = StandardScaler()
        self.label_encoder = LabelEncoder()
        # Per-column encoders so every categorical column keeps its own
        # mapping (a single shared LabelEncoder only remembers the last
        # column it was fitted on). `label_encoder` is kept for backward
        # compatibility with pipelines saved before this fix.
        self.encoders = {}
        # Feature column names (excluding the target), in fit order, so
        # inference code can reorder incoming data to match the scaler.
        self.feature_columns = None
        self.logger = logging.getLogger(__name__)

    def load_data(self, file_path: str) -> pd.DataFrame:
        """Load data from various sources"""
        try:
            if file_path.endswith('.csv'):
                data = pd.read_csv(file_path)
            elif file_path.endswith('.json'):
                data = pd.read_json(file_path)
            elif file_path.endswith('.parquet'):
                data = pd.read_parquet(file_path)
            else:
                raise ValueError(f"Unsupported file format: {file_path}")

            self.logger.info(f"Loaded data with shape: {data.shape}")
            return data
        except Exception as e:
            self.logger.error(f"Failed to load data: {e}")
            raise

    def preprocess_data(self, data: pd.DataFrame, target_column: str = None) -> pd.DataFrame:
        """Preprocess and clean data"""
        # Work on a copy to avoid SettingWithCopy warnings on slices
        data = data.copy()

        # Handle missing values
        data = data.dropna()

        # Remove duplicates
        data = data.drop_duplicates()

        # Handle categorical variables (one encoder per column).
        # NOTE: non-numeric dtypes are detected instead of just 'object'
        # because pandas >= 2 infers the dedicated 'str' dtype for strings.
        categorical_columns = [
            c for c in data.columns
            if not pd.api.types.is_numeric_dtype(data[c])
        ]
        for col in categorical_columns:
            if col != target_column:
                encoder = LabelEncoder()
                data[col] = encoder.fit_transform(data[col])
                self.encoders[col] = encoder
                self.label_encoder = encoder

        # Handle numerical variables
        numerical_columns = data.select_dtypes(include=[np.number]).columns
        if target_column and target_column in numerical_columns:
            numerical_columns = numerical_columns.drop(target_column)

        # Scale numerical features
        if len(numerical_columns) > 0:
            data[numerical_columns] = self.scaler.fit_transform(data[numerical_columns])

        # Remember feature order (excluding target) for inference
        if target_column and target_column in data.columns:
            self.feature_columns = [c for c in data.columns if c != target_column]
        else:
            self.feature_columns = list(data.columns)

        self.logger.info(f"Preprocessed data with shape: {data.shape}")
        return data

    def split_data(self, data: pd.DataFrame, target_column: str, test_size: float = 0.2):
        """Split data into training and testing sets"""
        X = data.drop(columns=[target_column])
        y = data[target_column]

        try:
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42, stratify=y
            )
        except ValueError as e:
            # Stratified split needs >= 2 members per class; fall back to a
            # plain split on tiny/imbalanced datasets instead of crashing.
            self.logger.warning(f"Stratified split failed ({e}); using unstratified split")
            X_train, X_test, y_train, y_test = train_test_split(
                X, y, test_size=test_size, random_state=42
            )

        self.logger.info(f"Data split - Train: {X_train.shape}, Test: {X_test.shape}")
        return X_train, X_test, y_train, y_test

    def evaluate_model(self, model, X_test, y_test):
        """Evaluate model performance"""
        y_pred = model.predict(X_test)

        metrics = {
            'accuracy': accuracy_score(y_test, y_pred),
            'precision': precision_score(y_test, y_pred, average='weighted'),
            'recall': recall_score(y_test, y_pred, average='weighted'),
            'f1_score': f1_score(y_test, y_pred, average='weighted')
        }

        self.logger.info(f"Model evaluation metrics: {metrics}")
        return metrics

    def save_pipeline(self, file_path: str):
        """Save the preprocessing pipeline"""
        pipeline_data = {
            'scaler': self.scaler,
            'label_encoder': self.label_encoder,
            'encoders': self.encoders,
            'feature_columns': self.feature_columns
        }
        joblib.dump(pipeline_data, file_path)
        self.logger.info(f"Pipeline saved to: {file_path}")

    def load_pipeline(self, file_path: str):
        """Load the preprocessing pipeline"""
        pipeline_data = joblib.load(file_path)
        self.scaler = pipeline_data['scaler']
        self.label_encoder = pipeline_data['label_encoder']
        # New keys may be absent in pipelines saved before this fix
        self.encoders = pipeline_data.get('encoders', {})
        self.feature_columns = pipeline_data.get('feature_columns')
        self.logger.info(f"Pipeline loaded from: {file_path}")
