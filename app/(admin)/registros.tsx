import { useCallback, useEffect, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { listRegistros } from '@/features/registros/services/registros.service';
import type { RegistroAcao, RegistroAtividade } from '@/features/registros/types';
import { ACAO_INFO, agruparPorDia, campoLabel, entidadeLabel, formatValorAlteracao, registroFrase } from '@/features/registros/utils/registroLabels';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { AppModal, Avatar, FilterBar, Header, InfoList, InfoRow, Pagination, Screen } from '@/shared/components/ui';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { formatDateTime } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';

const ACAO_FILTROS: { value: string; label: string; acoes?: RegistroAcao[] }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'CRIAR', label: 'Criações', acoes: ['CRIAR'] },
  { value: 'ALTERAR', label: 'Alterações', acoes: ['ATUALIZAR', 'STATUS'] },
  { value: 'EXCLUIR', label: 'Exclusões', acoes: ['EXCLUIR'] },
  { value: 'FINANCEIRO', label: 'Financeiro', acoes: ['PAGAMENTO', 'REEMBOLSO'] },
  { value: 'ACESSO', label: 'Acessos', acoes: ['LOGIN', 'LOGIN_FALHOU', 'LOGOUT', 'SENHA'] }
];

const PERIODOS: { value: string; label: string; dias?: number }[] = [
  { value: 'HOJE', label: 'Hoje', dias: 0 },
  { value: '7', label: '7 dias', dias: 7 },
  { value: '30', label: '30 dias', dias: 30 },
  { value: 'TUDO', label: 'Tudo' }
];

const TONE: Record<string, { fg: string; bg: string }> = {
  green: { fg: '#4CB85C', bg: colors.greenSoft },
  blue: { fg: '#5B9FE0', bg: colors.blueSoft },
  red: { fg: colors.red, bg: colors.redSoft },
  yellow: { fg: colors.yellow, bg: colors.yellowSoft },
  neutral: { fg: colors.muted, bg: 'rgba(155, 157, 166, 0.12)' }
};

function inicioDoPeriodo(dias?: number) {
  if (dias === undefined) return undefined;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - dias).toISOString();
}

