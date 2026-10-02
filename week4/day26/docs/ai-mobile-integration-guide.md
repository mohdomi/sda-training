# AI Mobile Integration Guide

## Mobile AI Patterns
- **Voice AI**: Speech recognition and synthesis
- **Image AI**: Computer vision and image processing
- **Text AI**: Natural language processing
- **Recommendations**: AI-powered mobile recommendations
- **Automation**: AI-driven mobile workflows

## Best Practices
- **Performance**: Optimizing AI for mobile
- **Battery**: Managing AI power consumption
- **Offline**: Offline AI capabilities
- **Security**: Secure mobile AI integration
- **UX**: Mobile-first AI design

---

## Implementation Notes (this repo)

- `ai/mobile-components/ReactNativeAIChatbot.tsx` (Task 1, spec verbatim).
- `ai/mobile-components/flutter_ai_chatbot.dart` (Task 2, spec verbatim).
- `ai/mobile-components/MobileAIContentGenerator.tsx` (Task 3, spec verbatim).
- `ai/mobile-components/MobileAIRecommendations.tsx` (Task 4, spec verbatim).
- `ai/mobile_ai_service.py` (`MobileAIService` — `POST /chat`,
  `POST /generate`, `POST /recommendations`,
  `POST /recommendations/feedback`, `GET /profile`, `GET /health`;
  spec verbatim).
- `ai/openai_integration.py` copied from day25 (day23 origin,
  openai>=1.0 client API + `OPENAI_BASE_URL` free-provider switch).
- Install: `pip install -r ai/requirements.txt`. Run:
  `python -m ai.mobile_ai_service` from `week4/day26` (needs
  `OPENAI_API_KEY` for live chat/generate; recommendations, feedback,
  profile, and health work without it).

## Known Spec Notes (kept verbatim per request)

- Fetch/HttpClient calls carry no timeout; a dead backend hangs.
- `MobileAIRecommendations.tsx` references
  `require('./assets/placeholder.png')`, which is not shipped in the
  spec — add the asset or drop `defaultSource` when wiring into
  `week3/day19`.
- `/profile` returns a static stub; chat/generate return 500
  `OpenAI service not available` until a key is configured.

## Free Alternatives (same tasks, no paid key)

| Task | Paid/spec default | Free drop-in |
|------|-------------------|--------------|
| Chat / content generation | OpenAI `gpt-4/3.5` (paid) | Groq (`llama-3.3-70b-versatile`), Gemini free tier, OpenRouter `:free` models, HF Inference Router — via `OPENAI_BASE_URL` + `OPENAI_API_KEY` |
| Local LLM | Cloud-only (spec) | Ollama `llama3.2:1b`, `phi3:mini`, `tinyllama` via `day23/ai/ollama_integration.py` |
| Recommendations model | Placeholder only (spec) | `sentence-transformers/all-MiniLM-L6-v2` cosine ranking |
