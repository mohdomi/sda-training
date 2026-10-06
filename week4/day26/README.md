# Day 26: AI Mobile Integration

## 🎯 Learning Objectives

- Master AI integration in mobile applications
- Implement AI features for React Native and Flutter
- Create mobile AI chatbots and assistants
- Build AI-powered mobile content generation
- Integrate AI services with mobile apps

## 📚 Theory & Concepts

### Mobile AI Integration
- **Mobile AI Patterns**: AI features in mobile apps
- **Offline AI**: Local AI processing and caching
- **Real-time AI**: Streaming AI responses
- **Mobile UX**: AI-friendly mobile interfaces
- **Performance**: Optimizing AI for mobile devices

### Mobile AI Features
- **Voice AI**: Speech recognition and synthesis
- **Image AI**: Computer vision and image processing
- **Text AI**: Natural language processing
- **Recommendations**: AI-powered mobile recommendations
- **Automation**: AI-driven mobile workflows

### Best Practices
- **Performance**: Optimizing AI for mobile
- **Battery**: Managing AI power consumption
- **Offline**: Offline AI capabilities
- **Security**: Secure mobile AI integration
- **UX**: Mobile-first AI design

## 🛠️ Hands-on Tasks

### Task 1: Create React Native AI Chatbot
Implement AI chatbot for React Native:

```typescript
// ai/mobile-components/ReactNativeAIChatbot.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: Date;
}

interface AIChatbotProps {
  apiUrl: string;
  theme?: 'light' | 'dark';
  maxMessages?: number;
}

const ReactNativeAIChatbot: React.FC<AIChatbotProps> = ({
  apiUrl,
  theme = 'light',
  maxMessages = 100,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    loadMessages();
  }, []);

  useEffect(() => {
    saveMessages();
  }, [messages]);

  const loadMessages = async () => {
    try {
      const savedMessages = await AsyncStorage.getItem('ai_chatbot_messages');
      if (savedMessages) {
        const parsedMessages = JSON.parse(savedMessages).map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp),
        }));
        setMessages(parsedMessages);
      } else {
        // Add welcome message
        addMessage('Hello! How can I help you today?', false);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };

  const saveMessages = async () => {
    try {
      await AsyncStorage.setItem('ai_chatbot_messages', JSON.stringify(messages));
    } catch (error) {
      console.error('Failed to save messages:', error);
    }
  };

  const addMessage = (text: string, isUser: boolean) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser,
      timestamp: new Date(),
    };

    setMessages(prev => {
      const updated = [...prev, newMessage];
      // Keep only the last maxMessages
      return updated.slice(-maxMessages);
    });
  };

  const sendMessage = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    addMessage(userMessage, true);

    setIsLoading(true);
    setIsTyping(true);

    try {
      const response = await fetch(`${apiUrl}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: messages.map(msg => ({
            role: msg.isUser ? 'user' : 'assistant',
            content: msg.text,
          })),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      addMessage(result.response, false);
    } catch (error) {
      console.error('AI chat error:', error);
      addMessage('Sorry, I encountered an error. Please try again.', false);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const clearMessages = () => {
    Alert.alert(
      'Clear Chat',
      'Are you sure you want to clear all messages?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => {
            setMessages([]);
            addMessage('Hello! How can I help you today?', false);
          },
        },
      ]
    );
  };

  const renderMessage = (message: Message) => (
    <View
      key={message.id}
      style={[
        styles.messageContainer,
        message.isUser ? styles.userMessage : styles.botMessage,
      ]}
    >
      <Text style={[styles.messageText, message.isUser && styles.userMessageText]}>
        {message.text}
      </Text>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString()}
      </Text>
    </View>
  );

  const renderTypingIndicator = () => (
    <View style={[styles.messageContainer, styles.botMessage]}>
      <Text style={styles.typingText}>AI is typing...</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <TouchableOpacity onPress={clearMessages} style={styles.clearButton}>
          <Text style={styles.clearButtonText}>Clear</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.messagesContainer}
        onContentSizeChange={() => scrollViewRef.current?.scrollToEnd()}
      >
        {messages.map(renderMessage)}
        {isTyping && renderTypingIndicator()}
      </ScrollView>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.textInput}
          value={inputText}
          onChangeText={setInputText}
          placeholder="Type your message..."
          multiline
          maxLength={1000}
        />
        <TouchableOpacity
          style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={!inputText.trim() || isLoading}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#3b82f6',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  clearButton: {
    padding: 8,
  },
  clearButtonText: {
    color: 'white',
    fontSize: 14,
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    maxWidth: '80%',
    marginBottom: 12,
    padding: 12,
    borderRadius: 12,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#3b82f6',
  },
  botMessage: {
    alignSelf: 'flex-start',
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  messageText: {
    fontSize: 16,
    color: '#374151',
  },
  userMessageText: {
    color: 'white',
  },
  timestamp: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  typingText: {
    fontSize: 16,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 8,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  sendButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});

