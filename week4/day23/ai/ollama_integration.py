# ai/ollama_integration.py
#
# Spec: Day 23 Task 3 — local LLM deployment with Ollama
# (load_available_models / pull_model / generate_text /
#  chat_completion / get_model_info / list_models / delete_model)
#
# Modernized (spec-compatible):
# - Same class name, same method names/signatures as the spec.
# - Daemon-safe: __init__ never raises when Ollama isn't running;
#   model list is just empty + a warning (spec code would crash).
# - Timeouts on every request so a dead daemon fails fast.
# - Default model updated from spec's `llama2` (legacy 7B) to
#   `llama3.2:1b` (small, fast, free, CPU-friendly). Any model id is
#   still accepted, including `llama2` — pass model="llama2" to keep
#   the exact spec behaviour. Other light free options:
#   `phi3:mini`, `tinyllama`, `qwen2.5:0.5b`.
import logging
from typing import Any, Dict, List, Optional

import requests

DEFAULT_MODEL = "llama3.2:1b"
LEGACY_SPEC_MODEL = "llama2"


class OllamaIntegration:
    def __init__(
        self,
        base_url: str = "http://localhost:11434",
        timeout: int = 30,
    ):
        self.base_url = (base_url or "http://localhost:11434").rstrip("/")
        self.timeout = timeout
        self.logger = logging.getLogger(__name__)
        self.available_models: List[str] = []
        self.load_available_models()

    def load_available_models(self):
        """Load list of available models (never raises)."""
        try:
            response = requests.get(
                f"{self.base_url}/api/tags", timeout=5
            )
            if response.status_code == 200:
                data = response.json()
                self.available_models = [
                    model["name"] for model in data.get("models", [])
                ]
                self.logger.info(f"Loaded {len(self.available_models)} models")
            else:
                self.logger.error(f"Failed to load models: {response.status_code}")
        except Exception as e:
            # Ollama daemon not running — normal on dev machines.
            self.logger.warning(
                f"Ollama not reachable at {self.base_url} ({e}). "
                "Start it with `ollama serve`. Calls will raise until then."
            )
            self.available_models = []

    def pull_model(self, model_name: str) -> bool:
        """Pull a model from Ollama registry"""
        try:
            self.logger.info(f"Pulling model: {model_name}")
            response = requests.post(
                f"{self.base_url}/api/pull",
                json={"name": model_name},
                stream=True,
                timeout=self.timeout,
            )

            if response.status_code == 200:
                # Consume the streaming progress body so the connection
                # is released even for large pulls.
                for _ in response.iter_lines():
                    pass
                self.load_available_models()
                self.logger.info(f"Model {model_name} pulled successfully")
                return True
            else:
                self.logger.error(f"Failed to pull model: {response.status_code}")
                return False
        except Exception as e:
            self.logger.error(f"Error pulling model: {e}")
            return False

    def _ensure_model(self, model: str):
        if model not in self.available_models:
            self.logger.warning(
                f"Model {model} not found locally, attempting to pull..."
            )
            if not self.pull_model(model):
                raise ValueError(
                    f"Model {model} not available. "
                    f"Run `ollama pull {model}` while `ollama serve` is up."
                )

    def generate_text(
        self,
        prompt: str,
        model: str = DEFAULT_MODEL,
        options: Dict[str, Any] = None,
    ) -> str:
        """Generate text using Ollama"""
        self._ensure_model(model)

        try:
            payload = {"model": model, "prompt": prompt, "stream": False}

            if options:
                payload["options"] = options

            response = requests.post(
                f"{self.base_url}/api/generate",
                json=payload,
                timeout=self.timeout,
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("response", "")
            else:
                raise Exception(f"API error: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Text generation error: {e}")
            raise

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = DEFAULT_MODEL,
    ) -> str:
        """Chat completion with conversation history"""
        try:
            self._ensure_model(model)
            payload = {"model": model, "messages": messages, "stream": False}

            response = requests.post(
                f"{self.base_url}/api/chat",
                json=payload,
                timeout=self.timeout,
            )

            if response.status_code == 200:
                result = response.json()
                return result.get("message", {}).get("content", "")
            else:
                raise Exception(f"API error: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Chat completion error: {e}")
            raise

    def get_model_info(self, model: str) -> Dict[str, Any]:
        """Get information about a specific model"""
        try:
            response = requests.post(
                f"{self.base_url}/api/show",
                json={"name": model},
                timeout=self.timeout,
            )

            if response.status_code == 200:
                return response.json()
            else:
                raise Exception(f"API error: {response.status_code}")

        except Exception as e:
            self.logger.error(f"Error getting model info: {e}")
            raise

    def list_models(self) -> List[str]:
        """List all available models"""
        return self.available_models.copy()

    def delete_model(self, model: str) -> bool:
        """Delete a model"""
        try:
            response = requests.delete(
                f"{self.base_url}/api/delete",
                json={"name": model},
                timeout=self.timeout,
            )

            if response.status_code == 200:
                self.logger.info(f"Model {model} deleted successfully")
                self.load_available_models()
                return True
            else:
                self.logger.error(f"Failed to delete model: {response.status_code}")
                return False

        except Exception as e:
            self.logger.error(f"Error deleting model: {e}")
            return False
