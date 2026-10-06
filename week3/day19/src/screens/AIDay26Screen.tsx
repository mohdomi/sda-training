// TEMPORARY day26 on-device test harness (revert before final commit).
import React, {useState} from 'react';
import {View, Text, TouchableOpacity, StyleSheet} from 'react-native';
import ReactNativeAIChatbot from '../ai-day26/ReactNativeAIChatbot';
import MobileAIContentGenerator from '../ai-day26/MobileAIContentGenerator';
import MobileAIRecommendations from '../ai-day26/MobileAIRecommendations';

const AI_API_URL = 'http://localhost:5001';

type Tab = 'chat' | 'gen' | 'recs';

const AIDay26Screen = () => {
  const [tab, setTab] = useState<Tab>('chat');

  return (
    <View style={styles.root}>
      <View style={styles.switcher}>
        {(['chat', 'gen', 'recs'] as Tab[]).map(t => (
          <TouchableOpacity
            key={t}
            style={[styles.switchBtn, tab === t && styles.switchBtnActive]}
            onPress={() => setTab(t)}>
            <Text style={[styles.switchTxt, tab === t && styles.switchTxtActive]}>
              {t === 'chat' ? 'Chat' : t === 'gen' ? 'Generate' : 'Recs'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.body}>
        {tab === 'chat' && <ReactNativeAIChatbot apiUrl={AI_API_URL} />}
        {tab === 'gen' && <MobileAIContentGenerator apiUrl={AI_API_URL} />}
        {tab === 'recs' && (
          <MobileAIRecommendations apiUrl={AI_API_URL} maxRecommendations={5} />
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {flex: 1, backgroundColor: '#f5f5f5'},
  switcher: {flexDirection: 'row', padding: 8, gap: 8, backgroundColor: '#fff'},
  switchBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d1d5db',
    alignItems: 'center',
  },
  switchBtnActive: {backgroundColor: '#3b82f6', borderColor: '#3b82f6'},
  switchTxt: {color: '#374151', fontWeight: '600'},
  switchTxtActive: {color: '#fff'},
  body: {flex: 1},
});

export default AIDay26Screen;
