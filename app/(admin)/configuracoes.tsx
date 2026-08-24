import { Header, Screen } from '@/shared/components/ui';
import { EmptyState } from '@/shared/components/feedback/EmptyState';

export default function Configuracoes() {
  return <Screen variant="admin">
    <Header title="Configurações" />
    <EmptyState title="Nenhuma configuração disponível" subtitle="Nenhum endpoint de configurações foi disponibilizado pela API." icon="cog-outline" />
  </Screen>;
}
