# Day 25: AI Web Integration

## 🎯 Learning Objectives

- Master AI integration in web applications
- Implement dynamic AI chatbots with context memory
- Create AI-powered web features and components
- Build real-time AI interactions and responses
- Integrate AI services with frontend frameworks

## 📚 Theory & Concepts

### AI Web Integration
- **Frontend AI**: Client-side AI integration
- **Backend AI**: Server-side AI processing
- **Real-time AI**: WebSocket and streaming AI
- **Context Memory**: Maintaining conversation context
- **AI Components**: Reusable AI-powered UI components

### Web AI Patterns
- **Chatbots**: Conversational AI interfaces
- **Content Generation**: AI-powered content creation
- **Personalization**: AI-driven user experiences
- **Recommendations**: AI-powered content suggestions
- **Automation**: AI-driven workflow automation

### Best Practices
- **Performance**: Optimizing AI web performance
- **Security**: Secure AI web integration
- **UX**: User-friendly AI interfaces
- **Scalability**: Scalable AI web architecture
- **Monitoring**: AI web performance tracking

## 🛠️ Hands-on Tasks

### Task 1: Create AI Chatbot Component
Implement dynamic AI chatbot for web applications:

```javascript
// ai/web-components/ai-chatbot.js
class AIChatbot {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/chat',
      theme: options.theme || 'light',
      position: options.position || 'bottom-right',
      ...options
    };
    this.isOpen = false;
    this.conversationHistory = [];
    this.isTyping = false;
    
    this.init();
  }

  init() {
    this.createChatbotUI();
    this.bindEvents();
    this.loadConversationHistory();
  }

  createChatbotUI() {
    // Create chatbot container
    this.chatbotContainer = document.createElement('div');
    this.chatbotContainer.className = `ai-chatbot ${this.options.theme}`;
    this.chatbotContainer.style.cssText = `
      position: fixed;
      ${this.options.position.includes('bottom') ? 'bottom' : 'top'}: 20px;
      ${this.options.position.includes('right') ? 'right' : 'left'}: 20px;
      width: 350px;
      height: 500px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
      z-index: 1000;
      display: none;
      flex-direction: column;
      overflow: hidden;
    `;

    // Create header
    this.createHeader();
    
    // Create messages container
    this.createMessagesContainer();
    
    // Create input area
    this.createInputArea();
    
    // Create toggle button
    this.createToggleButton();
    
    this.container.appendChild(this.chatbotContainer);
  }

  createHeader() {
    const header = document.createElement('div');
    header.className = 'chatbot-header';
    header.style.cssText = `
      padding: 16px;
      background: #3b82f6;
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;

    const title = document.createElement('h3');
    title.textContent = 'AI Assistant';
    title.style.margin = '0';
    title.style.fontSize = '16px';

    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.cssText = `
      background: none;
      border: none;
      color: white;
      font-size: 20px;
      cursor: pointer;
      padding: 0;
      width: 24px;
      height: 24px;
    `;
    closeBtn.onclick = () => this.toggle();

    header.appendChild(title);
    header.appendChild(closeBtn);
    this.chatbotContainer.appendChild(header);
  }

  createMessagesContainer() {
    this.messagesContainer = document.createElement('div');
    this.messagesContainer.className = 'chatbot-messages';
    this.messagesContainer.style.cssText = `
      flex: 1;
      padding: 16px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 12px;
    `;

    // Add welcome message
    this.addMessage('Hello! How can I help you today?', 'bot');
    this.chatbotContainer.appendChild(this.messagesContainer);
  }

  createInputArea() {
    const inputArea = document.createElement('div');
    inputArea.className = 'chatbot-input-area';
    inputArea.style.cssText = `
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    `;

    this.messageInput = document.createElement('input');
    this.messageInput.type = 'text';
    this.messageInput.placeholder = 'Type your message...';
    this.messageInput.style.cssText = `
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      outline: none;
    `;

    this.sendButton = document.createElement('button');
    this.sendButton.textContent = 'Send';
    this.sendButton.style.cssText = `
      padding: 8px 16px;
      background: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
    `;

    inputArea.appendChild(this.messageInput);
    inputArea.appendChild(this.sendButton);
    this.chatbotContainer.appendChild(inputArea);
  }

  createToggleButton() {
    this.toggleButton = document.createElement('button');
    this.toggleButton.innerHTML = '💬';
    this.toggleButton.style.cssText = `
      position: fixed;
      ${this.options.position.includes('bottom') ? 'bottom' : 'top'}: 20px;
      ${this.options.position.includes('right') ? 'right' : 'left'}: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #3b82f6;
      color: white;
      border: none;
      font-size: 24px;
      cursor: pointer;
      z-index: 1001;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    `;
    this.toggleButton.onclick = () => this.toggle();

    this.container.appendChild(this.toggleButton);
  }

  bindEvents() {
    this.sendButton.onclick = () => this.sendMessage();
    this.messageInput.onkeypress = (e) => {
      if (e.key === 'Enter') {
        this.sendMessage();
      }
    };
  }

  toggle() {
    this.isOpen = !this.isOpen;
    this.chatbotContainer.style.display = this.isOpen ? 'flex' : 'none';
    this.toggleButton.style.display = this.isOpen ? 'none' : 'block';
    
    if (this.isOpen) {
      this.messageInput.focus();
    }
  }

  async sendMessage() {
    const message = this.messageInput.value.trim();
    if (!message || this.isTyping) return;

    this.messageInput.value = '';
    this.addMessage(message, 'user');
    this.showTypingIndicator();

    try {
      const response = await this.callAIAPI(message);
      this.hideTypingIndicator();
      this.addMessage(response, 'bot');
    } catch (error) {
      this.hideTypingIndicator();
      this.addMessage('Sorry, I encountered an error. Please try again.', 'bot');
      console.error('AI API error:', error);
    }
  }

  async callAIAPI(message) {
    const response = await fetch(this.options.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        conversation_history: this.conversationHistory
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    return result.response;
  }

  addMessage(content, sender) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    messageDiv.style.cssText = `
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      word-wrap: break-word;
      ${sender === 'user' 
        ? 'background: #3b82f6; color: white; align-self: flex-end;' 
        : 'background: #f3f4f6; color: #374151; align-self: flex-start;'
      }
    `;

    messageDiv.textContent = content;
    this.messagesContainer.appendChild(messageDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;

    // Update conversation history
    this.conversationHistory.push({
      role: sender === 'user' ? 'user' : 'assistant',
      content: content,
      timestamp: new Date().toISOString()
    });

    this.saveConversationHistory();
  }

  showTypingIndicator() {
    this.isTyping = true;
    const typingDiv = document.createElement('div');
    typingDiv.className = 'typing-indicator';
    typingDiv.style.cssText = `
      max-width: 80%;
      padding: 8px 12px;
      border-radius: 12px;
      background: #f3f4f6;
      color: #374151;
      align-self: flex-start;
      display: flex;
      align-items: center;
      gap: 4px;
    `;

    typingDiv.innerHTML = `
      <div class="typing-dots">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;

    // Add CSS for typing animation
    const style = document.createElement('style');
    style.textContent = `
      .typing-dots span {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #9ca3af;
        animation: typing 1.4s infinite ease-in-out;
      }
      .typing-dots span:nth-child(1) { animation-delay: -0.32s; }
      .typing-dots span:nth-child(2) { animation-delay: -0.16s; }
      @keyframes typing {
        0%, 80%, 100% { transform: scale(0); }
        40% { transform: scale(1); }
      }
    `;
    document.head.appendChild(style);

    this.messagesContainer.appendChild(typingDiv);
    this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
  }

  hideTypingIndicator() {
    this.isTyping = false;
    const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
    if (typingIndicator) {
      typingIndicator.remove();
    }
  }

  loadConversationHistory() {
    const history = localStorage.getItem('ai_chatbot_history');
    if (history) {
      this.conversationHistory = JSON.parse(history);
    }
  }

  saveConversationHistory() {
    localStorage.setItem('ai_chatbot_history', JSON.stringify(this.conversationHistory));
  }

  clearHistory() {
    this.conversationHistory = [];
    this.messagesContainer.innerHTML = '';
    this.addMessage('Hello! How can I help you today?', 'bot');
    localStorage.removeItem('ai_chatbot_history');
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const chatbot = new AIChatbot('chatbot-container', {
    apiUrl: '/api/ai/chat',
    theme: 'light',
    position: 'bottom-right'
  });
});
```

### Task 2: Create AI Content Generator
Implement AI-powered content generation for web:

```javascript
// ai/web-components/ai-content-generator.js
class AIContentGenerator {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/generate',
      ...options
    };
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="ai-content-generator">
        <div class="generator-header">
          <h3>AI Content Generator</h3>
          <p>Generate high-quality content using AI</p>
        </div>
        
        <div class="generator-form">
          <div class="form-group">
            <label for="content-type">Content Type</label>
            <select id="content-type" class="form-control">
              <option value="article">Article</option>
              <option value="blog-post">Blog Post</option>
              <option value="social-media">Social Media</option>
              <option value="email">Email</option>
              <option value="product-description">Product Description</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="topic">Topic/Subject</label>
            <input type="text" id="topic" class="form-control" placeholder="Enter your topic...">
          </div>
          
          <div class="form-group">
            <label for="tone">Tone</label>
            <select id="tone" class="form-control">
              <option value="professional">Professional</option>
              <option value="casual">Casual</option>
              <option value="friendly">Friendly</option>
              <option value="formal">Formal</option>
              <option value="creative">Creative</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="length">Length</label>
            <select id="length" class="form-control">
              <option value="short">Short (100-200 words)</option>
              <option value="medium">Medium (200-500 words)</option>
              <option value="long">Long (500+ words)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="keywords">Keywords (optional)</label>
            <input type="text" id="keywords" class="form-control" placeholder="Enter keywords separated by commas...">
          </div>
          
          <button id="generate-btn" class="btn btn-primary">Generate Content</button>
        </div>
        
        <div class="generator-result" id="generator-result" style="display: none;">
          <div class="result-header">
            <h4>Generated Content</h4>
            <div class="result-actions">
              <button id="copy-btn" class="btn btn-secondary">Copy</button>
              <button id="regenerate-btn" class="btn btn-outline">Regenerate</button>
            </div>
          </div>
          <div class="result-content" id="result-content"></div>
        </div>
        
        <div class="generator-loading" id="generator-loading" style="display: none;">
          <div class="loading-spinner"></div>
          <p>Generating content...</p>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const generateBtn = document.getElementById('generate-btn');
    const copyBtn = document.getElementById('copy-btn');
    const regenerateBtn = document.getElementById('regenerate-btn');

    generateBtn.onclick = () => this.generateContent();
    copyBtn.onclick = () => this.copyContent();
    regenerateBtn.onclick = () => this.generateContent();
  }

  async generateContent() {
    const contentType = document.getElementById('content-type').value;
    const topic = document.getElementById('topic').value;
    const tone = document.getElementById('tone').value;
    const length = document.getElementById('length').value;
    const keywords = document.getElementById('keywords').value;

    if (!topic.trim()) {
      alert('Please enter a topic');
      return;
    }

    this.showLoading();

    try {
      const response = await fetch(this.options.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: contentType,
          topic: topic,
          tone: tone,
          length: length,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k)
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.showResult(result.content);
    } catch (error) {
      this.hideLoading();
      alert('Failed to generate content. Please try again.');
      console.error('Content generation error:', error);
    }
  }

  showLoading() {
    document.getElementById('generator-loading').style.display = 'block';
    document.getElementById('generator-result').style.display = 'none';
  }

  hideLoading() {
    document.getElementById('generator-loading').style.display = 'none';
  }

  showResult(content) {
    this.hideLoading();
    document.getElementById('result-content').textContent = content;
    document.getElementById('generator-result').style.display = 'block';
  }

  copyContent() {
    const content = document.getElementById('result-content').textContent;
    navigator.clipboard.writeText(content).then(() => {
      alert('Content copied to clipboard!');
    }).catch(err => {
      console.error('Failed to copy content:', err);
    });
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const contentGenerator = new AIContentGenerator('content-generator-container', {
    apiUrl: '/api/ai/generate'
  });
});
```

### Task 3: Create AI Recommendation Engine
Implement AI-powered recommendations for web:

```javascript
// ai/web-components/ai-recommendations.js
class AIRecommendations {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.options = {
      apiUrl: options.apiUrl || '/api/ai/recommendations',
      maxRecommendations: options.maxRecommendations || 5,
      ...options
    };
    this.userProfile = {};
    this.recommendations = [];
    this.init();
  }

  init() {
    this.createUI();
    this.bindEvents();
    this.loadUserProfile();
  }

  createUI() {
    this.container.innerHTML = `
      <div class="ai-recommendations">
        <div class="recommendations-header">
          <h3>Recommended for You</h3>
          <button id="refresh-recommendations" class="btn btn-outline">Refresh</button>
        </div>
        
        <div class="recommendations-content" id="recommendations-content">
          <div class="loading-placeholder">
            <div class="loading-spinner"></div>
            <p>Loading recommendations...</p>
          </div>
        </div>
        
        <div class="recommendations-feedback" id="recommendations-feedback" style="display: none;">
          <h4>How did we do?</h4>
          <div class="feedback-buttons">
            <button class="feedback-btn" data-rating="1">😞</button>
            <button class="feedback-btn" data-rating="2">😐</button>
            <button class="feedback-btn" data-rating="3">😊</button>
            <button class="feedback-btn" data-rating="4">😍</button>
          </div>
        </div>
      </div>
    `;
  }

  bindEvents() {
    const refreshBtn = document.getElementById('refresh-recommendations');
    refreshBtn.onclick = () => this.loadRecommendations();

    // Bind feedback events
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('feedback-btn')) {
        const rating = parseInt(e.target.dataset.rating);
        this.submitFeedback(rating);
      }
    });
  }

  async loadUserProfile() {
    try {
      const response = await fetch(`${this.options.apiUrl}/profile`);
      if (response.ok) {
        this.userProfile = await response.json();
        this.loadRecommendations();
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  }

  async loadRecommendations() {
    try {
      const response = await fetch(this.options.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: this.userProfile,
          max_recommendations: this.options.maxRecommendations
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      this.recommendations = result.recommendations;
      this.displayRecommendations();
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      this.showError('Failed to load recommendations. Please try again.');
    }
  }

  displayRecommendations() {
    const content = document.getElementById('recommendations-content');
    
    if (this.recommendations.length === 0) {
      content.innerHTML = '<p>No recommendations available at the moment.</p>';
      return;
    }

    const recommendationsHTML = this.recommendations.map((rec, index) => `
      <div class="recommendation-item" data-index="${index}">
        <div class="recommendation-image">
          <img src="${rec.image || '/images/placeholder.jpg'}" alt="${rec.title}">
        </div>
        <div class="recommendation-content">
          <h4>${rec.title}</h4>
          <p>${rec.description}</p>
          <div class="recommendation-meta">
            <span class="recommendation-score">Score: ${rec.score.toFixed(2)}</span>
            <span class="recommendation-category">${rec.category}</span>
          </div>
          <div class="recommendation-actions">
            <button class="btn btn-primary" onclick="window.open('${rec.url}', '_blank')">View</button>
            <button class="btn btn-outline" onclick="this.toggleBookmark(${index})">Bookmark</button>
          </div>
        </div>
      </div>
    `).join('');

    content.innerHTML = recommendationsHTML;
    document.getElementById('recommendations-feedback').style.display = 'block';
  }

  showError(message) {
    const content = document.getElementById('recommendations-content');
    content.innerHTML = `<div class="error-message">${message}</div>`;
  }

  async submitFeedback(rating) {
    try {
      await fetch(`${this.options.apiUrl}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          recommendations: this.recommendations,
          user_profile: this.userProfile
        }),
      });

      // Show feedback confirmation
      const feedbackDiv = document.getElementById('recommendations-feedback');
      feedbackDiv.innerHTML = '<p>Thank you for your feedback!</p>';
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }

  toggleBookmark(index) {
    const recommendation = this.recommendations[index];
    // Implement bookmark functionality
    console.log('Bookmark toggled for:', recommendation.title);
  }
}

