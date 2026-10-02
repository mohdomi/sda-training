# ai/agents/langchain_agent.py
#
# Spec: Day 24 Task 1 — LangChain agent
# (LangChainAgent with tools: calculator / web_search /
#  file_operations / database_query + CustomTool; chat() /
#  get_memory() / clear_memory() / add_tool() / remove_tool()).
#
# Modernized (spec-compatible, per user picks: "Modern LangChain only",
# "Mock + Groq-ready", "Fix both with safe registry"):
# - Targets MODERN LangChain (>=0.3): `ChatOpenAI` from
#   `langchain-openai` + `create_react_agent` + `AgentExecutor`
#   instead of the removed `langchain.llms.OpenAI` /
#   `initialize_agent(..., AgentType.CONVERSATIONAL_REACT_DESCRIPTION)`,
#   which raise ImportError on fresh installs.
# - All langchain imports are LAZY (inside builders) so the module
#   imports with zero keys / zero langchain installed; mock mode
#   serves deterministic offline replies (tools still execute for real).
# - Groq/Gemini/OpenRouter/HF free tiers work via OPENAI_BASE_URL
#   (+ OPENAI_API_KEY), e.g. Groq: https://api.groq.com/openai/v1.
# - SECURITY: spec's `eval(query)` calculator replaced with an
#   `ast`-based safe evaluator (numbers + whitelisted math fns only).
# - Same class name, same method names/signatures, same tool names.
"""Day 24 Task 1: LangChain agent (modern API + offline mock)."""

import ast
import logging
import math
import os
from typing import Any, Dict, List, Optional


# ---------------------------------------------------------------------------
# Safe calculator (replaces spec's eval(query))
# ---------------------------------------------------------------------------
_ALLOWED_FUNCS = {
    name: getattr(math, name)
    for name in (
        "sqrt", "sin", "cos", "tan", "log", "log10", "exp",
        "floor", "ceil", "fabs", "pow", "factorial",
    )
}
_ALLOWED_FUNCS.update({"abs": abs, "round": round, "min": min, "max": max})
_ALLOWED_CONSTS = {"pi": math.pi, "e": math.e, "tau": math.tau}


def safe_calculate(expression: str) -> Any:
    """Evaluate a math expression safely (no eval/exec/imports)."""
    tree = ast.parse(expression, mode="eval")

    def _eval(node):
        if isinstance(node, ast.Expression):
            return _eval(node.body)
        if isinstance(node, ast.Constant):
            if isinstance(node.value, (int, float)):
                return node.value
            raise ValueError(f"constants of type {type(node.value).__name__} not allowed")
        if isinstance(node, ast.BinOp):
            left, right = _eval(node.left), _eval(node.right)
            if isinstance(node.op, ast.Add):
                return left + right
            if isinstance(node.op, ast.Sub):
                return left - right
            if isinstance(node.op, ast.Mult):
                return left * right
            if isinstance(node.op, ast.Div):
                return left / right
            if isinstance(node.op, ast.FloorDiv):
                return left // right
            if isinstance(node.op, ast.Mod):
                return left % right
            if isinstance(node.op, ast.Pow):
                return left**right
            raise ValueError(f"operator {type(node.op).__name__} not allowed")
        if isinstance(node, ast.UnaryOp) and isinstance(
            node.op, (ast.UAdd, ast.USub)
        ):
            value = _eval(node.operand)
            return value if isinstance(node.op, ast.UAdd) else -value
        if isinstance(node, ast.Call):
            if not isinstance(node.func, ast.Name):
                raise ValueError("only plain function calls allowed")
            func = _ALLOWED_FUNCS.get(node.func.id)
            if func is None:
                raise ValueError(f"function '{node.func.id}' not allowed")
            if node.keywords:
                raise ValueError("keyword arguments not allowed")
            return func(*[_eval(a) for a in node.args])
        if isinstance(node, ast.Name):
            if node.id in _ALLOWED_CONSTS:
                return _ALLOWED_CONSTS[node.id]
            raise ValueError(f"name '{node.id}' not allowed")
        if isinstance(node, (ast.List, ast.Tuple)):
            return [_eval(e) for e in node.elts]
        raise ValueError(f"syntax {type(node).__name__} not allowed")

    return _eval(tree)


class CustomTool:
    """A custom tool for specific tasks (spec-compatible).

    When `langchain-core` is installed this exposes a real tool via
    :meth:`as_langchain_tool`; otherwise it works standalone so mock
    mode never needs the dependency.
    """

    name = "custom_tool"
    description = "A custom tool for specific tasks"

    def _run(self, query: str) -> str:
        """Execute the tool"""
        return f"Custom tool result for: {query}"

    async def _arun(self, query: str) -> str:
        """Async version of the tool"""
        return self._run(query)

    def as_langchain_tool(self):
        """Wrap as a real langchain tool (lazy import)."""
        try:
            from langchain_core.tools import Tool
        except ImportError:
            from langchain.agents import Tool  # type: ignore[no-redef]

        return Tool(name=self.name, description=self.description, func=self._run)


