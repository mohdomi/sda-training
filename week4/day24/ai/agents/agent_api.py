# ai/agents/agent_api.py
#
# Spec: Day 24 Task 3 — AI agent service API
# Routes (unchanged from spec):
#   POST /chat, GET /memory, POST /memory/clear,
#   GET /tools, POST /tools/add, GET /health
#
# Modernized (spec-compatible, same picks as the agents):
# - Same class name (AIAgentAPI), same routes, same request/response
#   shapes; `agent_type` in {"langchain", "conversation"}.
# - Lazy wiring: agents boot in mock mode when no key is set, so the
#   API always boots offline for free (Groq/Gemini/OpenRouter/HF work
#   via OPENAI_API_KEY + OPENAI_BASE_URL, no code change).
# - SECURITY: spec's `eval(tool_function)` in /tools/add is replaced
#   with a SAFE REGISTRY (`TOOL_REGISTRY`, kind in {calculator, echo,
#   wordcount} + CustomTool passthrough). No arbitrary code execution.
# - Flask import is local so `import ai.agents.agent_api` never fails
#   where flask isn't installed; plus a create_app() factory and a
#   mock-mode `__main__` boot (day23 convention).
import logging
import os
# Safe tool kinds accepted by POST /tools/add.
# Spec passed raw `function` source into eval() (RCE); only these
# allowlisted kinds are served — no code strings are ever executed.
TOOL_REGISTRY = ("calculator", "echo", "wordcount")