function hora(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

export default function Registros() {
  const [busca, setBusca] = useState('');
  const [search, setSearch] = useState('');
  const [acaoFiltro, setAcaoFiltro] = useState('TODAS');
  const [periodo, setPeriodo] = useState('7');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<RegistroAtividade | null>(null);

  // Busca com atraso para não consultar a API a cada tecla.
  useEffect(() => {
    const timer = setTimeout(() => { setSearch(busca.trim()); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const filtros = useMemo(() => ({
    page,
    search: search || undefined,
    acao: ACAO_FILTROS.find((item) => item.value === acaoFiltro)?.acoes,
    dataInicial: inicioDoPeriodo(PERIODOS.find((item) => item.value === periodo)?.dias)
  }), [acaoFiltro, page, periodo, search]);
  const query = useCallback(() => listRegistros(filtros), [filtros]);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: null });
  const registros = useMemo(() => data?.data ?? [], [data]);
  const grupos = useMemo(() => agruparPorDia(registros), [registros]);
  const totalPages = Math.max(1, Math.ceil((data?.total ?? 0) / (data?.limit ?? 30)));

  return <Screen variant="admin">
    <Header title="Registro de atividades" subtitle="Quem fez o quê, e quando, na plataforma." />
    <FilterBar
      search={{ value: busca, onChange: setBusca, placeholder: 'Buscar por pessoa, área ou código' }}
      filters={[
        { key: 'acao', label: 'Ação', value: acaoFiltro, allValue: 'TODAS', options: ACAO_FILTROS.map(({ value, label }) => ({ value, label })), onChange: (value) => { setAcaoFiltro(value); setPage(1); } },
        { key: 'periodo', label: 'Período', value: periodo, allValue: '7', options: PERIODOS.map(({ value, label }) => ({ value, label })), onChange: (value) => { setPeriodo(value); setPage(1); } }
      ]}
    />

    {loading && !data ? <LoadingState label="Carregando registros..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {data?.indisponivel ? <EmptyState icon="clipboard-text-clock-outline" title="Registro ainda não disponível" subtitle="A API ainda não expõe o histórico de ações. Assim que o backend for atualizado, as atividades aparecem aqui." /> : null}
    {!loading && !error && data && !data.indisponivel && !registros.length ? <EmptyState icon="clipboard-text-search-outline" title="Nenhuma atividade encontrada" subtitle="Ajuste a busca, o tipo de ação ou o período." /> : null}

    {grupos.map((grupo) => <View key={grupo.dia} style={styles.group}>
      <Text style={styles.groupTitle}>{grupo.dia}</Text>
      <View style={styles.list}>
        {grupo.itens.map((registro, index) => <RegistroRow key={registro.id || index} registro={registro} last={index === grupo.itens.length - 1} onPress={() => setSelected(registro)} />)}
      </View>
    </View>)}

    {registros.length ? <Pagination page={page} totalPages={totalPages} total={data?.total} onChange={setPage} /> : null}

    <AppModal visible={!!selected} onClose={() => setSelected(null)} title="Detalhe da atividade" subtitle={selected ? formatDateTime(selected.createdAt) : undefined}>
      {selected ? <RegistroDetalhe registro={selected} /> : null}
    </AppModal>
  </Screen>;
}

function AutorAvatar({ registro, size }: { registro: RegistroAtividade; size: number }) {
  if (registro.autor?.fotoUrl) return <Image source={{ uri: registro.autor.fotoUrl }} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.card }} />;
  if (!registro.autor) return <View style={[styles.systemAvatar, { width: size, height: size, borderRadius: size / 2 }]}><MaterialCommunityIcons name="robot-outline" size={size * 0.5} color={colors.muted} /></View>;
  return <Avatar name={registro.autor.nome} size={size} />;
}

function RegistroRow({ registro, last, onPress }: { registro: RegistroAtividade; last: boolean; onPress: () => void }) {
  const info = ACAO_INFO[registro.acao];
  const tone = TONE[info.tone];
  return <Pressable
    onPress={onPress}
    accessibilityRole="button"
    accessibilityLabel={registroFrase(registro)}
    style={(state) => [styles.row, !last && styles.rowDivider, (state as { hovered?: boolean }).hovered && styles.rowHover]}
  >
    <View>
      <AutorAvatar registro={registro} size={38} />
      <View style={[styles.actionBadge, { backgroundColor: tone.bg }]}><MaterialCommunityIcons name={info.icon} size={12} color={tone.fg} /></View>
    </View>
    <View style={styles.rowCopy}>
      <Text numberOfLines={2} style={styles.rowTitle}>{registroFrase(registro)}</Text>
      {registro.descricao ? <Text numberOfLines={1} style={styles.rowDescription}>{registro.descricao}</Text> : null}
    </View>
    <View style={styles.rowMeta}>
      <Text style={styles.rowTime}>{hora(registro.createdAt)}</Text>
      <Text numberOfLines={1} style={[styles.rowTag, { color: tone.fg }]}>{info.label}</Text>
    </View>
  </Pressable>;
}

function RegistroDetalhe({ registro }: { registro: RegistroAtividade }) {
  const info = ACAO_INFO[registro.acao];
  return <>
    <View style={styles.detailHeader}>
      <AutorAvatar registro={registro} size={48} />
      <View style={styles.rowCopy}>
        <Text style={styles.detailTitle}>{registroFrase(registro)}</Text>
        {registro.descricao ? <Text style={styles.rowDescription}>{registro.descricao}</Text> : null}
      </View>
    </View>
    <InfoList>
      <InfoRow label="Quem" value={registro.autor ? [registro.autor.nome, registro.autor.username ? `@${registro.autor.username}` : registro.autor.email].filter(Boolean).join(' · ') : 'Sistema (automático)'} />
      <InfoRow label="Quando" value={formatDateTime(registro.createdAt)} />
      <InfoRow label="Ação" value={info.label} />
      <InfoRow label="Área" value={entidadeLabel(registro.entidade).replace(/^./, (c) => c.toUpperCase())} />
      {registro.entidadeId ? <InfoRow label="Registro afetado" value={`#${registro.entidadeId}`} /> : null}
      {registro.ip ? <InfoRow label="IP" value={registro.ip} /> : null}
      {registro.userAgent ? <InfoRow label="Dispositivo" value={registro.userAgent} /> : null}
    </InfoList>
    {registro.alteracoes.length ? <>
      <Text style={styles.changesTitle}>O que mudou</Text>
      <View style={styles.changes}>
        {registro.alteracoes.map((alteracao, index) => <View key={`${alteracao.campo}-${index}`} style={[styles.change, index > 0 && styles.changeDivider]}>
          <Text style={styles.changeField}>{campoLabel(alteracao.campo)}</Text>
          <View style={styles.changeValues}>
            <Text selectable style={styles.changeBefore}>{formatValorAlteracao(alteracao.antes)}</Text>
            <MaterialCommunityIcons name="arrow-right" size={14} color={colors.subtle} />
            <Text selectable style={styles.changeAfter}>{formatValorAlteracao(alteracao.depois)}</Text>
          </View>
        </View>)}
      </View>
    </> : null}
  </>;
}

const webCursor = Platform.OS === 'web' ? ({ cursor: 'pointer' } as any) : null;

const styles = StyleSheet.create({
  group: { marginTop: 10 },
  groupTitle: { color: colors.muted, fontSize: 13, fontFamily: theme.font.semiBold, marginBottom: 8 },
  list: { borderRadius: theme.radius.lg, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 12, ...webCursor },
  rowDivider: { borderBottomWidth: 1, borderBottomColor: colors.borderSoft },
  rowHover: { backgroundColor: colors.cardAlt },
  actionBadge: { position: 'absolute', right: -4, bottom: -4, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.dark },
  systemAvatar: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.text, fontSize: 14, lineHeight: 20, fontFamily: theme.font.medium },
  rowDescription: { color: colors.subtle, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 2 },
  rowMeta: { alignItems: 'flex-end', gap: 4, maxWidth: 110 },
  rowTime: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  rowTag: { fontSize: 11, fontFamily: theme.font.medium },
  detailHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  detailTitle: { color: colors.text, fontSize: 16, lineHeight: 22, fontFamily: theme.font.semiBold },
  changesTitle: { color: colors.subtle, fontSize: 11, fontFamily: theme.font.medium, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 18, marginBottom: 8 },
  changes: { borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardAlt, paddingHorizontal: 14 },
  change: { paddingVertical: 10, gap: 4 },
  changeDivider: { borderTopWidth: 1, borderTopColor: colors.borderSoft },
  changeField: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  changeValues: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  changeBefore: { color: colors.subtle, fontSize: 13, fontFamily: theme.font.regular, textDecorationLine: 'line-through' },
  changeAfter: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium }
});
