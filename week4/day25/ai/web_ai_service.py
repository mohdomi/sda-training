# ai/web_ai_service.py
#
# Spec: Day 25 Task 4 — AI web service
# Routes (unchanged from spec):
#   POST /chat, POST /generate, POST /recommendations,
#   POST /recommendations/feedback, GET /health
#
# Modernized (spec-compatible, per user picks: "Mock + Groq-ready"):
# - Same class name (AIWebService), same route paths, same
#   request/response shapes as the spec.
# - Lazy wiring: boots in mock mode when no key is set, so the API
#   always boots offline for free. Set OPENAI_API_KEY (+ optional
#   OPENAI_BASE_URL / model) for real calls — e.g. Groq:
#   OPENAI_BASE_URL=https://api.groq.com/openai/v1
# - Uses the local `ai/openai_integration.py` (copied from day23,
#   openai>=1.0 client API). Falls back to the day23 copy on
#   sys.path so both layouts work; never crashes at import time.
# - Serves BOTH `/chat` (spec) and `/api/ai/chat` (the prefix the
#   Task 1-3 JS components default to), same for /generate and
#   /recommendations — otherwise the frontend 404s out of the box.
# - Flask import is local + create_app() factory + mock-mode
#   `__main__` boot (day23/day24 convention).
import logging
import os
import sys
from typing import Any, Dict, List


def _load_openai_integration():
    """Import OpenAIIntegration from day25/ai first, else day23/ai.

    Never raises at import time — real import errors surface only when
    a non-mock call is attempted (same lazy philosophy as day23/24).
    """
    try:
        from .openai_integration import OpenAIIntegration  # type: ignore

        return OpenAIIntegration
    except Exception:
        pass
    try:
        from openai_integration import OpenAIIntegration  # type: ignore

        return OpenAIIntegration
    except Exception:
        pass
    # Fallback: day23 copy, so day25 works even if its own copy is removed.
    here = os.path.dirname(os.path.abspath(__file__))
    day23_ai = os.path.normpath(os.path.join(here, "..", "..", "day23", "ai"))
    if os.path.isdir(day23_ai) and day23_ai not in sys.path:
        sys.path.insert(0, day23_ai)
    try:
        from openai_integration import OpenAIIntegration  # type: ignore

        return OpenAIIntegration
    except Exception as e:
        raise ImportError(
            "OpenAIIntegration not found. Expected "
            "week4/day25/ai/openai_integration.py (copied from day23)."
        ) from e


