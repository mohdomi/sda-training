import React, {useState} from 'react';
import {View, Text, TextInput, Button, StyleSheet} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import {loginUser} from '../store/slices/authSlice';
import type {RootState, AppDispatch} from '../store';

const LoginScreen = ({navigation}: any) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const dispatch = useDispatch<AppDispatch>();
  const {loading, error} = useSelector((state: RootState) => state.auth);

  const handleLogin = () => {
    dispatch(loginUser({email, password}));
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SDA Training</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Button title={loading ? 'Signing in...' : 'Sign In'} onPress={handleLogin} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', padding: 24},
  title: {fontSize: 24, fontWeight: 'bold', marginBottom: 24, textAlign: 'center'},
  input: {borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 12},
  error: {color: 'red', marginBottom: 12, textAlign: 'center'},
});

export default LoginScreen;