export default ReactNativeAIChatbot;
```

### Task 2: Create Flutter AI Chatbot
Implement AI chatbot for Flutter:

```dart
// ai/mobile-components/flutter_ai_chatbot.dart
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'dart:io';

class FlutterAIChatbot extends StatefulWidget {
  final String apiUrl;
  final String theme;
  final int maxMessages;

  const FlutterAIChatbot({
    Key? key,
    required this.apiUrl,
    this.theme = 'light',
    this.maxMessages = 100,
  }) : super(key: key);

  @override
  _FlutterAIChatbotState createState() => _FlutterAIChatbotState();
}

class _FlutterAIChatbotState extends State<FlutterAIChatbot> {
  final List<Message> _messages = [];
  final TextEditingController _textController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _isLoading = false;
  bool _isTyping = false;

  @override
  void initState() {
    super.initState();
    _loadMessages();
  }

  Future<void> _loadMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedMessages = prefs.getString('ai_chatbot_messages');
      
      if (savedMessages != null) {
        final List<dynamic> messagesJson = json.decode(savedMessages);
        setState(() {
          _messages.clear();
          _messages.addAll(
            messagesJson.map((json) => Message.fromJson(json)).toList()
          );
        });
      } else {
        _addMessage('Hello! How can I help you today?', false);
      }
    } catch (e) {
      print('Failed to load messages: $e');
    }
  }

  Future<void> _saveMessages() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final messagesJson = _messages.map((msg) => msg.toJson()).toList();
      await prefs.setString('ai_chatbot_messages', json.encode(messagesJson));
    } catch (e) {
      print('Failed to save messages: $e');
    }
  }

  void _addMessage(String text, bool isUser) {
    setState(() {
      _messages.add(Message(
        id: DateTime.now().millisecondsSinceEpoch.toString(),
        text: text,
        isUser: isUser,
        timestamp: DateTime.now(),
      ));
      
      // Keep only the last maxMessages
      if (_messages.length > widget.maxMessages) {
        _messages.removeAt(0);
      }
    });
    
    _saveMessages();
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _sendMessage() async {
    final text = _textController.text.trim();
    if (text.isEmpty || _isLoading) return;

    _textController.clear();
    _addMessage(text, true);

    setState(() {
      _isLoading = true;
      _isTyping = true;
    });

    try {
      final response = await _callAIAPI(text);
      _addMessage(response, false);
    } catch (e) {
      _addMessage('Sorry, I encountered an error. Please try again.', false);
      print('AI chat error: $e');
    } finally {
      setState(() {
        _isLoading = false;
        _isTyping = false;
      });
    }
  }

  Future<String> _callAIAPI(String message) async {
    final response = await HttpClient().postUrl(Uri.parse('${widget.apiUrl}/chat'))
      ..headers.contentType = ContentType.json
      ..write(json.encode({
        'message': message,
        'conversation_history': _messages.map((msg) => {
          'role': msg.isUser ? 'user' : 'assistant',
          'content': msg.text,
        }).toList(),
      }));

    final responseData = await response.close();
    final responseBody = await responseData.transform(utf8.decoder).join();
    
    if (responseData.statusCode != 200) {
      throw Exception('HTTP error: ${responseData.statusCode}');
    }

    final result = json.decode(responseBody);
    return result['response'];
  }

  void _clearMessages() {
    showDialog(
      context: context,
      builder: (BuildContext context) {
        return AlertDialog(
          title: const Text('Clear Chat'),
          content: const Text('Are you sure you want to clear all messages?'),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () {
                setState(() {
                  _messages.clear();
                });
                _addMessage('Hello! How can I help you today?', false);
                Navigator.of(context).pop();
              },
              child: const Text('Clear'),
            ),
          ],
        );
      },
    );
  }

  Widget _buildMessage(Message message) {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: message.isUser 
            ? MainAxisAlignment.end 
            : MainAxisAlignment.start,
        children: [
          Container(
            constraints: BoxConstraints(
              maxWidth: MediaQuery.of(context).size.width * 0.8,
            ),
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: message.isUser ? Colors.blue : Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  message.text,
                  style: TextStyle(
                    color: message.isUser ? Colors.white : Colors.black87,
                    fontSize: 16,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${message.timestamp.hour}:${message.timestamp.minute.toString().padLeft(2, '0')}',
                  style: TextStyle(
                    color: message.isUser ? Colors.white70 : Colors.grey[600],
                    fontSize: 12,
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTypingIndicator() {
    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey[200],
              borderRadius: BorderRadius.circular(12),
            ),
            child: const Text(
              'AI is typing...',
              style: TextStyle(
                color: Colors.grey,
                fontStyle: FontStyle.italic,
              ),
            ),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Assistant'),
        backgroundColor: Colors.blue,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.clear),
            onPressed: _clearMessages,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: ListView.builder(
              controller: _scrollController,
              padding: const EdgeInsets.all(16),
              itemCount: _messages.length + (_isTyping ? 1 : 0),
              itemBuilder: (context, index) {
                if (index < _messages.length) {
                  return _buildMessage(_messages[index]);
                } else {
                  return _buildTypingIndicator();
                }
              },
            ),
          ),
          Container(
            padding: const EdgeInsets.all(16),
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Colors.grey, width: 1),
              ),
            ),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _textController,
                    decoration: const InputDecoration(
                      hintText: 'Type your message...',
                      border: OutlineInputBorder(
                        borderRadius: BorderRadius.all(Radius.circular(20)),
                      ),
                      contentPadding: EdgeInsets.symmetric(
                        horizontal: 16,
                        vertical: 8,
                      ),
                    ),
                    maxLines: null,
                    maxLength: 1000,
                    onSubmitted: (_) => _sendMessage(),
                  ),
                ),
                const SizedBox(width: 8),
                FloatingActionButton(
                  onPressed: _isLoading ? null : _sendMessage,
                  backgroundColor: Colors.blue,
                  child: const Icon(Icons.send, color: Colors.white),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class Message {
  final String id;
  final String text;
  final bool isUser;
  final DateTime timestamp;

  Message({
    required this.id,
    required this.text,
    required this.isUser,
    required this.timestamp,
  });

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'text': text,
      'isUser': isUser,
      'timestamp': timestamp.toIso8601String(),
    };
  }

  factory Message.fromJson(Map<String, dynamic> json) {
    return Message(
      id: json['id'],
      text: json['text'],
      isUser: json['isUser'],
      timestamp: DateTime.parse(json['timestamp']),
    );
  }
}
```

### Task 3: Create Mobile AI Content Generator
Implement AI content generation for mobile:

```typescript
// ai/mobile-components/MobileAIContentGenerator.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ContentGeneratorProps {
  apiUrl: string;
  theme?: 'light' | 'dark';
}