class AIWebService:
    def __init__(
        self,
        openai_api_key: str = None,
        base_url: str = None,
        model: str = None,
        mock: bool = None,
    ):
        # Flask import is local so `import ai.web_ai_service`
        # never fails on machines without flask installed.
        from flask import Flask

        self.app = Flask(__name__)
        self.logger = logging.getLogger(__name__)

        key = openai_api_key or os.getenv("OPENAI_API_KEY")
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL")
        self.model = model or os.getenv("AI_MODEL", "gpt-3.5-turbo")
        # Offline-friendly: explicit mock, or implicit mock when no key
        # is configured (lets the API + demo + tests boot for free).
        self.mock = mock if mock is not None else (not key)

        # Initialize AI service (lazy client inside OpenAIIntegration,
        # so this never raises for missing keys — mock serves offline).
        OpenAIIntegration = _load_openai_integration()
        self.openai_service = OpenAIIntegration(
            api_key=key,
            base_url=self.base_url,
            mock=self.mock,
            default_model=self.model,
        )
        if self.mock:
            self.logger.warning(
                "AIWebService running in mock mode (no API key). "
                "Chat/generate return deterministic offline text."
            )

        # Minimal CORS so the Task 5 demo works from file:// or :3000
        # without adding flask-cors to requirements.
        @self.app.after_request
        def _cors(response):  # noqa: ANN001, ANN202
            response.headers["Access-Control-Allow-Origin"] = "*"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type"
            response.headers["Access-Control-Allow-Methods"] = (
                "GET, POST, OPTIONS"
            )
            return response

        self.setup_routes()

    def setup_routes(self):
        """Setup API routes"""
        from flask import jsonify, request

        def _chat_impl():
            try:
                data = request.get_json(force=True, silent=True) or {}
                message = data.get("message")
                conversation_history = data.get("conversation_history", [])

                if not message:
                    return jsonify({"error": "Message is required"}), 400

                # Build conversation context
                messages = []
                for msg in conversation_history:
                    messages.append(
                        {
                            "role": msg.get("role", "user"),
                            "content": msg.get("content", ""),
                        }
                    )

                messages.append({"role": "user", "content": message})

                response = self.openai_service.chat_completion(messages)

                return jsonify(
                    {
                        "success": True,
                        "response": response,
                        "conversation_history": conversation_history
                        + [
                            {"role": "user", "content": message},
                            {"role": "assistant", "content": response},
                        ],
                    }
                )

            except Exception as e:
                self.logger.error(f"Chat error: {e}")
                return jsonify({"error": str(e)}), 500

        def _generate_impl():
            try:
                data = request.get_json(force=True, silent=True) or {}
                content_type = data.get("content_type", "article")
                topic = data.get("topic")
                tone = data.get("tone", "professional")
                length = data.get("length", "medium")
                keywords = data.get("keywords", [])

                if not topic:
                    return jsonify({"error": "Topic is required"}), 400

                # Build prompt based on content type
                prompt = self._build_content_prompt(
                    content_type, topic, tone, length, keywords
                )

                content = self.openai_service.generate_text(prompt)

                return jsonify(
                    {
                        "success": True,
                        "content": content,
                        "metadata": {
                            "content_type": content_type,
                            "topic": topic,
                            "tone": tone,
                            "length": length,
                            "keywords": keywords,
                        },
                    }
                )

            except Exception as e:
                self.logger.error(f"Content generation error: {e}")
                return jsonify({"error": str(e)}), 500

        def _recommendations_impl():
            try:
                data = request.get_json(force=True, silent=True) or {}
                user_profile = data.get("user_profile", {})
                max_recommendations = data.get("max_recommendations", 5)

                # Generate recommendations based on user profile
                recommendations = self._generate_recommendations(
                    user_profile, max_recommendations
                )

                return jsonify(
                    {"success": True, "recommendations": recommendations}
                )

            except Exception as e:
                self.logger.error(f"Recommendations error: {e}")
                return jsonify({"error": str(e)}), 500

        def _feedback_impl():
            try:
                data = request.get_json(force=True, silent=True) or {}
                rating = data.get("rating")
                recommendations = data.get("recommendations", [])
                user_profile = data.get("user_profile", {})

                # Process feedback for recommendation improvement
                self._process_feedback(rating, recommendations, user_profile)

                return jsonify(
                    {"success": True, "message": "Feedback received"}
                )

            except Exception as e:
                self.logger.error(f"Feedback error: {e}")
                return jsonify({"error": str(e)}), 500

        def _health_impl():
            """Health check endpoint"""
            return jsonify(
                {
                    "status": "healthy",
                    "mock": self.mock,
                    "services": {
                        "openai": self.openai_service is not None
                        and not self.mock,
                    },
                }
            )

        # Spec routes (bare) + /api/ai/* aliases used by the
        # Task 1-3 JS component defaults. Same handler, both prefixes.
        self.app.add_url_rule("/chat", view_func=_chat_impl, methods=["POST"])
        self.app.add_url_rule(
            "/api/ai/chat", view_func=_chat_impl, methods=["POST"]
        )
        self.app.add_url_rule(
            "/generate", view_func=_generate_impl, methods=["POST"]
        )
        self.app.add_url_rule(
            "/api/ai/generate", view_func=_generate_impl, methods=["POST"]
        )
        self.app.add_url_rule(
            "/recommendations", view_func=_recommendations_impl,
            methods=["POST"],
        )
        self.app.add_url_rule(
            "/api/ai/recommendations", view_func=_recommendations_impl,
            methods=["POST"],
        )
        self.app.add_url_rule(
            "/recommendations/feedback", view_func=_feedback_impl,
            methods=["POST"],
        )
        self.app.add_url_rule(
            "/api/ai/recommendations/feedback", view_func=_feedback_impl,
            methods=["POST"],
        )
        # Day24-style profile route the recommendations widget expects.
        self.app.add_url_rule(
            "/api/ai/recommendations/profile",
            view_func=lambda: (  # noqa: E731
                __import__("flask").jsonify(
                    {"success": True, "profile": {}}
                )
            ),
            methods=["GET"],
        )
        self.app.add_url_rule("/health", view_func=_health_impl, methods=["GET"])
        self.app.add_url_rule(
            "/api/ai/health", view_func=_health_impl, methods=["GET"]
        )

    def _build_content_prompt(
        self,
        content_type: str,
        topic: str,
        tone: str,
        length: str,
        keywords: List[str],
    ) -> str:
        """Build content generation prompt"""
        length_map = {
            "short": "100-200 words",
            "medium": "200-500 words",
            "long": "500+ words",
        }

        prompt = f"""
        Write a {content_type} about {topic} in a {tone} tone.
        Length: {length_map.get(length, '200-500 words')}
        """

        if keywords:
            prompt += f"\nInclude these keywords: {', '.join(keywords)}"

        prompt += (
            "\n\nPlease provide only the content without any "
            "explanations or meta information."
        )

        return prompt

    def _generate_recommendations(
        self, user_profile: Dict[str, Any], max_recommendations: int
    ) -> List[Dict[str, Any]]:
        """Generate AI-powered recommendations"""
        # This is a placeholder implementation
        # In a real application, you would use ML models to generate recommendations
        try:
            count = int(max_recommendations)
        except (TypeError, ValueError):
            count = 5
        count = max(0, min(count, 20))

        interests = []
        if isinstance(user_profile, dict):
            interests = user_profile.get("interests") or []
        category = interests[0] if interests else "Technology"

        recommendations = []
        for i in range(count):
            recommendations.append(
                {
                    "title": f"Recommended Item {i + 1}",
                    "description": (
                        "This is a recommended item based on your profile"
                    ),
                    "category": category,
                    "score": round(0.8 + (i * 0.05), 2),
                    "url": f"/item/{i + 1}",
                    "image": f"/images/item_{i + 1}.jpg",
                }
            )

        return recommendations

    def _process_feedback(
        self,
        rating: int,
        recommendations: List[Dict[str, Any]],
        user_profile: Dict[str, Any],
    ):
        """Process user feedback for recommendation improvement"""
        # In a real application, you would update the recommendation model
        # based on user feedback
        try:
            n = len(recommendations) if recommendations else 0
        except TypeError:
            n = 0
        self.logger.info(
            f"Feedback received: rating={rating}, recommendations={n}"
        )

    def run(self, host: str = "0.0.0.0", port: int = 5000):
        """Run the AI web service"""
        self.logger.info(f"Starting AI Web Service on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)


def create_app(
    openai_api_key: str = None,
    base_url: str = None,
    model: str = None,
    mock: bool = None,
):
    """Flask app factory (handy for tests / gunicorn)."""
    return AIWebService(
        openai_api_key=openai_api_key,
        base_url=base_url,
        model=model,
        mock=mock,
    ).app


if __name__ == "__main__":
    import os as _os

    logging.basicConfig(level=logging.INFO)
    AIWebService(mock=not _os.getenv("OPENAI_API_KEY")).run()
