import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  AuthSession,
  persistSession,
  signInWithPassword,
  signUpWithPassword,
} from '../services/auth';

type AuthMode = 'sign-in' | 'sign-up';

interface LoginScreenProps {
  onAuthenticated: (session: AuthSession) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onAuthenticated }) => {
  const [mode, setMode] = useState<AuthMode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    return mode === 'sign-in' ? 'Sign In' : 'Create Account';
  }, [mode]);

  const toggleLabel = useMemo(() => {
    return mode === 'sign-in'
      ? 'Need an account? Sign up'
      : 'Already have an account? Sign in';
  }, [mode]);

  const handleSubmit = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    setError(null);
    setInfo(null);

    if (!normalizedEmail || !password) {
      setError('Email and password are required.');
      return;
    }

    if (mode === 'sign-up' && !displayName.trim()) {
      setError('Display name is required for sign up.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'sign-in') {
        const session = await signInWithPassword(normalizedEmail, password);
        await persistSession(session);
        onAuthenticated(session);
      } else {
        const session = await signUpWithPassword(normalizedEmail, password, displayName.trim());
        if (session) {
          await persistSession(session);
          onAuthenticated(session);
        } else {
          setInfo('Account created. Verify email if required, then sign in.');
          setMode('sign-in');
          setPassword('');
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authentication failed.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.page}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>Trip Together</Text>
        <Text style={styles.subtitle}>
          {mode === 'sign-in' ? 'Sign in to continue planning.' : 'Create your account to start.'}
        </Text>

        {mode === 'sign-up' && (
          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Display name"
            autoCapitalize="words"
            style={styles.input}
            editable={!loading}
          />
        )}

        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          keyboardType="email-address"
          autoCapitalize="none"
          autoCorrect={false}
          style={styles.input}
          editable={!loading}
        />

        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Password"
          secureTextEntry
          autoCapitalize="none"
          style={styles.input}
          editable={!loading}
        />

        {error && <Text style={styles.errorText}>{error}</Text>}
        {info && <Text style={styles.infoText}>{info}</Text>}

        <TouchableOpacity
          style={[styles.primaryButton, loading && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.primaryButtonText}>{submitLabel}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryButton}
          onPress={() => {
            setMode(mode === 'sign-in' ? 'sign-up' : 'sign-in');
            setError(null);
            setInfo(null);
          }}
          disabled={loading}
        >
          <Text style={styles.secondaryButtonText}>{toggleLabel}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: '#F3F5F8',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#E6E8EC',
    shadowColor: '#000000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1A1A2E',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#61697A',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#D5D9E1',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  primaryButton: {
    marginTop: 8,
    backgroundColor: '#F5A623',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  disabledButton: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  secondaryButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#4A5568',
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    color: '#C53030',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
  },
  infoText: {
    color: '#2B6CB0',
    fontSize: 13,
    marginTop: 4,
    marginBottom: 6,
  },
});

export default LoginScreen;
