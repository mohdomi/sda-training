import React, {useEffect} from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {fetchAnalytics} from '../store/slices/analyticsSlice';
import type {RootState, AppDispatch} from '../store';

const AnalyticsScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {data, loading} = useSelector((state: RootState) => state.analytics);

  useEffect(() => {
    dispatch(fetchAnalytics('30d'));
  }, [dispatch]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Analytics</Text>
      {loading ? <Text>Loading...</Text> : null}
      {data ? <Text>Total users: {data.totalUsers}</Text> : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 8},
});

export default AnalyticsScreen;