class LangChainAgent:
    def __init__(
        self,
        openai_api_key: str = None,
        base_url: str = None,
        mock: bool = False,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
    ):
        self.api_key = openai_api_key or os.getenv("OPENAI_API_KEY")
        # Free-provider switch, e.g.:
        #   Groq:       https://api.groq.com/openai/v1
        #   OpenRouter: https://openrouter.ai/api/v1
        #   HF Router:  https://router.huggingface.co/v1
        self.base_url = base_url or os.getenv("OPENAI_BASE_URL")
        self.model = model
        self.temperature = temperature
        self.logger = logging.getLogger(__name__)
        # Offline-friendly: explicit mock, or implicit mock when no key
        # is configured (lets the API + tests boot for free).
        self.mock = mock or not self.api_key
        if self.mock:
            self.logger.warning(
                "LangChainAgent running in mock mode (no API key). "
                "chat() returns deterministic offline text; "
                "local tools still execute for real."
            )
        self.tools = self._initialize_tools()
        self._chat_history: List[Dict[str, str]] = []
        self.llm = None
        self.agent = None
        if not self.mock:
            try:
                self.llm = self._build_llm()
                self.agent = self._initialize_agent()
            except Exception as e:  # e.g. langchain not installed
                self.logger.warning(
                    "Falling back to mock mode (real agent unavailable: %s)", e
                )
                self.mock = True

    # -- tools -----------------------------------------------------------
    def _initialize_tools(self) -> List[Any]:
        """Initialize available tools"""
        makers = [
            ("calculator", "Useful for mathematical calculations",
             self._calculator_tool),
            ("web_search", "Search the web for current information",
             self._web_search_tool),
            ("file_operations", "Read, write, and manage files",
             self._file_operations_tool),
            ("database_query", "Query database for information",
             self._database_query_tool),
        ]
        tools = [self._make_tool(name, desc, func) for name, desc, func in makers]
        tools.append(CustomTool())
        return tools

    @staticmethod
    def _make_tool(name: str, description: str, func):
        """Build a langchain Tool when available, else a light shim
        exposing the same `.name` / `.func` / `.description` attrs the
        API routes rely on."""
        for path in ("langchain_core.tools", "langchain.agents"):
            try:
                mod = __import__(path, fromlist=["Tool"])
                return mod.Tool(name=name, description=description, func=func)
            except ImportError:
                continue

        class _ShimTool:
            def __init__(self, name, description, func):
                self.name = name
                self.description = description
                self.func = func

            def run(self, query: str) -> str:
                return self.func(query)

        return _ShimTool(name, description, func)

    def _initialize_agent(self):
        """Initialize the agent (modern create_react_agent API).

        Import paths moved across LangChain releases:
        - langchain 1.x -> `langchain_classic.agents`
        - langchain 0.2/0.3 -> `langchain.agents`
        Both are tried so real mode works on either line.
        """
        AgentExecutor = create_react_agent = None
        last_error = None
        for path in ("langchain_classic.agents", "langchain.agents"):
            try:
                mod = __import__(path, fromlist=["AgentExecutor", "create_react_agent"])
                AgentExecutor = mod.AgentExecutor
                create_react_agent = mod.create_react_agent
                break
            except ImportError as e:
                last_error = e
        if AgentExecutor is None or create_react_agent is None:
            raise ImportError(
                "Modern LangChain packages are required for real calls. "
                "Install them with: pip install -r ai/requirements.txt"
            ) from last_error
        try:
            from langchain_core.prompts import PromptTemplate
        except ImportError as e:
            raise ImportError(
                "The `langchain-core` package is required for real calls. "
                "Install it with: pip install -r ai/requirements.txt"
            ) from e

        lc_tools = [
            t.as_langchain_tool() if isinstance(t, CustomTool) else t
            for t in self.tools
        ]
        prompt = PromptTemplate.from_template(
            "You are a helpful assistant with access to the following tools:\n\n"
            "{tools}\n\n"
            "Use the following format:\n\n"
            "Question: the input question you must answer\n"
            "Thought: you should always think about what to do\n"
            "Action: the action to take, should be one of [{tool_names}]\n"
            "Action Input: the input to the action\n"
            "Observation: the result of the action\n"
            "... (this Thought/Action/Action Input/Observation can repeat N times)\n"
            "Thought: I now know the final answer\n"
            "Final Answer: the final answer to the original input question\n\n"
            "Conversation so far:\n{chat_history}\n\n"
            "Question: {input}\n{agent_scratchpad}"
        )
        react_agent = create_react_agent(self.llm, lc_tools, prompt)
        return AgentExecutor(
            agent=react_agent,
            tools=lc_tools,
            verbose=True,
            handle_parsing_errors=True,
        )

    def _build_llm(self):
        """Build ChatOpenAI (OpenAI-compatible: free providers via base_url)."""
        try:
            from langchain_openai import ChatOpenAI
        except ImportError as e:
            raise ImportError(
                "The `langchain-openai` package is required for real calls. "
                "Install it with: pip install -r ai/requirements.txt"
            ) from e
        if not self.api_key:
            raise ValueError(
                "API key is required for real calls. Set OPENAI_API_KEY "
                "or pass openai_api_key=..., or use mock=True for offline testing."
            )
        kwargs: Dict[str, Any] = {
            "model": self.model,
            "temperature": self.temperature,
            "api_key": self.api_key,
        }
        if self.base_url:
            kwargs["base_url"] = self.base_url
        return ChatOpenAI(**kwargs)

    def _calculator_tool(self, query: str) -> str:
        """Calculator tool for mathematical operations (AST-safe, no eval)."""
        try:
            result = safe_calculate(query.strip())
            return f"Calculation result: {result}"
        except Exception as e:
            return f"Error in calculation: {str(e)}"

    def _web_search_tool(self, query: str) -> str:
        """Web search tool (offline-safe: DuckDuckGo, no key needed)."""
        try:
            import requests

            resp = requests.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
                timeout=10,
            )
            if resp.status_code == 200:
                data = resp.json()
                abstract = data.get("AbstractText") or ""
                if abstract:
                    return f"Web search results for '{query}': {abstract}"
        except Exception as e:
            self.logger.debug("Live web search unavailable: %s", e)
        # In a real implementation, you would integrate with a search API
        return f"Web search results for: {query}"

    def _file_operations_tool(self, query: str) -> str:
        """File operations tool"""
        try:
            # Parse the query to determine the operation
            if "read" in query.lower():
                # Implement file reading logic
                return "File read successfully"
            elif "write" in query.lower():
                # Implement file writing logic
                return "File written successfully"
            else:
                return "File operation completed"
        except Exception as e:
            return f"File operation error: {str(e)}"

    def _database_query_tool(self, query: str) -> str:
        """Database query tool"""
        try:
            # Implement database query logic
            return f"Database query result for: {query}"
        except Exception as e:
            return f"Database query error: {str(e)}"

    # -- chat / memory ---------------------------------------------------
    def _mock_reply(self, message: str) -> str:
        """Deterministic offline reply; routes obvious tool requests
        to the real local tool so /chat is testable for free."""
        text = message.strip()
        lowered = text.lower()
        # Route "calculate ..." / pure math to the real safe calculator.
        expr = text
        for prefix in ("calculate", "calc", "compute", "what is", "what's"):
            if lowered.startswith(prefix):
                expr = text[len(prefix):].strip(" :?")
                break
        if expr and all(
            ch.isdigit() or ch in " +-*/().,%"
            or ch.isalpha() or ch == "_"
            for ch in expr
        ):
            try:
                safe_calculate(expr)
                for tool in self.tools:
                    if getattr(tool, "name", "") == "calculator":
                        func = getattr(tool, "func", None) or tool.run
                        return func(expr)
            except Exception:
                pass
        return f"[MOCK model={self.model}] You said: {text}"

    def chat(self, message: str) -> str:
        """Chat with the agent"""
        try:
            if self.mock or self.agent is None:
                response = self._mock_reply(message)
            else:
                history = "\n".join(
                    f"{m['role']}: {m['content']}" for m in self._chat_history
                )
                response = self.agent.invoke(
                    {"input": message, "chat_history": history}
                ).get("output", "")
            self._chat_history.append({"role": "user", "content": message})
            self._chat_history.append({"role": "assistant", "content": response})
            return response
        except Exception as e:
            self.logger.error(f"Agent chat error: {e}")
            # Provider errors (esp. OpenRouter 429 payloads) embed long
            # JSON blobs with account ids — truncate for chat/API output.
            detail = str(e)
            if len(detail) > 300:
                detail = detail[:300].rstrip() + "..."
            return f"Sorry, I encountered an error: {detail}"

    def get_memory(self) -> Dict[str, Any]:
        """Get conversation memory"""
        return {
            "chat_history": list(self._chat_history),
            "memory_variables": {"chat_history": list(self._chat_history)},
        }

    def clear_memory(self):
        """Clear conversation memory"""
        self._chat_history = []

    def add_tool(self, tool):
        """Add a new tool to the agent"""
        self.tools.append(tool)
        if not self.mock and self.llm is not None:
            self.agent = self._initialize_agent()

    def remove_tool(self, tool_name: str):
        """Remove a tool from the agent"""
        self.tools = [tool for tool in self.tools if tool.name != tool_name]
        if not self.mock and self.llm is not None:
            self.agent = self._initialize_agent()
