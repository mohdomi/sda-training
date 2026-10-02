// ai/mobile-components/MobileAIContentGenerator.tsx
// Day 26 Task 3 — spec verbatim.
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
