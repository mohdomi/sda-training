# AI Agents Guide

## Agent Architecture
- **Components**: Memory, tools, reasoning, and decision-making
- **Memory Systems**: Short-term and long-term memory
- **Tool Integration**: External tool and API integration
- **Reasoning**: Logical reasoning and decision-making
- **Multi-turn Conversations**: Context-aware interactions

## Best Practices
- **Agent Design**: Effective agent architecture
- **Memory Management**: Efficient memory usage
- **Tool Selection**: Choosing appropriate tools
- **Error Handling**: Robust agent error handling
- **Performance**: Optimizing agent performance

---

## Implementation Notes (this repo)

- `ai/agents/langchain_agent.py` (`LangChainAgent` — `chat()` /
  `get_memory()` / `clear_memory()` / `add_tool()` / `remove_tool()`;
  tools `calculator`, `web_search`, `file_operations`,
  `database_query` + `CustomTool`). Modern API: `ChatOpenAI` from
  `langchain-openai` + `create_react_agent` + `AgentExecutor` (lazy
  imports). Same class/method/tool names as the spec. Boots in mock
  mode with no key; `OPENAI_BASE_URL` points the same code at free
  OpenAI-compatible providers. `web_search` tries DuckDuckGo (no key)
  with an offline fallback string.
- `ai/agents/conversation_agent.py` (`ConversationAgent` extends
  `LangChainAgent` — tools `context_manager`, `emotion_analyzer`,
  `topic_tracker`, `reminder_setter`; `chat()` /
  `get_conversation_summary()` / `get_conversation_history()` /
  `clear_memory()` / `set_context()` / `get_context()`). Window memory
  (`max_memory_length=10`); summary is an offline extractive fallback
  unless a real LLM is configured; emotion/topic tools use keyword
  heuristics (no model download).
- Serving: `ai/agents/agent_api.py` (`AIAgentAPI` — `POST /chat`,
  `GET /memory`, `POST /memory/clear`, `GET /tools`,
  `POST /tools/add`, `GET /health`; `create_app()` factory; mock boot
  under `__main__`). Both accept optional `model=` / `base_url=` so one
  call can target a free model (e.g.
  `model="inclusionai/ling-3.0-flash-sante:free"`,
  `base_url="https://openrouter.ai/api/v1"`) with no code change.
- Clients: `ai/web-agent-integration.js` (`WebAIAgentIntegration`) and
  `ai/mobile-agent-integration.ts` (`MobileAIAgentIntegration` with
  AsyncStorage offline cache) — same methods/routes as the spec.
- Install: `pip install -r ai/requirements.txt`. Run free/offline:
  `python -m ai.agents.agent_api` (mock mode when no key).

## Runtime Fixes (verified with an offline smoke test)

Found by running the spec-style code with no keys, no langchain
installed, and no daemons; all fixed without changing class names,
method names, tool names, or routes:

- **Removed LangChain APIs**: spec's `from langchain.llms import OpenAI`
  and `initialize_agent(..., AgentType.CONVERSATIONAL_REACT_DESCRIPTION)`
  raise `ImportError` on `langchain>=0.2` — now `ChatOpenAI` +
  `create_react_agent` + `AgentExecutor`, imported lazily so mock mode
  works with zero langchain installed. Verified live on langchain
  1.4.3, where the classic stack lives in `langchain_classic.agents`
  (pulled in via `langchain-community`); the standard ReAct prompt
  template (with `{tools}` / `{tool_names}`) is required.
- **Leaky provider errors**: OpenRouter 429 payloads embed long JSON
  with account ids — chat/API errors are truncated to 300 chars.
- **Fail-fast at init**: spec raised `ValueError` in `__init__` when no
  key was set, so even the Flask wiring crashed offline — now lazy
  (client built on first real call), mock auto-engages without a key.
- **RCE via eval (×2)**: spec's `_calculator_tool` ran `eval(query)`
  and `/tools/add` ran `eval(tool_function)` — replaced with an
  `ast`-based safe evaluator (`safe_calculate()`: numbers, `+-*/ // %
  **`, whitelisted `math` fns) and a safe `/tools/add` registry
  (`kind` in `calculator | echo | wordcount`; raw source strings are
  never executed). Clients send both `kind` and legacy `function`
  fields; the server reads `kind` first.
- **Summary cost**: spec's `ConversationSummaryMemory` spends an LLM
  call per turn — summary is now computed only on explicit
  `get_conversation_summary()`, offline by default.
- **Unbounded memory**: `ConversationBufferMemory` grows forever —
  `ConversationAgent` keeps a `2 * max_memory_length` window.
- **Tool churn loses memory**: spec re-initialized the whole agent on
  `add/remove_tool` — now only re-initialized in real (non-mock) mode.

## Free Alternatives (same tasks, no paid key)

| Task | Paid/spec default | Free drop-in |
|------|-------------------|--------------|
| Chat / reasoning | OpenAI `gpt-4/3.5` (paid) | Groq (`llama-3.3-70b`, `openai/gpt-oss-120b`), Gemini free tier, OpenRouter free models, HF Inference Router — all OpenAI-compatible via `OPENAI_BASE_URL` |
| Local LLM | `llama2:7b` (~4GB) | `llama3.2:1b`, `phi3:mini`, `tinyllama`, `qwen2.5:0.5b` via `ollama pull` |
| Web search tool | SerpAPI (paid key) | DuckDuckGo instant-answer (no key; built in, offline fallback string) |
| Memory/summarizer LLM | Per-turn summary calls (paid) | Window buffer + offline extractive summary (built in) |
| Embeddings (future) | `text-embedding-ada-002` (paid) | `sentence-transformers/all-MiniLM-L6-v2`, HF serverless |