class AIAgentAPI:
    def __init__(
        self,
        openai_api_key: str = None,
        mock: bool = None,
        model: str = None,
        base_url: str = None,
    ):
        # Flask import is local so `import ai.agents.agent_api`
        # never fails on machines without flask installed.
        from flask import Flask

        self.app = Flask(__name__)
        self.logger = logging.getLogger(__name__)

        # Initialize agents (mock when no key — API always boots).
        from .conversation_agent import ConversationAgent
        from .langchain_agent import LangChainAgent

        key = openai_api_key or os.getenv("OPENAI_API_KEY")
        use_mock = mock if mock is not None else (not key)
        # `model`/`base_url` let callers point at free OpenAI-compatible
        # providers (Groq / OpenRouter / HF Router); default None keeps
        # the agents' own defaults (env OPENAI_BASE_URL still honored).
        kwargs = {}
        if model:
            kwargs["model"] = model
        if base_url or os.getenv("OPENAI_BASE_URL"):
            kwargs["base_url"] = base_url or os.getenv("OPENAI_BASE_URL")
        self.langchain_agent = LangChainAgent(
            openai_api_key=key, mock=use_mock, **kwargs
        )
        self.conversation_agent = ConversationAgent(
            openai_api_key=key, mock=use_mock, **kwargs
        )

        self.setup_routes()

    # -- helpers ---------------------------------------------------------
    def _pick(self, agent_type: str):
        if agent_type == "langchain":
            return self.langchain_agent
        if agent_type == "conversation":
            return self.conversation_agent
        return None

    def _serializable_memory(self, agent_type: str, agent):
        if agent_type == "langchain":
            return agent.get_memory()
        return agent.get_conversation_history()

    def setup_routes(self):
        """Setup API routes"""
        from flask import jsonify, request

        @self.app.route("/chat", methods=["POST"])
        def chat():
            try:
                data = request.get_json(force=True, silent=True) or {}
                message = data.get("message")
                agent_type = data.get("agent_type", "langchain")

                if not message:
                    return jsonify({"error": "Message is required"}), 400

                # Choose agent based on type
                agent = self._pick(agent_type)
                if agent is None:
                    return jsonify({"error": "Invalid agent type"}), 400
                response = agent.chat(message)

                return jsonify({
                    "success": True,
                    "response": response,
                    "agent_type": agent_type,
                })

            except Exception as e:
                self.logger.error(f"Chat error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/memory", methods=["GET"])
        def get_memory():
            try:
                agent_type = request.args.get("agent_type", "langchain")
                agent = self._pick(agent_type)
                if agent is None:
                    return jsonify({"error": "Invalid agent type"}), 400
                memory = self._serializable_memory(agent_type, agent)

                return jsonify({
                    "success": True,
                    "memory": memory,
                    "agent_type": agent_type,
                })

            except Exception as e:
                self.logger.error(f"Memory retrieval error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/memory/clear", methods=["POST"])
        def clear_memory():
            try:
                data = request.get_json(force=True, silent=True) or {}
                agent_type = data.get("agent_type", "langchain")
                agent = self._pick(agent_type)
                if agent is None:
                    return jsonify({"error": "Invalid agent type"}), 400
                agent.clear_memory()

                return jsonify({
                    "success": True,
                    "message": "Memory cleared successfully",
                    "agent_type": agent_type,
                })

            except Exception as e:
                self.logger.error(f"Memory clear error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/tools", methods=["GET"])
        def list_tools():
            try:
                agent_type = request.args.get("agent_type", "langchain")
                agent = self._pick(agent_type)
                if agent is None:
                    return jsonify({"error": "Invalid agent type"}), 400
                tools = [tool.name for tool in agent.tools]

                return jsonify({
                    "success": True,
                    "tools": tools,
                    "agent_type": agent_type,
                })

            except Exception as e:
                self.logger.error(f"Tools listing error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/tools/add", methods=["POST"])
        def add_tool():
            """Add a tool from the SAFE registry (no eval).

            Body: {name, description, kind, agent_type?} where kind is
            one of TOOL_REGISTRY. Spec's raw `function` source string
            is intentionally NOT executed (RCE); pass kind="echo" etc.
            """
            try:
                data = request.get_json(force=True, silent=True) or {}
                tool_name = data.get("name")
                tool_description = data.get("description", "")
                kind = (data.get("kind") or data.get("function") or "").strip()
                agent_type = data.get("agent_type", "langchain")

                if not tool_name:
                    return jsonify({"error": "Tool name is required"}), 400
                if kind not in TOOL_REGISTRY:
                    return jsonify({
                        "error": (
                            "Tool kind must be one of "
                            f"{list(TOOL_REGISTRY)} (got {kind!r}). "
                            "Raw function source is not executed."
                        )
                    }), 400

                agent = self._pick(agent_type)
                if agent is None:
                    return jsonify({"error": "Invalid agent type"}), 400

                if kind == "calculator":
                    func = agent._calculator_tool.__get__(agent)
                elif kind == "echo":
                    func = lambda q: f"Echo: {q}"  # noqa: E731
                else:  # wordcount
                    func = (lambda q: f"Word count: {len(str(q).split())}")  # noqa: E731
                new_tool = agent._make_tool(tool_name, tool_description, func)
                agent.add_tool(new_tool)

                return jsonify({
                    "success": True,
                    "message": "Tool added successfully",
                    "tool_name": tool_name,
                    "agent_type": agent_type,
                })

            except Exception as e:
                self.logger.error(f"Tool addition error: {e}")
                return jsonify({"error": str(e)}), 500

        @self.app.route("/health", methods=["GET"])
        def health():
            """Health check endpoint"""
            return jsonify({
                "status": "healthy",
                "agents": {
                    "langchain": True,
                    "conversation": True,
                },
            })

    def run(self, host: str = "0.0.0.0", port: int = 5000):
        """Run the API server"""
        self.logger.info(f"Starting AI Agent API on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)


def create_app(
    openai_api_key: str = None,
    mock: bool = None,
    model: str = None,
    base_url: str = None,
):
    """Flask app factory (handy for tests / gunicorn)."""
    return AIAgentAPI(
        openai_api_key=openai_api_key, mock=mock, model=model, base_url=base_url
    ).app


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    AIAgentAPI(mock=not os.getenv("OPENAI_API_KEY")).run()
