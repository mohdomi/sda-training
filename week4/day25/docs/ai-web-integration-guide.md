# AI Web Integration Guide

## Web AI Patterns
- **Chatbots**: Conversational AI interfaces
- **Content Generation**: AI-powered content creation
- **Personalization**: AI-driven user experiences
- **Recommendations**: AI-powered content suggestions
- **Automation**: AI-driven workflow automation

## Best Practices
- **Performance**: Optimizing AI web performance
- **Security**: Secure AI web integration
- **UX**: User-friendly AI interfaces
- **Scalability**: Scalable AI web architecture
- **Monitoring**: AI web performance tracking

---

## Implementation Notes (this repo)

- `ai/web-components/ai-chatbot.js` (`AIChatbot` — `init()` /
  `createChatbotUI()` / `createHeader()` / `createMessagesContainer()` /
  `createInputArea()` / `createToggleButton()` / `bindEvents()` /
  `toggle()` / `sendMessage()` / `callAIAPI()` / `addMessage()` /
  `showTypingIndicator()` / `hideTypingIndicator()` /
  `loadConversationHistory()` / `saveConversationHistory()` /
  `clearHistory()`). Same class/method names and default
  `apiUrl: '/api/ai/chat'` as the spec. Position/theme options preserved.
- `ai/web-components/ai-content-generator.js` (`AIContentGenerator` —
  `init()` / `createUI()` / `bindEvents()` / `generateContent()` /
  `showLoading()` / `hideLoading()` / `showResult()` / `copyContent()`).
  Same class/methods and default `apiUrl: '/api/ai/generate'`.
- `ai/web-components/ai-recommendations.js` (`AIRecommendations` —
  `init()` / `createUI()` / `bindEvents()` / `loadUserProfile()` /
  `loadRecommendations()` / `displayRecommendations()` / `showError()` /
  `submitFeedback()` / `toggleBookmark()`). Same class/methods and
  default `apiUrl: '/api/ai/recommendations'`.
- Serving: `ai/web_ai_service.py` (`AIWebService` — `POST /chat`,
  `POST /generate`, `POST /recommendations`,
  `POST /recommendations/feedback`, `GET /health`;
  `create_app()` factory; mock boot under `__main__`). Also serves the
  `/api/ai/*` aliases the JS defaults call, plus
  `GET /api/ai/recommendations/profile` for the widget.
  `ai/openai_integration.py` is copied from day23 (openai>=1.0 client
  API + `OPENAI_BASE_URL` free-provider switch + offline mock).
- Demo: `index.html` (Task 5 — chatbot + content generator +
  recommendations + analytics cards, spec layout/styles preserved;
  script paths fixed to `ai/web-components/*.js`).
- Install: `pip install -r ai/requirements.txt`. Run free/offline:
  `python -m ai.web_ai_service` from `week4/day25` (mock mode when no
  key), then open `index.html` (or serve this folder so `/api/ai/*`
  resolves). Real model: `OPENAI_API_KEY=... OPENAI_BASE_URL=...
  AI_MODEL=... python -m ai.web_ai_service`.

## Runtime Fixes (verified with an offline smoke test)

Found by running the spec-style code with no keys and no daemons; all
fixed without changing class names, method names, or routes:

- **Frontend/backend route mismatch**: the Task 1-3 JS defaults call
  `/api/ai/chat`, `/api/ai/generate`, `/api/ai/recommendations`, but
  the spec Task 4 backend only served bare `/chat`, `/generate`,
  `/recommendations` — every widget 404'd out of the box. The service
  now serves both prefixes with the same handlers, plus the
  `/profile` GET the recommendations widget fetches on init.
- **Chat hangs forever on dead backend**: spec `callAIAPI()` had no
  timeout, so the typing indicator spun indefinitely — now
  `AbortController` timeouts (chat 60s, generate 120s, recs 30s,
  configurable via `timeoutMs`).
- **XSS via chat/content/recs**: titles, messages, and generated text
  are untrusted model/user text — rendering now uses `textContent`
  (element builder in recommendations) instead of string-interpolated
  `innerHTML`; `View` URLs are allowlisted to `http(s)` or `/`.
- **Broken bookmark handler**: spec template used inline
  `onclick="this.toggleBookmark(i)"` where `this` is the button, not
  the instance (throws). Now delegated `data-bookmark-index` listener
  + real `localStorage` bookmark persistence.
- **Duplicate-id collisions**: spec used global `getElementById` inside
  the generator/recs, so a second widget (or the Task 5 demo page
  itself) grabbed the wrong fields. Now scoped `this.container`
  queries; the demo guards double-mount with `dataset.mounted`.
- **Typing-style leak**: spec appended a new `<style>` per message —
  now injected once (guarded by element id).
- **Fail-fast backend**: spec `__init__` required a live OpenAI key,
  so even `GET /health` crashed offline — now lazy client + auto-mock.
- **No CORS / strict JSON parsing**: added a dependency-free
  `after_request` CORS header and `get_json(force=True, silent=True)`
  so `file://` demos and empty bodies fail gracefully.

## Free Alternatives (same tasks, no paid key)

| Task | Paid/spec default | Free drop-in |
|------|-------------------|--------------|
| Chat / content generation | OpenAI `gpt-4/3.5` (paid) | Groq (`llama-3.3-70b-versatile`, `openai/gpt-oss-120b`), Gemini free tier, OpenRouter `:free` models, HF Inference Router — all OpenAI-compatible via `OPENAI_BASE_URL` + `OPENAI_API_KEY`, selected with `AI_MODEL` |
| Offline / no key at all | — (spec crashes) | Mock mode (built in, auto-engages with no key; deterministic `[MOCK …]` text so UI + tests run free) |
| Local LLM | `gpt-3.5-turbo` cloud | Ollama `llama3.2:1b`, `phi3:mini`, `tinyllama`, `qwen2.5:0.5b` via `day23/ai/ollama_integration.py` |
| Recommendations model | Placeholder only (spec) | Rule-based category/score (built in); swap `_generate_recommendations()` for `sentence-transformers/all-MiniLM-L6-v2` cosine ranking when ready |
| Embeddings (future) | `text-embedding-ada-002` (paid/legacy) | `text-embedding-3-small` passthrough, or local MiniLM |
