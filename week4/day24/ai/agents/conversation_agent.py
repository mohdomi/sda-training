# ai/agents/conversation_agent.py
#
# Spec: Day 24 Task 2 — multi-turn conversation agent
# (ConversationAgent with tools: context_manager / emotion_analyzer /
#  topic_tracker / reminder_setter; chat() / get_conversation_summary() /
#  get_conversation_history() / clear_memory() / set_context() /
#  get_context()).
#
# Modernized (spec-compatible, same picks as langchain_agent.py):
# - Modern `ChatOpenAI` + lazy langchain imports; mock mode boots with
#   no key / no langchain installed. Window memory (default k=10) is
#   kept in a plain list; summary is computed lazily and only on
#   explicit get_conversation_summary() (spec summarized via an LLM
#   call — here: offline extractive fallback, or LLM when configured).
# - Same class name, same method names/signatures, same tool names.
"""Day 24 Task 2: multi-turn conversation agent."""

import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

from .langchain_agent import LangChainAgent


class ConversationAgent(LangChainAgent):
    def __init__(
        self,
        openai_api_key: str = None,
        base_url: str = None,
        mock: bool = False,
        model: str = "gpt-3.5-turbo",
        temperature: float = 0.7,
        max_memory_length: int = 10,
    ):
        self.max_memory_length = max_memory_length
        self.conversation_context: Dict[str, Any] = {}
        super().__init__(
            openai_api_key=openai_api_key,
            base_url=base_url,
            mock=mock,
            model=model,
            temperature=temperature,
        )
        # Replace Task-1 tools with the conversation-specific set.
        self.tools = self._initialize_tools()
        if not self.mock and self.llm is not None:
            try:
                self.agent = self._initialize_agent()
            except Exception as e:
                self.logger.warning(
                    "Falling back to mock mode (real agent unavailable: %s)", e
                )
                self.mock = True

    def _initialize_tools(self) -> List[Any]:
        """Initialize conversation-specific tools"""
        makers = [
            ("context_manager",
             "Manage conversation context and memory",
             self._context_manager_tool),
            ("emotion_analyzer",
             "Analyze emotional tone of the conversation",
             self._emotion_analyzer_tool),
            ("topic_tracker",
             "Track and manage conversation topics",
             self._topic_tracker_tool),
            ("reminder_setter",
             "Set reminders and follow-up tasks",
             self._reminder_setter_tool),
        ]
        return [self._make_tool(n, d, f) for n, d, f in makers]

    def _initialize_agent(self):
        """Initialize the conversation agent (modern API, window memory)."""
        # Same modern builder as LangChainAgent; window limiting is
        # applied in chat()/get_conversation_history().
        return super()._initialize_agent()

    def _context_manager_tool(self, query: str) -> str:
        """Manage conversation context"""
        try:
            # Parse context management commands
            if "clear" in query.lower():
                self.clear_memory()
                return "Conversation context cleared"
            elif "summary" in query.lower():
                return self.get_conversation_summary()
            elif "context" in query.lower():
                return json.dumps(self.conversation_context, indent=2)
            else:
                return "Context management command processed"
        except Exception as e:
            return f"Context management error: {str(e)}"

    def _emotion_analyzer_tool(self, query: str) -> str:
        """Analyze emotional tone (keyword heuristic, offline-safe)."""
        try:
            text = query.lower()
            lexicon = {
                "happy": ["happy", "great", "awesome", "love", "excited", "glad"],
                "sad": ["sad", "sorry", "unhappy", "depressed", "cry"],
                "angry": ["angry", "furious", "annoyed", "hate", "mad"],
                "worried": ["worried", "anxious", "afraid", "nervous", "concern"],
                "excited": ["excited", "thrilled", "amazing", "wow"],
            }
            for emotion, words in lexicon.items():
                if any(w in text for w in words):
                    return f"Emotional analysis: {emotion}"
            return "Emotional analysis: neutral"
        except Exception as e:
            return f"Emotion analysis error: {str(e)}"

    def _topic_tracker_tool(self, query: str) -> str:
        """Track conversation topics (keyword scan of window)."""
        try:
            topics = ["work", "personal", "technology", "health", "travel"]
            seen = {t for m in self._chat_history for t in topics
                    if t in m.get("content", "").lower()}
            current = sorted(seen) if seen else topics
            return f"Current topics: {', '.join(current)}"
        except Exception as e:
            return f"Topic tracking error: {str(e)}"

    def _reminder_setter_tool(self, query: str) -> str:
        """Set reminders and follow-up tasks"""
        try:
            # Parse reminder information
            if "remind" in query.lower():
                reminders = self.conversation_context.setdefault("reminders", [])
                reminders.append(query)
                return "Reminder set successfully"
            elif "follow" in query.lower():
                followups = self.conversation_context.setdefault("followups", [])
                followups.append(query)
                return "Follow-up task created"
            else:
                return "Reminder/task management completed"
        except Exception as e:
            return f"Reminder setting error: {str(e)}"

    def chat(self, message: str) -> str:
        """Chat with the conversation agent"""
        try:
            # Update conversation context
            self._update_context(message)

            # Get response from agent
            response = super().chat(message)

            # Update context with response
            self._update_context(response, is_response=True)

            # Enforce the window on stored history.
            self._chat_history = self._chat_history[-2 * self.max_memory_length:]
            return response
        except Exception as e:
            self.logger.error(f"Conversation agent error: {e}")
            return f"Sorry, I encountered an error: {str(e)}"

    def _update_context(self, message: str, is_response: bool = False):
        """Update conversation context"""
        if is_response:
            self.conversation_context["last_response"] = message
        else:
            self.conversation_context["last_input"] = message
            self.conversation_context["message_count"] = (
                self.conversation_context.get("message_count", 0) + 1
            )

    def get_conversation_summary(self) -> str:
        """Get a summary of the conversation.

        Offline extractive fallback (no LLM call, no download); when a
        real LLM is configured, summarization goes through it.
        """
        try:
            if not self._chat_history:
                return "No conversation history available"
            if not self.mock and self.llm is not None:
                convo = "\n".join(
                    f"{m['role']}: {m['content']}" for m in self._chat_history
                )
                return self.llm.invoke(
                    f"Summarize this conversation concisely:\n{convo}"
                ).content
            words: List[str] = []
            for m in self._chat_history:
                words.extend(m.get("content", "").split())
            return " ".join(words[:150]) + ("..." if len(words) > 150 else "")
        except Exception as e:
            return f"Error getting conversation summary: {str(e)}"

    def get_conversation_history(self) -> List[Dict[str, Any]]:
        """Get full conversation history (window-limited)."""
        try:
            window = self._chat_history[-2 * self.max_memory_length:]
            history = []
            for message in window:
                history.append({
                    "type": "HumanMessage"
                    if message.get("role") == "user" else "AIMessage",
                    "content": message.get("content", ""),
                    "timestamp": message.get("timestamp"),
                })
            return history
        except Exception as e:
            self.logger.error(f"Error getting conversation history: {e}")
            return []

    def clear_memory(self):
        """Clear conversation memory"""
        self._chat_history = []
        self.conversation_context = {}

    def set_context(self, key: str, value: Any):
        """Set a specific context value"""
        self.conversation_context[key] = value

    def get_context(self, key: str) -> Any:
        """Get a specific context value"""
        return self.conversation_context.get(key)