interface GeneratedContent {
  id: string;
  content: string;
  metadata: {
    contentType: string;
    topic: string;
    tone: string;
    length: string;
    keywords: string[];
  };
  timestamp: Date;
}

const MobileAIContentGenerator: React.FC<ContentGeneratorProps> = ({
  apiUrl,
  theme = 'light',
}) => {
  const [contentType, setContentType] = useState('article');
  const [topic, setTopic] = useState('');
  const [tone, setTone] = useState('professional');
  const [length, setLength] = useState('medium');
  const [keywords, setKeywords] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);

  const generateContent = async () => {
    if (!topic.trim()) {
      Alert.alert('Error', 'Please enter a topic');
      return;
    }

    setIsGenerating(true);

    try {
      const response = await fetch(`${apiUrl}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content_type: contentType,
          topic: topic.trim(),
          tone: tone,
          length: length,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      const newContent: GeneratedContent = {
        id: Date.now().toString(),
        content: result.content,
        metadata: {
          contentType,
          topic: topic.trim(),
          tone,
          length,
          keywords: keywords.split(',').map(k => k.trim()).filter(k => k),
        },
        timestamp: new Date(),
      };

      setGeneratedContent(newContent);
      await saveGeneratedContent(newContent);
    } catch (error) {
      console.error('Content generation error:', error);
      Alert.alert('Error', 'Failed to generate content. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const saveGeneratedContent = async (content: GeneratedContent) => {
    try {
      const savedContent = await AsyncStorage.getItem('ai_generated_content');
      const contentList = savedContent ? JSON.parse(savedContent) : [];
      contentList.push(content);
      await AsyncStorage.setItem('ai_generated_content', JSON.stringify(contentList));
    } catch (error) {
      console.error('Failed to save generated content:', error);
    }
  };

  const copyContent = async () => {
    if (generatedContent) {
      // In a real app, you would use a clipboard library
      Alert.alert('Copied', 'Content copied to clipboard!');
    }
  };

  const regenerateContent = () => {
    generateContent();
  };

  const clearForm = () => {
    setTopic('');
    setKeywords('');
    setGeneratedContent(null);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.form}>
        <Text style={styles.title}>AI Content Generator</Text>
        <Text style={styles.subtitle}>Generate high-quality content using AI</Text>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Content Type</Text>
          <View style={styles.radioGroup}>
            {['article', 'blog-post', 'social-media', 'email', 'product-description'].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.radioOption,
                  contentType === type && styles.radioOptionSelected,
                ]}
                onPress={() => setContentType(type)}
              >
                <Text style={[
                  styles.radioText,
                  contentType === type && styles.radioTextSelected,
                ]}>
                  {type.replace('-', ' ').toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Topic/Subject</Text>
          <TextInput
            style={styles.textInput}
            value={topic}
            onChangeText={setTopic}
            placeholder="Enter your topic..."
            multiline
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Tone</Text>
          <View style={styles.radioGroup}>
            {['professional', 'casual', 'friendly', 'formal', 'creative'].map((toneOption) => (
              <TouchableOpacity
                key={toneOption}
                style={[
                  styles.radioOption,
                  tone === toneOption && styles.radioOptionSelected,
                ]}
                onPress={() => setTone(toneOption)}
              >
                <Text style={[
                  styles.radioText,
                  tone === toneOption && styles.radioTextSelected,
                ]}>
                  {toneOption.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Length</Text>
          <View style={styles.radioGroup}>
            {[
              { value: 'short', label: 'Short (100-200 words)' },
              { value: 'medium', label: 'Medium (200-500 words)' },
              { value: 'long', label: 'Long (500+ words)' },
            ].map((lengthOption) => (
              <TouchableOpacity
                key={lengthOption.value}
                style={[
                  styles.radioOption,
                  length === lengthOption.value && styles.radioOptionSelected,
                ]}
                onPress={() => setLength(lengthOption.value)}
              >
                <Text style={[
                  styles.radioText,
                  length === lengthOption.value && styles.radioTextSelected,
                ]}>
                  {lengthOption.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Keywords (optional)</Text>
          <TextInput
            style={styles.textInput}
            value={keywords}
            onChangeText={setKeywords}
            placeholder="Enter keywords separated by commas..."
            multiline
          />
        </View>

        <TouchableOpacity
          style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
          onPress={generateContent}
          disabled={isGenerating}
        >
          {isGenerating ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.generateButtonText}>Generate Content</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.clearButton} onPress={clearForm}>
          <Text style={styles.clearButtonText}>Clear Form</Text>
        </TouchableOpacity>
      </View>

      {generatedContent && (
        <View style={styles.resultContainer}>
          <Text style={styles.resultTitle}>Generated Content</Text>
          <View style={styles.resultActions}>
            <TouchableOpacity style={styles.actionButton} onPress={copyContent}>
              <Text style={styles.actionButtonText}>Copy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={regenerateContent}>
              <Text style={styles.actionButtonText}>Regenerate</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.resultContent}>
            <Text style={styles.resultText}>{generatedContent.content}</Text>
          </ScrollView>
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  form: {
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 24,
  },
  formGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: 'white',
  },
  radioGroup: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  radioOption: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: 'white',
  },
  radioOptionSelected: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
  },
  radioText: {
    fontSize: 14,
    color: '#374151',
  },
  radioTextSelected: {
    color: 'white',
  },
  generateButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 12,
  },
  generateButtonDisabled: {
    backgroundColor: '#9ca3af',
  },
  generateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  clearButton: {
    backgroundColor: 'transparent',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  clearButtonText: {
    color: '#374151',
    fontSize: 16,
  },
  resultContainer: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  resultTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  resultActions: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  actionButtonText: {
    color: '#374151',
    fontSize: 14,
  },
  resultContent: {
    maxHeight: 300,
  },
  resultText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 24,
  },
});

export default MobileAIContentGenerator;
```

### Task 4: Create Mobile AI Recommendations
Implement AI recommendations for mobile:

```typescript
// ai/mobile-components/MobileAIRecommendations.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  category: string;
  score: number;
  url: string;
  image?: string;
}

interface AIRecommendationsProps {
  apiUrl: string;
  maxRecommendations?: number;
  theme?: 'light' | 'dark';
}

const MobileAIRecommendations: React.FC<AIRecommendationsProps> = ({
  apiUrl,
  maxRecommendations = 5,
  theme = 'light',
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<any>({});
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);

  useEffect(() => {
    loadUserProfile();
    loadRecommendations();
  }, []);

  const loadUserProfile = async () => {
    try {
      const profile = await AsyncStorage.getItem('user_profile');
      if (profile) {
        setUserProfile(JSON.parse(profile));
      }
    } catch (error) {
      console.error('Failed to load user profile:', error);
    }
  };

  const loadRecommendations = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${apiUrl}/recommendations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_profile: userProfile,
          max_recommendations: maxRecommendations,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      setRecommendations(result.recommendations);
    } catch (error) {
      console.error('Failed to load recommendations:', error);
      Alert.alert('Error', 'Failed to load recommendations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const submitFeedback = async (rating: number) => {
    try {
      await fetch(`${apiUrl}/recommendations/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          rating: rating,
          recommendations: recommendations,
          user_profile: userProfile,
        }),
      });

      setFeedbackSubmitted(true);
      Alert.alert('Thank you!', 'Your feedback has been submitted.');
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  };

  const refreshRecommendations = () => {
    loadRecommendations();
    setFeedbackSubmitted(false);
  };

  const renderRecommendation = (recommendation: Recommendation) => (
    <View key={recommendation.id} style={styles.recommendationItem}>
      <View style={styles.recommendationImage}>
        <Image
          source={{ uri: recommendation.image || '/images/placeholder.jpg' }}
          style={styles.recommendationImage}
          defaultSource={require('./assets/placeholder.png')}
        />
      </View>
      <View style={styles.recommendationContent}>
        <Text style={styles.recommendationTitle}>{recommendation.title}</Text>
        <Text style={styles.recommendationDescription}>{recommendation.description}</Text>
        <View style={styles.recommendationMeta}>
          <Text style={styles.recommendationScore}>
            Score: {recommendation.score.toFixed(2)}
          </Text>
          <Text style={styles.recommendationCategory}>{recommendation.category}</Text>
        </View>
        <View style={styles.recommendationActions}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Handle view action
              console.log('View recommendation:', recommendation.title);
            }}
          >
            <Text style={styles.actionButtonText}>View</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => {
              // Handle bookmark action
              console.log('Bookmark recommendation:', recommendation.title);
            }}
          >
            <Text style={styles.actionButtonText}>Bookmark</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderFeedback = () => (
    <View style={styles.feedbackContainer}>
      <Text style={styles.feedbackTitle}>How did we do?</Text>
      <View style={styles.feedbackButtons}>
        {[1, 2, 3, 4, 5].map((rating) => (
          <TouchableOpacity
            key={rating}
            style={styles.feedbackButton}
            onPress={() => submitFeedback(rating)}
          >
            <Text style={styles.feedbackButtonText}>
              {rating === 1 ? '😞' : rating === 2 ? '😐' : rating === 3 ? '😊' : rating === 4 ? '😍' : '🤩'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3b82f6" />
        <Text style={styles.loadingText}>Loading recommendations...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Recommended for You</Text>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshRecommendations}>
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {recommendations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No recommendations available at the moment.</Text>
        </View>
      ) : (
        <>
          <View style={styles.recommendationsContainer}>
            {recommendations.map(renderRecommendation)}
          </View>
          
          {!feedbackSubmitted && (
            <View style={styles.feedbackContainer}>
              {renderFeedback()}
            </View>
          )}
        </>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
  },
  refreshButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
  },
  recommendationsContainer: {
    padding: 16,
  },
  recommendationItem: {
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  recommendationImage: {
    width: 80,
    height: 80,
    borderRadius: 4,
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 4,
  },
  recommendationDescription: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  recommendationMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  recommendationScore: {
    fontSize: 12,
    color: '#3b82f6',
    fontWeight: '500',
  },
  recommendationCategory: {
    fontSize: 12,
    color: '#6b7280',
  },
  recommendationActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  actionButtonText: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '500',
  },
  feedbackContainer: {
    backgroundColor: 'white',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  feedbackTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
    textAlign: 'center',
  },
  feedbackButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  feedbackButton: {
    padding: 8,
    borderRadius: 4,
  },
  feedbackButtonText: {
    fontSize: 24,
  },
});

export default MobileAIRecommendations;
```

### Task 5: Create Mobile AI Service
Implement comprehensive mobile AI service:

```python
# ai/mobile_ai_service.py
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
```

## 📝 Documentation Tasks

### Create AI Mobile Integration Guide
Create `week4/day26/docs/ai-mobile-integration-guide.md`:

```markdown
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
```

## 🧪 Testing & Validation

### AI Mobile Integration Testing
- [x] Chatbot works on mobile
- [x] Content generation works
- [x] Recommendations work
- [x] Offline functionality works
- [x] API integration works

### Performance Testing
- [x] AI responses are fast
- [x] Mobile UI is responsive
- [x] Battery usage is reasonable
- [x] Memory usage is efficient
- [x] Network requests are optimized

## 📊 Success Criteria

By the end of Day 26, you should have:

✅ **AI Mobile Integration Mastery**: AI features in mobile apps  
✅ **React Native AI**: AI integration in React Native  
✅ **Flutter AI**: AI integration in Flutter  
✅ **Mobile UX**: Mobile-first AI design  
✅ **Performance**: Optimized mobile AI performance  

## 🔄 Next Steps

1. **Commit your work**: `git add . && git commit -m "Complete Day 26: AI Mobile Integration"`
2. **Create PR**: Submit pull request for code review
3. **Prepare for Day 27**: Review capstone project concepts
4. **Update progress**: Document your learning in the daily summary

## 📚 Additional Resources

- [React Native AI](https://reactnative.dev/docs/ai-integration)
- [Flutter AI](https://flutter.dev/docs/ai-integration)
- [Mobile AI Best Practices](https://developer.apple.com/machine-learning/)
- [AI Mobile Security](https://developer.android.com/guide/topics/ai)

---

**Ready for Day 27? Check out [Day 27: Capstone Project](../day27/README.md)!** 🚀
