import Constants from 'expo-constants';
import { StyleSheet, Text, View } from 'react-native';

import { Header, Logo, Screen } from '@/components/ui';
import { colors, theme } from '@/theme/theme';

export default function Sobre() {
  const appVersion = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen variant="admin">
      <Header title="Sobre o app" />
      <View style={styles.card}>
        <Logo size={64} />
        <Text style={styles.name}>Coração Gaúcho</Text>
        <Text style={styles.tagline}>Tradição que nos une</Text>
        <Text style={styles.version}>{`Versão ${appVersion}`}</Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { alignItems: 'center', gap: 8, borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 24 },
  name: { fontFamily: theme.font.semiBold, color: colors.text, fontSize: 18, marginTop: 8 },
  tagline: { fontFamily: theme.font.medium, color: colors.goldAccent, fontSize: 12, letterSpacing: 1 },
  version: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 13, marginTop: 10 }
});
