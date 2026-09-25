import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useSelector} from 'react-redux';
import type {RootState} from '../store';

const DashboardScreen = () => {
  const {user} = useSelector((state: RootState) => state.auth);
  const {isOnline} = useSelector((state: RootState) => state.offline);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome, {user?.name ?? 'Guest'}</Text>
      <Text style={styles.text}>Status: {isOnline ? 'Online' : 'Offline'}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff'},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 8, color: '#000'},
  text: {color: '#000'},
});

export default DashboardScreen;
