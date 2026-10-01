# Generative AI Guide

## Large Language Models
- **OpenAI**: GPT models and text generation
- **Hugging Face**: Open-source models and transformers
- **Ollama**: Local LLM deployment and management
- **Prompt Engineering**: Effective prompt design
- **Model Selection**: Choosing the right LLM

## Best Practices
- **Prompt Design**: Effective prompt engineering
- **Cost Optimization**: Managing API costs and usage
- **Security**: Secure LLM integration
- **Performance**: Optimizing LLM inference
- **Ethics**: Responsible AI content generation

---

## Implementation Notes (this repo)

- `ai/openai_integration.py` (`OpenAIIntegration` — `generate_text()`,
  `generate_summary()`, `generate_code()`, `generate_documentation()`,
  `chat_completion()`, `generate_embeddings()`, `batch_generate()`).
  Uses `openai>=1.0` client (`client.chat.completions.create`,
  `client.embeddings.create`). Same class/method names as the spec.
  Set `OPENAI_API_KEY` + optional `OPENAI_BASE_URL` for free
  OpenAI-compatible providers; `mock=True` (or no key) returns
  deterministic offline text for tests.
- `ai/huggingface_integration.py` (`HuggingFaceIntegration` —
  `load_text_generation_model()` / `load_summarization_model()` /
  `load_question_answering_model()`, `generate_text()` /
  `summarize_text()` / `answer_question()` / `get_model_info()`).
  `transformers`/`torch` are lazy-imported inside `load_*`, so the
  package imports without GPU deps.
- `ai/ollama_integration.py` (`OllamaIntegration` — `generate_text()` /
  `chat_completion()` / `pull_model()` / `list_models()` /
  `get_model_info()` / `delete_model()`). Defaults to `llama3.2:1b`
  (pass `model="llama2"` for exact spec behaviour). Daemon-safe:
  boots with an empty model list when `ollama serve` is down.
- Serving: `ai/content_generation_api.py` (`AIContentGenerationAPI` —
  `POST /generate/text`, `POST /generate/summary`,
  `POST /generate/code`, `POST /chat`, `GET /models`, `GET /health`).
  HF pipelines load only with `load_hf=True`; otherwise `/summary`
  uses a free offline extractive fallback.
- Client: `ai/web-ai-integration.js` (`WebAIIntegration` — same
  methods/routes as the spec).
- Install: `pip install -r ai/requirements.txt`. Run free/offline:
  `python -m ai.content_generation_api` (mock mode when no key).

## Runtime Fixes (verified with an offline smoke test)

Found by running the spec-style code without keys, daemons, or GPU
weights; all fixed without changing class names, method names, or routes:

- **OpenAI SDK v1**: spec's `openai.ChatCompletion.create` /
  `openai.Embedding.create` raise `APIRemovedInV1` on `openai>=1.0` —
  now `OpenAI().chat.completions.create` / `.embeddings.create`.
- **Retired models**: `text-davinci-003` kept as an alias key routing
  to the chat default; `text-embedding-ada-002` maps to
  `text-embedding-3-small`.
- **Fail-fast at init**: spec raised `ValueError` in `__init__` and
  imported heavy deps at module load — now lazy (client built on
  first real call, `transformers`/`torch`/`flask` imported on use),
  so wiring + tests boot with zero keys installed.
- **Ollama daemon down**: spec crashed in `__init__` — now warns and
  keeps an empty list; every request has a timeout; `pull_model`
  drains the streaming body.
- **Summary without weights**: `/generate/summary` no longer requires
  the 1.6GB `bart-large-cnn` download; offline extractive fallback
  answers with `original_length` / `summary_length` intact.

## Free Alternatives (same tasks, no paid key)

| Task | Paid/spec default | Free drop-in |
|------|-------------------|--------------|
| Chat / text gen | OpenAI `gpt-4/3.5` (paid) | Groq (`openai/gpt-oss-120b/20b`), Gemini free tier, OpenRouter free models, HF Inference API — all OpenAI-compatible via `OPENAI_BASE_URL` |
| Summarization | `facebook/bart-large-cnn` local (~1.6GB) | `sshleifer/distilbart-cnn-12-6` (~300MB), or serverless HF Inference, or built-in offline fallback |
| QA / embeddings | `text-embedding-ada-002`, local DistilBERT | `sentence-transformers/all-MiniLM-L6-v2`, Cohere embed trial, HF serverless |
| Local LLM | `llama2:7b` (~4GB) | `llama3.2:1b`, `phi3:mini`, `tinyllama`, `qwen2.5:0.5b` via `ollama pull` |
