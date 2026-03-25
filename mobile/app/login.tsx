import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  async function handleLogin() {
    if (!identifier.trim() || !password.trim()) {
      Alert.alert('Error', 'Please enter your email/phone and password.');
      return;
    }
    setLoading(true);
    try {
      const { token, user } = await api.login(identifier.trim(), password);
      await signIn(token, user);
      router.replace('/(tabs)/dashboard');
    } catch (err: unknown) {
      Alert.alert('Login Failed', err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.logo}>🍺</Text>
        <Text style={styles.title}>Bar Manager</Text>
        <Text style={styles.subtitle}>Sign in to your account</Text>

        <View style={styles.field}>
          <Text style={styles.label}>Email or Phone</Text>
          <TextInput
            style={styles.input}
            value={identifier}
            onChangeText={setIdentifier}
            placeholder="email@example.com"
            placeholderTextColor="#555"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            placeholderTextColor="#555"
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Sign In</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
    justifyContent: 'center',
    padding: 20
  },
  card: {
    backgroundColor: '#161616',
    borderRadius: 16,
    padding: 28,
    borderWidth: 1,
    borderColor: '#2a2a2a'
  },
  logo: { fontSize: 40, textAlign: 'center', marginBottom: 8 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 4
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 28
  },
  field: { marginBottom: 16 },
  label: { fontSize: 13, color: '#aaa', marginBottom: 6 },
  input: {
    backgroundColor: '#222',
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    padding: 12,
    fontSize: 15,
    color: '#fff'
  },
  button: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 8
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 }
});
