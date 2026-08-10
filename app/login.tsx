import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { AppModal, Button, Logo } from '@/components/ui';
import { authenticateWithBiometrics, isBiometricAvailable, isBiometricEnabled, setBiometricEnabled } from '@/services/biometric.service';
import { useAuthStore } from '@/stores/auth.store';
import { colors, theme } from '@/theme/theme';
import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from '@/utils/rememberedEmail';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotVisible, setForgotVisible] = useState(false);
  const [biometricReady, setBiometricReady] = useState(false);
  const login = useAuthStore((state) => state.login);

  useEffect(() => {
    (async () => {
      const rememberedEmail = await getRememberedEmail();
      if (rememberedEmail) {
        setEmail(rememberedEmail);
        setRemember(true);
      }
      const available = await isBiometricAvailable();
      const enabled = await isBiometricEnabled();
      setBiometricReady(available && enabled);
    })();
  }, []);

  async function entrar() {
    if (!email.trim() || !password) {
      setError('Informe o e-mail e a senha.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(email.trim().toLowerCase(), password);
      if (remember) await setRememberedEmail(email.trim().toLowerCase());
      else await clearRememberedEmail();
      if (await isBiometricAvailable()) await setBiometricEnabled(true);
      router.replace('/dashboard');
    } catch (err) {
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Não foi possível entrar.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function entrarComBiometria() {
    setError(null);
    const success = await authenticateWithBiometrics('Entrar no Coração Gaúcho');
    if (!success) {
      setError('Não foi possível validar sua biometria.');
      return;
    }
    router.replace('/dashboard');
  }

  return <ScrollView
    style={styles.root}
    contentContainerStyle={[styles.container, Platform.OS === 'web' && styles.containerWeb]}
    keyboardShouldPersistTaps="handled"
  >
    <View style={styles.hero}>
      <Logo size={96} />
      <Text style={styles.brand}>CORAÇÃO GAÚCHO</Text>
      <Text style={styles.tagline}>TRADIÇÃO QUE NOS UNE</Text>
    </View>

    <View style={styles.card}>
      <Text style={styles.title}>Acessar plataforma</Text>

      <Text style={styles.label}>E-mail</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="email-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="seu@email.com"
          placeholderTextColor={colors.muted}
          accessibilityLabel="E-mail"
        />
      </View>

      <Text style={styles.label}>Senha</Text>
      <View style={styles.inputWrap}>
        <MaterialCommunityIcons name="lock-outline" size={18} color={colors.muted} />
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          secureTextEntry={!showPassword}
          placeholder="********"
          placeholderTextColor={colors.muted}
          accessibilityLabel="Senha"
        />
        <TouchableOpacity onPress={() => setShowPassword((value) => !value)} accessibilityRole="button" accessibilityLabel={showPassword ? 'Ocultar senha' : 'Mostrar senha'}>
          <MaterialCommunityIcons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.muted} />
        </TouchableOpacity>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.row}>
        <TouchableOpacity style={styles.rememberRow} onPress={() => setRemember((value) => !value)} accessibilityRole="checkbox" accessibilityState={{ checked: remember }}>
          <MaterialCommunityIcons name={remember ? 'checkbox-marked' : 'checkbox-blank-outline'} size={18} color={remember ? colors.red : colors.muted} />
          <Text style={styles.rememberText}>Lembrar acesso</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setForgotVisible(true)} accessibilityRole="button" accessibilityLabel="Esqueci minha senha">
          <Text style={styles.link}>Esqueci minha senha</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.buttonSpacing}>
        <Button title={loading ? 'ENTRANDO...' : 'ENTRAR'} onPress={loading ? undefined : entrar} disabled={loading} />
      </View>

      {biometricReady ? <>
        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>ou</Text>
          <View style={styles.dividerLine} />
        </View>
        <Button title="Entrar com biometria" tone="dark" onPress={entrarComBiometria} />
      </> : null}
    </View>

    <Text style={styles.version}>Versão 1.0.0</Text>

    <AppModal visible={forgotVisible} onClose={() => setForgotVisible(false)} position="center" title="Esqueci minha senha">
      <Text style={styles.modalText}>
        Entre em contato com um administrador do Coração Gaúcho para redefinir sua senha de acesso.
      </Text>
    </AppModal>
  </ScrollView>;
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.black },
  container: { flexGrow: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 64, paddingBottom: 40 },
  containerWeb: { paddingTop: 'max(64px, env(safe-area-inset-top, 0px))' as unknown as number },
  hero: { alignItems: 'center', gap: 6, marginBottom: 28 },
  brand: { fontFamily: theme.font.bold, fontSize: 20, color: colors.text, letterSpacing: 1, marginTop: 12 },
  tagline: { fontFamily: theme.font.medium, fontSize: 11, color: colors.goldAccent, letterSpacing: 2 },
  card: { width: '100%', maxWidth: theme.layout.mobileMaxWidth, backgroundColor: colors.dark, borderRadius: theme.radius.xl, borderWidth: 1, borderColor: colors.border, padding: 22 },
  title: { fontFamily: theme.font.semiBold, fontSize: 18, color: colors.text, marginBottom: 18, textAlign: 'center' },
  label: { fontFamily: theme.font.medium, fontSize: 12, color: colors.muted, marginBottom: 6, marginTop: 14 },
  inputWrap: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 48, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 14 },
  input: { flex: 1, height: 46, color: colors.text, fontFamily: theme.font.regular, fontSize: 14, outlineStyle: 'none' as never },
  error: { fontFamily: theme.font.medium, color: colors.red, fontSize: 13, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, flexWrap: 'wrap', gap: 8 },
  rememberRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rememberText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 13 },
  link: { fontFamily: theme.font.semiBold, color: colors.red, fontSize: 13 },
  buttonSpacing: { marginTop: 20 },
  divider: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 18, marginBottom: 14 },
  dividerLine: { flex: 1, height: 1, backgroundColor: colors.border },
  dividerText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 12 },
  version: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 12, marginTop: 24 },
  modalText: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 14, lineHeight: 20 }
});
