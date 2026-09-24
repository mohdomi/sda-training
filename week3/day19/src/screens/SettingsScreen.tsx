import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';

const SettingsScreen = () => {
  const {queueLength} = useSelector((state: RootState) => state.offline);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <Text>Pending offline requests: {queueLength}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 8},
});

export default SettingsScreen;
