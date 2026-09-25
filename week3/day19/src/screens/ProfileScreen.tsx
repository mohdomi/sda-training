import React from 'react';
import {View, Text, Button, StyleSheet} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {logoutUser} from '../store/slices/authSlice';
import type {RootState, AppDispatch} from '../store';

const ProfileScreen = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {user} = useSelector((state: RootState) => state.auth);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{user?.name ?? 'Profile'}</Text>
      <Text style={styles.subtitle}>{user?.email ?? 'No email'}</Text>
      <Button title="Sign Out" onPress={() => dispatch(logoutUser())} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24, backgroundColor: '#fff'},
  title: {fontSize: 20, fontWeight: 'bold', marginBottom: 4, color: '#000'},
  subtitle: {fontSize: 14, color: '#000', marginBottom: 16},
});

export default ProfileScreen;
