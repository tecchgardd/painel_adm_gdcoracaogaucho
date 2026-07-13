import { Text } from 'react-native';
import { Header, Screen } from '@/components/ui';
import { colors } from '@/theme/colors';

export default function Configuracoes() {
  return <Screen variant="admin">
    <Header title="Configurações" />
    <Text style={{ color: colors.muted, fontWeight: '800' }}>Nenhum endpoint de configurações foi disponibilizado pela API.</Text>
  </Screen>;
}

