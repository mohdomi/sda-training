# ai/huggingface_integration.py
#
# Spec: Day 23 Task 2 — Hugging Face transformers integration
# (load_text_generation_model / load_summarization_model /
#  load_question_answering_model / generate_text /
#  summarize_text / answer_question / get_model_info)
#
# Modernized (spec-compatible):
# - Same class name, same method names/signatures as the spec.
# - Lazy imports: `transformers` / `torch` are imported INSIDE the
#   load_* methods, so `import ai.huggingface_integration` works on a
#   machine without GPU deps. ImportError carries a clear pip hint.
# - Same spec default model ids (gpt2, facebook/bart-large-cnn,
#   distilbert-base-cased-distilled-squad) so old callers behave the
#   same; docstrings point at lighter free alternatives for CPU boxes
#   (sshleifer/distilbart-cnn-12-6, TinyLlama, flan-t5-small) and at
#   the serverless Inference API (no local torch at all).
import logging
from typing import Any, Dict


class HuggingFaceIntegration:
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.device = self._detect_device()
        self.models = {}
        self.tokenizers = {}

    def _detect_device(self) -> str:
        try:
            import torch

            return "cuda" if torch.cuda.is_available() else "cpu"
        except ImportError:
            # torch not installed yet (optional until a model loads).
            return "cpu"

    def _pipeline_device(self) -> int:
        if self.device == "cuda":
            try:
                import torch

                return 0 if torch.cuda.is_available() else -1
            except ImportError:
                return -1
        return -1

    def _require_transformers(self):
        try:
            from transformers import pipeline  # noqa: F401

            return pipeline
        except ImportError as e:
            raise ImportError(
                "Hugging Face `transformers` (and `torch`) are required to "
                "load local models. Install with: "
                "pip install -r ai/requirements.txt "
                "(plus a torch wheel from https://pytorch.org/get-started/ "
                "for your CPU/CUDA). Free alternative with no local install: "
                "use the Hugging Face Inference API "
                "(https://router.huggingface.co/v1) via OpenAIIntegration "
                "with OPENAI_BASE_URL."
            ) from e

    def load_text_generation_model(self, model_name: str = "gpt2"):
        """Load a text generation model"""
        pipeline = self._require_transformers()
        try:
            self.logger.info(f"Loading text generation model: {model_name}")
            self.models["text_generation"] = pipeline(
                "text-generation",
                model=model_name,
                device=self._pipeline_device(),
            )
            self.logger.info("Text generation model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load text generation model: {e}")
            raise

    def load_summarization_model(
        self, model_name: str = "facebook/bart-large-cnn"
    ):
        """Load a summarization model.

        Lighter CPU-friendly alternative:
        `sshleifer/distilbart-cnn-12-6` (~300MB vs ~1.6GB).
        """
        pipeline = self._require_transformers()
        try:
            self.logger.info(f"Loading summarization model: {model_name}")
            self.models["summarization"] = pipeline(
                "summarization",
                model=model_name,
                device=self._pipeline_device(),
            )
            self.logger.info("Summarization model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load summarization model: {e}")
            raise

    def load_question_answering_model(
        self, model_name: str = "distilbert-base-cased-distilled-squad"
    ):
        """Load a question answering model"""
        pipeline = self._require_transformers()
        try:
            self.logger.info(f"Loading QA model: {model_name}")
            self.models["question_answering"] = pipeline(
                "question-answering",
                model=model_name,
                device=self._pipeline_device(),
            )
            self.logger.info("QA model loaded successfully")
        except Exception as e:
            self.logger.error(f"Failed to load QA model: {e}")
            raise

    def generate_text(
        self, prompt: str, max_length: int = 100, temperature: float = 0.7
    ) -> str:
        """Generate text using the loaded model"""
        if "text_generation" not in self.models:
            self.load_text_generation_model()

        try:
            result = self.models["text_generation"](
                prompt,
                max_length=max_length,
                temperature=temperature,
                do_sample=True,
                pad_token_id=50256,
            )
            return result[0]["generated_text"]
        except Exception as e:
            self.logger.error(f"Text generation error: {e}")
            raise

    def summarize_text(
        self, text: str, max_length: int = 150, min_length: int = 50
    ) -> str:
        """Summarize text using the loaded model"""
        if "summarization" not in self.models:
            self.load_summarization_model()

        try:
            result = self.models["summarization"](
                text, max_length=max_length, min_length=min_length, do_sample=False
            )
            return result[0]["summary_text"]
        except Exception as e:
            self.logger.error(f"Summarization error: {e}")
            raise

    def answer_question(self, question: str, context: str) -> Dict[str, Any]:
        """Answer a question based on context"""
        if "question_answering" not in self.models:
            self.load_question_answering_model()

        try:
            result = self.models["question_answering"](
                question=question, context=context
            )
            return result
        except Exception as e:
            self.logger.error(f"Question answering error: {e}")
            raise

    def get_model_info(self) -> Dict[str, Any]:
        """Get information about loaded models"""
        try:
            import torch

            cuda_available = torch.cuda.is_available()
        except ImportError:
            cuda_available = False
        info = {
            "device": self.device,
            "loaded_models": list(self.models.keys()),
            "cuda_available": cuda_available,
        }
        return info
