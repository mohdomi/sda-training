// ai/mobile-components/flutter_ai_chatbot.dart
// Day 26 Task 2 — spec verbatim.
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
