// ai/mobile-components/MobileAIRecommendations.tsx
// Day 26 Task 4 — spec verbatim.
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
