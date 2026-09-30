# AI/ML Guide

## Machine Learning Fundamentals
- **Data Pipelines**: Data collection, preprocessing, and feature engineering
- **Model Training**: Supervised, unsupervised, and reinforcement learning
- **Model Evaluation**: Metrics, validation, and performance assessment
- **Model Deployment**: Production model serving and monitoring
- **AI Ethics**: Responsible AI development and deployment

## Best Practices
- **Data Quality**: Ensuring high-quality training data
- **Model Selection**: Choosing appropriate algorithms
- **Performance**: Optimizing model performance
- **Monitoring**: Model performance and drift detection
- **Security**: AI model security and privacy

---

## Implementation Notes (this repo)

- Pipeline: `ai/data_pipeline.py` (`DataPipeline` — `load_data()`,
  `preprocess_data()`, `split_data()`, `evaluate_model()`,
  `save_pipeline()` / `load_pipeline()`).
- Models: `ai/models.py` (`MLModelFactory` — `random_forest`,
  `gradient_boosting`, `logistic_regression`, `svm`,
  `neural_network`, `xgboost`; `train_model()` /
  `save_model()` / `load_model()`).
- Serving: `ai/ai_service.py` (`AIService` — `POST /predict`,
  `POST /batch_predict`, `GET /health`).
- Clients: `ai/web-integration.js` (`AIWebIntegration`),
  `ai/mobile-integration.ts` (`AIMobileIntegration` with
  AsyncStorage offline cache).
- Install: `pip install -r ai/requirements.txt`.

## Runtime Fixes (verified with an end-to-end test)

Found by running the spec code (Flask test client + synthetic data);
all fixed without changing class names, method names, or routes:

- **Column order**: `preprocess_input()` reorders incoming features to
  the scaler's fit order (`feature_columns`, fallback
  `feature_names_in_`). JSON key order is not guaranteed (many
  serializers sort keys), and sklearn rejects mismatched DataFrame
  column order — `/predict` returned 400 before this fix.
- **Batch predictions**: `make_batch_predictions()` now scores the whole
  list (spec code only scored `data[0]`).
- **JSON serialization**: `make_prediction()` converts numpy scalars via
  `.item()` so `jsonify` never chokes on `np.int64`.
- **Raw categoricals**: `DataPipeline` keeps one `LabelEncoder` per
  column (`encoders` + `feature_columns` in the saved pipeline, old
  `scaler`/`label_encoder` keys unchanged), and the service encodes raw
  strings (e.g. `"city": "paris"`) before scaling. Unseen categories and
  missing features return a clean 400 message.
- **pandas >= 2 compat**: categorical detection uses
  `is_numeric_dtype` instead of `select_dtypes(include=['object'])`,
  since pandas infers the `str` dtype for strings.
- **Small-data split**: `split_data()` falls back to an unstratified
  split when a class has < 2 members instead of raising.
