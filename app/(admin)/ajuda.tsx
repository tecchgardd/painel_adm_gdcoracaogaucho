import { StyleSheet, Text, View } from 'react-native';

import { Header, Screen } from '@/components/ui';
import { colors, theme } from '@/theme/theme';

export default function Ajuda() {
  return (
    <Screen variant="admin">
      <Header title="Ajuda" />
      <View style={styles.card}>
        <Text style={styles.text}>
          Precisa de suporte para usar o painel administrativo? Entre em contato com um
          administrador do Coração Gaúcho para tirar dúvidas ou reportar problemas.
        </Text>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 16 },
  text: { fontFamily: theme.font.regular, color: colors.muted, fontSize: 14, lineHeight: 21 }
});
