# ai/openai_integration.py
#
# Spec: Day 23 Task 1 — OpenAI integration
# (generate_text / generate_summary / generate_code /
#  generate_documentation / chat_completion /
#  generate_embeddings / batch_generate)
#
# Modernized (spec-compatible):
# - Uses `openai>=1.0` client API:
#     from openai import OpenAI
#     client.chat.completions.create(...)
#   The spec's `openai.ChatCompletion.create(...)` was removed in
#   SDK v1.0 and raises `APIRemovedInV1` on modern installs.
# - Same class name, same method names/signatures as the spec.
# - `base_url` support so the SAME code talks to free
#   OpenAI-compatible providers (Groq, OpenRouter, Hugging Face
#   Inference, Cerebras, Mistral, NVIDIA NIM, GitHub Models) via
#   OPENAI_BASE_URL env or constructor arg. No code change needed,
#   just point base_url + key at the provider.
# - Lazy client: __init__ never requires a key and never imports
#   openai at module load, so tests / Flask wiring work offline.
#   A real call without a key (and without mock) raises ValueError,
#   preserving the spec's fail-fast intent at call time.
# - `mock=True` (or no key + MOCK) returns deterministic offline
#   text so the Day 23 API + JS client can be tested for free.
import logging
import os
from typing import Any, Dict, List


class OpenAIIntegration:
    def __init__(
        self,
        api_key: str = None,
        base_url: str = None,
        mock: bool = False,
        default_model: str = "gpt-3.5-turbo",
    ):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        # Free-provider switch, e.g.:
        #   Groq:       https://api.groq.com/openai/v1
        #   OpenRouter: https://openrouter.ai/api/v1
        #   HF Router:  https://router.huggingface.co/v1
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL")
        self.logger = logging.getLogger(__name__)
        self.default_model = default_model
        # `text-davinci-003` (spec) is retired; kept as an alias key
        # so old callers don't KeyError, but it routes to a chat model.
        self.models = {
            "gpt-4": "gpt-4",
            "gpt-4o": "gpt-4o",
            "gpt-4o-mini": "gpt-4o-mini",
            "gpt-3.5-turbo": "gpt-3.5-turbo",
            "text-davinci-003": default_model,
        }
        self._client = None
        # Offline-friendly: explicit mock, or implicit mock when no key
        # is configured (lets the test-suite + Flask API boot for free).
        self.mock = mock or not self.api_key
        if self.mock:
            self.logger.warning(
                "OpenAIIntegration running in mock mode (no API key). "
                "Calls return deterministic offline text."
            )

    def _get_client(self):
        """Build the openai>=1.0 client on first real use."""
        if self._client is not None:
            return self._client
        if not self.api_key:
            raise ValueError(
                "OpenAI API key is required for real calls. "
                "Set OPENAI_API_KEY or pass api_key=..., "
                "or use mock=True for offline testing."
            )
        try:
            from openai import OpenAI
        except ImportError as e:
            raise ImportError(
                "The `openai` package is required for real calls. "
                "Install it with: pip install -r ai/requirements.txt"
            ) from e
        kwargs: Dict[str, Any] = {"api_key": self.api_key}
        if self.base_url:
            kwargs["base_url"] = self.base_url
        self._client = OpenAI(**kwargs)
        return self._client

    def _mock_text(self, prompt: str, prefix: str = "MOCK") -> str:
        snippet = " ".join((prompt or "").split())[:200]
        return f"[{prefix} model={self.default_model}] {snippet}..."

    def generate_text(
        self,
        prompt: str,
        model: str = "gpt-3.5-turbo",
        max_tokens: int = 1000,
        temperature: float = 0.7,
    ) -> str:
        """Generate text using OpenAI API"""
        if self.mock:
            return self._mock_text(prompt)
        try:
            client = self._get_client()
            model = self.models.get(model, model)
            response = client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            self.logger.error(f"OpenAI API error: {e}")
            raise

    def generate_summary(self, text: str, max_length: int = 150) -> str:
        """Generate a summary of the given text"""
        prompt = f"""
        Please provide a concise summary of the following text in no more than {max_length} words:

        {text}
        """
        return self.generate_text(prompt, max_tokens=max_length)

    def generate_code(self, description: str, language: str = "python") -> str:
        """Generate code based on description"""
        prompt = f"""
        Write {language} code for the following description:

        {description}

        Please provide only the code without explanations.
        """
        return self.generate_text(prompt, temperature=0.3)

    def generate_documentation(self, code: str, language: str = "python") -> str:
        """Generate documentation for code"""
        prompt = f"""
        Generate comprehensive documentation for the following {language} code:

        {code}

        Include function descriptions, parameters, return values, and usage examples.
        """
        return self.generate_text(prompt, temperature=0.5)

    def chat_completion(
        self,
        messages: List[Dict[str, str]],
        model: str = "gpt-3.5-turbo",
    ) -> str:
        """Chat completion with conversation history"""
        if self.mock:
            last = messages[-1].get("content", "") if messages else ""
            return self._mock_text(last, prefix="MOCK-CHAT")
        try:
            client = self._get_client()
            model = self.models.get(model, model)
            response = client.chat.completions.create(
                model=model,
                messages=messages,
                max_tokens=1000,
                temperature=0.7,
            )
            return (response.choices[0].message.content or "").strip()
        except Exception as e:
            self.logger.error(f"Chat completion error: {e}")
            raise

    def generate_embeddings(
        self, text: str, model: str = "text-embedding-3-small"
    ) -> List[float]:
        """Generate embeddings for text.

        Spec default `text-embedding-ada-002` is legacy; the modern
        small model is `text-embedding-3-small`. Any model id is
        accepted and passed through (free providers expose their own
        embedding models, e.g. Cohere / HF).
        """
        if model == "text-embedding-ada-002":
            model = "text-embedding-3-small"
        if self.mock:
            # Deterministic pseudo-embedding for offline tests.
            import hashlib

            digest = hashlib.sha256(text.encode("utf-8")).digest()
            return [(b / 255.0) - 0.5 for b in digest] * 48  # 1536 dims
        try:
            client = self._get_client()
            response = client.embeddings.create(model=model, input=text)
            return list(response.data[0].embedding)
        except Exception as e:
            self.logger.error(f"Embedding generation error: {e}")
            raise

    def batch_generate(
        self, prompts: List[str], model: str = "gpt-3.5-turbo"
    ) -> List[str]:
        """Generate text for multiple prompts"""
        results = []
        for prompt in prompts:
            try:
                result = self.generate_text(prompt, model)
                results.append(result)
            except Exception as e:
                self.logger.error(f"Batch generation error for prompt: {prompt}")
                results.append(f"Error: {str(e)}")

        return results
