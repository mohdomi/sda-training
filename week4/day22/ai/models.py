# ai/models.py
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.linear_model import LogisticRegression
from sklearn.svm import SVC
from sklearn.neural_network import MLPClassifier
import xgboost as xgb
import joblib
import logging


class MLModelFactory:
    def __init__(self):
        self.logger = logging.getLogger(__name__)

    def create_classifier(self, model_type: str, **kwargs):
        """Create a classifier based on the specified type"""
        models = {
            'random_forest': RandomForestClassifier(
                n_estimators=kwargs.get('n_estimators', 100),
                max_depth=kwargs.get('max_depth', None),
                random_state=42
            ),
            'gradient_boosting': GradientBoostingClassifier(
                n_estimators=kwargs.get('n_estimators', 100),
                learning_rate=kwargs.get('learning_rate', 0.1),
                random_state=42
            ),
            'logistic_regression': LogisticRegression(
                random_state=42,
                max_iter=kwargs.get('max_iter', 1000)
            ),
            'svm': SVC(
                kernel=kwargs.get('kernel', 'rbf'),
                random_state=42
            ),
            'neural_network': MLPClassifier(
                hidden_layer_sizes=kwargs.get('hidden_layer_sizes', (100,)),
                random_state=42,
                max_iter=kwargs.get('max_iter', 1000)
            ),
            'xgboost': xgb.XGBClassifier(
                n_estimators=kwargs.get('n_estimators', 100),
                learning_rate=kwargs.get('learning_rate', 0.1),
                random_state=42
            )
        }

        if model_type not in models:
            raise ValueError(f"Unsupported model type: {model_type}")

        return models[model_type]

    def train_model(self, model, X_train, y_train):
        """Train the model"""
        self.logger.info(f"Training model: {type(model).__name__}")
        model.fit(X_train, y_train)
        self.logger.info("Model training completed")
        return model

    def save_model(self, model, file_path: str):
        """Save the trained model"""
        joblib.dump(model, file_path)
        self.logger.info(f"Model saved to: {file_path}")

    def load_model(self, file_path: str):
        """Load a trained model"""
        model = joblib.load(file_path)
        self.logger.info(f"Model loaded from: {file_path}")
        return model