// Usage example
document.addEventListener('DOMContentLoaded', () => {
  const recommendations = new AIRecommendations('recommendations-container', {
    apiUrl: '/api/ai/recommendations',
    maxRecommendations: 5
  });
});
```

### Task 4: Create AI Web Service
Implement comprehensive AI web service:

```python
# ai/web_ai_service.py
from flask import Flask, request, jsonify
import logging
from typing import Dict, Any, List
import json

class AIWebService:
    def __init__(self, openai_api_key: str = None):
        self.app = Flask(__name__)
        self.logger = logging.getLogger(__name__)
        
        # Initialize AI services
        self.openai_service = None
        if openai_api_key:
            from .openai_integration import OpenAIIntegration
            self.openai_service = OpenAIIntegration(openai_api_key)
        
        self.setup_routes()
    
    def setup_routes(self):
        """Setup API routes"""
        @self.app.route('/chat', methods=['POST'])
        def chat():
            try:
                data = request.get_json()
                message = data.get('message')
                conversation_history = data.get('conversation_history', [])
                
                if not message:
                    return jsonify({'error': 'Message is required'}), 400
                
                if not self.openai_service:
                    return jsonify({'error': 'OpenAI service not available'}), 500
                
                # Build conversation context
                messages = []
                for msg in conversation_history:
                    messages.append({
                        'role': msg.get('role', 'user'),
                        'content': msg.get('content', '')
                    })
                
                messages.append({'role': 'user', 'content': message})
                
                response = self.openai_service.chat_completion(messages)
                
                return jsonify({
                    'success': True,
                    'response': response,
                    'conversation_history': conversation_history + [
                        {'role': 'user', 'content': message},
                        {'role': 'assistant', 'content': response}
                    ]
                })
                
            except Exception as e:
                self.logger.error(f"Chat error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/generate', methods=['POST'])
        def generate_content():
            try:
                data = request.get_json()
                content_type = data.get('content_type', 'article')
                topic = data.get('topic')
                tone = data.get('tone', 'professional')
                length = data.get('length', 'medium')
                keywords = data.get('keywords', [])
                
                if not topic:
                    return jsonify({'error': 'Topic is required'}), 400
                
                if not self.openai_service:
                    return jsonify({'error': 'OpenAI service not available'}), 500
                
                # Build prompt based on content type
                prompt = self._build_content_prompt(
                    content_type, topic, tone, length, keywords
                )
                
                content = self.openai_service.generate_text(prompt)
                
                return jsonify({
                    'success': True,
                    'content': content,
                    'metadata': {
                        'content_type': content_type,
                        'topic': topic,
                        'tone': tone,
                        'length': length,
                        'keywords': keywords
                    }
                })
                
            except Exception as e:
                self.logger.error(f"Content generation error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/recommendations', methods=['POST'])
        def get_recommendations():
            try:
                data = request.get_json()
                user_profile = data.get('user_profile', {})
                max_recommendations = data.get('max_recommendations', 5)
                
                # Generate recommendations based on user profile
                recommendations = self._generate_recommendations(
                    user_profile, max_recommendations
                )
                
                return jsonify({
                    'success': True,
                    'recommendations': recommendations
                })
                
            except Exception as e:
                self.logger.error(f"Recommendations error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/recommendations/feedback', methods=['POST'])
        def submit_feedback():
            try:
                data = request.get_json()
                rating = data.get('rating')
                recommendations = data.get('recommendations', [])
                user_profile = data.get('user_profile', {})
                
                # Process feedback for recommendation improvement
                self._process_feedback(rating, recommendations, user_profile)
                
                return jsonify({
                    'success': True,
                    'message': 'Feedback received'
                })
                
            except Exception as e:
                self.logger.error(f"Feedback error: {e}")
                return jsonify({'error': str(e)}), 500
        
        @self.app.route('/health', methods=['GET'])
        def health():
            """Health check endpoint"""
            return jsonify({
                'status': 'healthy',
                'services': {
                    'openai': self.openai_service is not None
                }
            })
    
    def _build_content_prompt(self, content_type: str, topic: str, tone: str, 
                            length: str, keywords: List[str]) -> str:
        """Build content generation prompt"""
        length_map = {
            'short': '100-200 words',
            'medium': '200-500 words',
            'long': '500+ words'
        }
        
        prompt = f"""
        Write a {content_type} about {topic} in a {tone} tone.
        Length: {length_map.get(length, '200-500 words')}
        """
        
        if keywords:
            prompt += f"\nInclude these keywords: {', '.join(keywords)}"
        
        prompt += "\n\nPlease provide only the content without any explanations or meta information."
        
        return prompt
    
    def _generate_recommendations(self, user_profile: Dict[str, Any], 
                                max_recommendations: int) -> List[Dict[str, Any]]:
        """Generate AI-powered recommendations"""
        # This is a placeholder implementation
        # In a real application, you would use ML models to generate recommendations
        
        recommendations = []
        for i in range(max_recommendations):
            recommendations.append({
                'title': f'Recommended Item {i+1}',
                'description': f'This is a recommended item based on your profile',
                'category': 'Technology',
                'score': 0.8 + (i * 0.05),
                'url': f'/item/{i+1}',
                'image': f'/images/item_{i+1}.jpg'
            })
        
        return recommendations
    
    def _process_feedback(self, rating: int, recommendations: List[Dict[str, Any]], 
                         user_profile: Dict[str, Any]):
        """Process user feedback for recommendation improvement"""
        # In a real application, you would update the recommendation model
        # based on user feedback
        self.logger.info(f"Feedback received: rating={rating}, recommendations={len(recommendations)}")
    
    def run(self, host: str = '0.0.0.0', port: int = 5000):
        """Run the AI web service"""
        self.logger.info(f"Starting AI Web Service on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)
```

### Task 5: Create AI Web Integration Example
Implement complete AI web integration example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AI Web Integration Demo</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            margin: 0;
            padding: 20px;
            background: #f5f5f5;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
        }
        
        .card {
            background: white;
            border-radius: 8px;
            padding: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-outline {
            background: transparent;
            border: 1px solid #d1d5db;
            color: #374151;
        }
        
        .form-control {
            width: 100%;
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            margin-bottom: 12px;
        }
        
        .form-group {
            margin-bottom: 16px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 4px;
            font-weight: 500;
        }
        
        .loading-spinner {
            width: 20px;
            height: 20px;
            border: 2px solid #f3f3f3;
            border-top: 2px solid #3b82f6;
            border-radius: 50%;
            animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        .recommendation-item {
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            display: flex;
            gap: 16px;
        }
        
        .recommendation-image img {
            width: 80px;
            height: 80px;
            object-fit: cover;
            border-radius: 4px;
        }
        
        .recommendation-content {
            flex: 1;
        }
        
        .recommendation-meta {
            display: flex;
            gap: 16px;
            margin: 8px 0;
            font-size: 12px;
            color: #6b7280;
        }
        
        .recommendation-actions {
            display: flex;
            gap: 8px;
            margin-top: 12px;
        }
        
        .feedback-buttons {
            display: flex;
            gap: 8px;
        }
        
        .feedback-btn {
            padding: 8px 12px;
            border: 1px solid #d1d5db;
            border-radius: 4px;
            background: white;
            cursor: pointer;
            font-size: 16px;
        }
        
        .feedback-btn:hover {
            background: #f3f4f6;
        }
    </style>
</head>
<body>
    <div class="container">
        <!-- AI Chatbot -->
        <div class="card">
            <h2>AI Chatbot</h2>
            <div id="chatbot-container"></div>
        </div>
        
        <!-- AI Content Generator -->
        <div class="card">
            <h2>AI Content Generator</h2>
            <div id="content-generator-container"></div>
        </div>
        
        <!-- AI Recommendations -->
        <div class="card">
            <h2>AI Recommendations</h2>
            <div id="recommendations-container"></div>
        </div>
        
        <!-- AI Analytics -->
        <div class="card">
            <h2>AI Analytics</h2>
            <div id="analytics-container">
                <p>AI-powered analytics and insights will be displayed here.</p>
                <button class="btn btn-primary" onclick="loadAnalytics()">Load Analytics</button>
            </div>
        </div>
    </div>

    <script src="ai-chatbot.js"></script>
    <script src="ai-content-generator.js"></script>
    <script src="ai-recommendations.js"></script>
    
    <script>
        // Initialize AI components
        document.addEventListener('DOMContentLoaded', () => {
            // Initialize chatbot
            const chatbot = new AIChatbot('chatbot-container', {
                apiUrl: '/api/ai/chat',
                theme: 'light',
                position: 'bottom-right'
            });
            
            // Initialize content generator
            const contentGenerator = new AIContentGenerator('content-generator-container', {
                apiUrl: '/api/ai/generate'
            });
            
            // Initialize recommendations
            const recommendations = new AIRecommendations('recommendations-container', {
                apiUrl: '/api/ai/recommendations',
                maxRecommendations: 5
            });
        });
        
        // Analytics function
        function loadAnalytics() {
            const container = document.getElementById('analytics-container');
            container.innerHTML = `
                <div class="loading-spinner"></div>
                <p>Loading analytics...</p>
            `;
            
            // Simulate analytics loading
            setTimeout(() => {
                container.innerHTML = `
                    <h3>AI Analytics Dashboard</h3>
                    <div class="analytics-grid">
                        <div class="analytics-item">
                            <h4>User Engagement</h4>
                            <p>85% increase in user engagement</p>
                        </div>
                        <div class="analytics-item">
                            <h4>Content Performance</h4>
                            <p>AI-generated content performs 40% better</p>
                        </div>
                        <div class="analytics-item">
                            <h4>Recommendation Accuracy</h4>
                            <p>92% accuracy in recommendations</p>
                        </div>
                    </div>
                `;
            }, 2000);
        }
    </script>
</body>
</html>
```

## 📝 Documentation Tasks

### Create AI Web Integration Guide
Create `week4/day25/docs/ai-web-integration-guide.md`:

```markdown
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
```

## 🧪 Testing & Validation

### AI Web Integration Testing
- [x] Chatbot works correctly
- [x] Content generation works
- [x] Recommendations work
- [x] Analytics work
- [x] API integration works

### Performance Testing
- [x] AI responses are fast
- [x] UI is responsive
- [x] Memory usage is efficient
- [x] Network requests are optimized
- [x] Error handling is robust

## 📊 Success Criteria

By the end of Day 25, you should have:

✅ **AI Web Integration Mastery**: AI features in web applications  
✅ **Chatbot Implementation**: Conversational AI interfaces  
✅ **Content Generation**: AI-powered content creation  
✅ **Recommendations**: AI-powered content suggestions  
✅ **Analytics**: AI-driven insights and analytics  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 25: AI Web Integration"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 26**: Review AI mobile integration concepts
4. **Update progress**: Document your learning in the daily summary

## 📚 Additional Resources

- [AI Web Development](https://developer.mozilla.org/en-US/docs/Web/API/Web_AI)
- [Conversational AI](https://cloud.google.com/dialogflow)
- [AI Content Generation](https://openai.com/blog/gpt-3-apps/)
- [AI Recommendations](https://www.ibm.com/cloud/learn/ai-recommendations)

---

**Ready for Day 26? Check out [Day 26: AI Mobile Integration](../day26/README.md)!** 🚀
