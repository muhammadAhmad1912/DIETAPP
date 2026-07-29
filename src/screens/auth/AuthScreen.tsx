import React, { useEffect, useState } from 'react';
import { Alert, Pressable, StyleSheet, Switch, View } from 'react-native';
import { Screen } from '@/components/ui/Screen';
import { AppText } from '@/components/ui/AppText';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/contexts/ThemeContext';
import { Spacing } from '@/theme/tokens';

export function AuthScreen() {
  const { colors } = useTheme();
  const { signIn, signUp, configured, keepSignedInDefault } = useAuth();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setKeepSignedIn(keepSignedInDefault);
  }, [keepSignedInDefault]);

  const submit = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Missing fields', 'Enter email and password.');
      return;
    }
    setLoading(true);
    try {
      const error =
        mode === 'signin'
          ? await signIn(email, password, keepSignedIn)
          : await signUp(email, password, displayName, keepSignedIn);

      if (error) {
        if (error.toLowerCase().includes('check your email')) {
          Alert.alert('Confirm email', error);
          setMode('signin');
        } else {
          Alert.alert('Auth error', error);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll>
      <AppText variant="hero">AIInventory</AppText>
      <AppText muted style={{ marginBottom: Spacing.lg }}>
        Sign in to sync your inventory across devices.
      </AppText>

      {!configured ? (
        <AppText style={{ color: colors.danger, marginBottom: Spacing.md }}>
          Supabase env vars missing. Add EXPO_PUBLIC_SUPABASE_URL and
          EXPO_PUBLIC_SUPABASE_ANON_KEY to your .env file, then restart Expo.
        </AppText>
      ) : null}

      <Card style={styles.card}>
        {mode === 'signup' ? (
          <Input
            label="Display name"
            placeholder="Your name"
            value={displayName}
            onChangeText={setDisplayName}
            autoCapitalize="words"
          />
        ) : null}

        <View style={styles.form}>
          <Input
            label="Email"
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />
          <Input
            label="Password"
            placeholder="Enter password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoComplete={mode === 'signin' ? 'password' : 'new-password'}
            rightElement={
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={10}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}
              >
                <AppText style={{ color: colors.primary, fontWeight: '600' }}>
                  {showPassword ? 'Hide' : 'Show'}
                </AppText>
              </Pressable>
            }
          />

          <View style={styles.keepRow}>
            <AppText>Keep me signed in</AppText>
            <Switch
              value={keepSignedIn}
              onValueChange={setKeepSignedIn}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
          </View>

          <Button
            title={mode === 'signin' ? 'Sign in' : 'Create account'}
            onPress={submit}
            loading={loading}
            disabled={!configured}
          />
          <Button
            title={
              mode === 'signin'
                ? 'Need an account? Sign up'
                : 'Have an account? Sign in'
            }
            variant="ghost"
            onPress={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
          />
        </View>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: Spacing.md },
  form: { gap: Spacing.md },
  keepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.xs,
  },
});
