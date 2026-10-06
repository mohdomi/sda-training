# ai/mobile_ai_service.py
# Day 26 Task 5 — spec verbatim.
from flask import Flask, request, jsonify
import logging
from typing import Dict, Any, List
import json

class MobileAIService:
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

        @self.app.route('/profile', methods=['GET'])
        def get_user_profile():
            """Get user profile for recommendations"""
            try:
                # In a real application, you would get this from a database
                profile = {
                    'interests': ['technology', 'programming', 'ai'],
                    'preferences': {
                        'content_type': 'articles',
                        'tone': 'professional',
                        'length': 'medium'
                    },
                    'history': {
                        'viewed_content': [],
                        'bookmarked_content': [],
                        'rated_content': []
                    }
                }

                return jsonify({
                    'success': True,
                    'profile': profile
                })

            except Exception as e:
                self.logger.error(f"Profile error: {e}")
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
                'id': f'rec_{i+1}',
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
        """Run the mobile AI service"""
        self.logger.info(f"Starting Mobile AI Service on {host}:{port}")
        self.app.run(host=host, port=port, debug=False)
