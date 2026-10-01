# ai/content_generation_api.py
#
# Spec: Day 23 Task 4 — AI content generation service
# Routes (unchanged from spec):
#   POST /generate/text, POST /generate/summary, POST /generate/code,
#   POST /chat, GET /models, GET /health
#
# Modernized (spec-compatible):
# - Same class name (AIContentGenerationAPI), same routes, same
#   request/response shapes.
# - Lazy service wiring: HF local models are NOT loaded at boot
#   (spec booted them eagerly, which needs GBs of downloads + torch).
#   Set load_hf=True to opt into local pipelines, otherwise summary
#   falls back to a free offline extractive summarizer.
# - OpenAI service uses the new SDK client + OPENAI_BASE_URL so free
#   OpenAI-compatible providers (Groq/OpenRouter/HF) work unchanged.
# - Mock-friendly: with no keys/daemons the API still boots and every
#   route answers (mock text), so frontend work + tests are free.
import logging
import os
import re
from typing import Any, Dict, List


class AIContentGenerationAPI:
    def __init__(
        self,
        openai_key: str = None,
        ollama_url: str = None,
        load_hf: bool = False,
        mock: bool = False,
    ):
        # Flask import is local so `import ai.content_generation_api`
        # never fails on machines without flask installed.
        from flask import Flask

        self.app = Flask(__name__)
        self.logger = logging.getLogger(__name__)

        # Initialize AI services (all optional — API always boots).
        self.openai_service = None
        self.ollama_service = None
        self.huggingface_service = None

        openai_key = openai_key or os.getenv("OPENAI_API_KEY")
        if openai_key or mock or os.getenv("OPENAI_BASE_URL"):
            from .openai_integration import OpenAIIntegration

            self.openai_service = OpenAIIntegration(
                api_key=openai_key,
                mock=(mock or not openai_key),
            )

        if ollama_url or os.getenv("OLLAMA_URL"):
            from .ollama_integration import OllamaIntegration

            self.ollama_service = OllamaIntegration(
                ollama_url or os.getenv("OLLAMA_URL", "http://localhost:11434")
            )

        if load_hf:
            from .huggingface_integration import HuggingFaceIntegration

            self.huggingface_service = HuggingFaceIntegration()

        self.setup_routes()

    # -- routing helpers -------------------------------------------------
    def _is_openai_model(self, model: str) -> bool:
        m = (model or "").lower()
        return m.startswith(
            ("gpt-", "gpt4", "o1", "o3", "text-", "gemini", "groq", "openrouter")
        )

    def _is_ollama_model(self, model: str) -> bool:
        m = (model or "").lower()
        return m.startswith(
            ("llama", "llama3", "phi3", "phi-3", "tinyllama", "qwen", "mistral")
        )

    def _offline_summary(self, text: str, max_length: int = 150) -> str:
        """Free extractive fallback: first N words by sentence."""
        sentences = re.split(r"(?<=[.!?])\s+", (text or "").strip())
        words: List[str] = []
        for s in sentences:
            words.extend(s.split())
            if len(words) >= max_length:
                break
        summary = " ".join(words[:max_length])
        return summary + ("..." if len(words) > max_length else "")

    def setup_routes(self):
        """Setup API routes"""
        from flask import jsonify, request

        @self.app.route("/generate/text", methods=["POST"])
        def generate_text():
            try:
                data = request.get_json(force=True, silent=True) or {}
                prompt = data.get("prompt")
                model = data.get("model", "gpt-3.5-turbo")
                max_tokens = data.get("max_tokens", 1000)
                temperature = data.get("temperature", 0.7)

                if not prompt:
                    return jsonify({"error": "Prompt is required"}), 400

                # Choose service based on model
                if self._is_openai_model(model):
                    if not self.openai_service:
                        return (
                            jsonify({"error": "OpenAI service not available"}),
                            500,
                        )
                    result = self.openai_service.generate_text(
                        prompt, model, max_tokens, temperature
                    )
                elif self._is_ollama_model(model):
                    if not self.ollama_service:
                        return (
                            jsonify({"error": "Ollama service not available"}),
                            500,
                        )
                    result = self.ollama_service.generate_text(prompt, model)
                else:
                    if self.huggingface_service:
                        result = self.huggingface_service.generate_text(prompt)
                    elif self.openai_service:
                        result = self.openai_service.generate_text(
                            prompt, model, max_tokens, temperature
                        )
                    else:
                        return (
                            jsonify({"error": "No text generation service available"}),
                            500,
                        )

                return jsonify(
                    {"success": True, "result": result, "model": model}
                )

            except Exception as e:
                self.logger.error(f"Text generation error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/generate/summary", methods=["POST"])
        def generate_summary():
            try:
                data = request.get_json(force=True, silent=True) or {}
                text = data.get("text")
                max_length = data.get("max_length", 150)

                if not text:
                    return jsonify({"error": "Text is required"}), 400

                # Prefer local HF summarizer when loaded; otherwise use the
                # free offline extractive fallback (no downloads, no key).
                if self.huggingface_service:
                    result = self.huggingface_service.summarize_text(
                        text, max_length
                    )
                else:
                    result = self._offline_summary(text, max_length)

                return jsonify(
                    {
                        "success": True,
                        "summary": result,
                        "original_length": len(text),
                        "summary_length": len(result),
                    }
                )

            except Exception as e:
                self.logger.error(f"Summarization error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/generate/code", methods=["POST"])
        def generate_code():
            try:
                data = request.get_json(force=True, silent=True) or {}
                description = data.get("description")
                language = data.get("language", "python")

                if not description:
                    return jsonify({"error": "Description is required"}), 400

                if not self.openai_service:
                    return (
                        jsonify({"error": "OpenAI service not available"}),
                        500,
                    )

                result = self.openai_service.generate_code(description, language)

                return jsonify(
                    {"success": True, "code": result, "language": language}
                )

            except Exception as e:
                self.logger.error(f"Code generation error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/chat", methods=["POST"])
        def chat():
            try:
                data = request.get_json(force=True, silent=True) or {}
                messages = data.get("messages", [])
                model = data.get("model", "gpt-3.5-turbo")

                if not messages:
                    return jsonify({"error": "Messages are required"}), 400

                # Choose service based on model
                if self._is_openai_model(model):
                    if not self.openai_service:
                        return (
                            jsonify({"error": "OpenAI service not available"}),
                            500,
                        )
                    result = self.openai_service.chat_completion(messages, model)
                elif self._is_ollama_model(model):
                    if not self.ollama_service:
                        return (
                            jsonify({"error": "Ollama service not available"}),
                            500,
                        )
                    result = self.ollama_service.chat_completion(messages, model)
                else:
                    return jsonify({"error": "Unsupported model"}), 400

                return jsonify(
                    {"success": True, "response": result, "model": model}
                )

            except Exception as e:
                self.logger.error(f"Chat error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/models", methods=["GET"])
        def list_models():
            """List available models"""
            models: Dict[str, Any] = {
                "openai": [],
                "ollama": [],
                "huggingface": ["gpt2", "facebook/bart-large-cnn"],
            }

            if self.openai_service:
                models["openai"] = list(self.openai_service.models.keys())

            if self.ollama_service:
                models["ollama"] = self.ollama_service.list_models()

            return jsonify({"success": True, "models": models})

        @self.app.route("/health", methods=["GET"])
        def health():
            """Health check endpoint"""
            return jsonify(
                {
                    "status": "healthy",
                    "services": {
                        "openai": self.openai_service is not None,
                        "ollama": self.ollama_service is not None,
                        "huggingface": self.huggingface_service is not None,
                    },
                }
            )

    def run(self, host: str = "0.0.0.0", port: int = 5000):
        """Run the API server"""
        self.logger.info(f"Starting AI Content Generation API on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)


def create_app(
    openai_key: str = None,
    ollama_url: str = None,
    mock: bool = False,
    load_hf: bool = False,
):
    """Flask app factory (handy for tests / gunicorn)."""
    api = AIContentGenerationAPI(
        openai_key=openai_key,
        ollama_url=ollama_url,
        mock=mock,
        load_hf=load_hf,
    )
    return api.app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    AIContentGenerationAPI(mock=not os.getenv("OPENAI_API_KEY")).run()
