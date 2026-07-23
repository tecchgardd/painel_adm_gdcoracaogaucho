import { useCallback, useMemo, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { ActionMenu, AppModal, Button, FormField, Header, ListCard, Screen, SearchBar, StatusBadge } from '@/components/ui';
import { useApiQuery } from '@/hooks/useApiQuery';
import { useResponsive } from '@/hooks/useResponsive';
import { buscarEnderecoPorCep } from '@/services/cep.service';
import { createInscricao, listInscricoes, updateInscricao } from '@/services/inscricoes.service';
import { alunoSchema } from '@/validation/schemas';
import { colors } from '@/theme/colors';

const emptyAluno = {
  status: 'PENDENTE',
  jaFoiAluno: false,
  semPar: false,
  inscricaoMultipla: false,
  quantidadeAdicionais: 0,
  adicionais: []
};

export default function Alunos() {
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { numColumns, width } = useResponsive();
  const compact = width < 420;
  const itemWidth = numColumns === 1 ? '100%' : numColumns === 2 ? '48.5%' : '32%';
  const queryAlunos = useCallback(() => listInscricoes(), []);
  const { data, loading, error, refetch } = useApiQuery(queryAlunos, { fallbackData: [] });
  const alunos = useMemo(() => data ?? [], [data]);
  const filtered = useMemo(() => alunos.filter((aluno: any) =>
    `${aluno.nome} ${aluno.cpf} ${aluno.telefone} ${aluno.cursoId} ${aluno.status}`.toLowerCase().includes(query.toLowerCase())
  ), [alunos, query]);
  const participantCount = Math.max(1, 1 + (editing?.inscricaoMultipla ? Number(editing?.quantidadeAdicionais ?? 0) : 0));
  const expectedSponsors = participantCount * 2;

  function patch(key: string, value: any) {
    setEditing((current: any) => ({ ...current, [key]: value }));
  }

  async function patchCep(value: string) {
    patch('cep', value);
    if (value.replace(/\D/g, '').length !== 8) return;
    const address = await buscarEnderecoPorCep(value);
    if (!address) return;
    setEditing((current: any) => ({
      ...current,
      cep: value,
      rua: current?.rua || address.rua,
      bairro: current?.bairro || address.bairro,
      cidade: current?.cidade || address.cidade,
      estado: current?.estado || address.estado
    }));
  }

  function setBoolean(key: string, value: boolean) {
    setEditing((current: any) => ({ ...current, [key]: value }));
  }

  function ensureAdditionalCount(value: string) {
    const count = Math.max(0, Number(value || 0));
    setEditing((current: any) => {
      const adicionais = [...(current.adicionais ?? [])];
      while (adicionais.length < count) adicionais.push({ nome: '', cpf: '', telefone: '', nomePar: '' });
      return { ...current, quantidadeAdicionais: count, adicionais: adicionais.slice(0, count) };
    });
  }

  function ensureSponsors(count: number) {
    setEditing((current: any) => {
      const padrinhos = [...(current.padrinhos ?? [])];
      while (padrinhos.length < count) padrinhos.push({ nome: '' });
      return {
        ...current,
        quantidadeParticipantes: participantCount,
        padrinhos: padrinhos.slice(0, count)
      };
    });
  }

  function patchSponsor(index: number, value: string) {
    setEditing((current: any) => {
      const padrinhos = [...(current.padrinhos ?? [])];
      while (padrinhos.length < expectedSponsors) padrinhos.push({ nome: '' });
      padrinhos[index] = { nome: value };
      return { ...current, padrinhos };
    });
  }

  function patchAdditional(index: number, key: string, value: string) {
    setEditing((current: any) => ({
      ...current,
      adicionais: (current.adicionais ?? []).map((item: any, itemIndex: number) => itemIndex === index ? { ...item, [key]: value } : item)
    }));
  }

  async function save() {
    if (!editing) return;
    setSaving(true);
    setFieldErrors({});
    setErrorForm('');
    const payload = {
      ...editing,
      quantidadeParticipantes: participantCount,
      padrinhos: Array.from({ length: expectedSponsors }, (_, index) => ({ nome: editing.padrinhos?.[index]?.nome ?? '' })),
      adicionais: editing.inscricaoMultipla ? editing.adicionais ?? [] : [],
      quantidadeAdicionais: editing.inscricaoMultipla ? editing.quantidadeAdicionais ?? 0 : 0
    };
    const validation = alunoSchema.safeParse(payload);
    if (!validation.success) {
      const next: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        next[String(issue.path[0] ?? 'form')] = issue.message;
      });
      setFieldErrors(next);
      setSaving(false);
      return;
    }
    try {
      if (editing.id) await updateInscricao(String(editing.id), validation.data as any);
      else await createInscricao(validation.data as any);
      setEditing(null);
      refetch();
    } catch (saveError) {
      setErrorForm((saveError as { message?: string })?.message ?? 'Não foi possível salvar a inscrição.');
    } finally {
      setSaving(false);
    }
  }

  return <Screen variant="admin">
    <Header title="Alunos" right={<TouchableOpacity onPress={() => setEditing(emptyAluno)} style={styles.plus}><MaterialCommunityIcons name="plus" color="#fff" size={24} /></TouchableOpacity>} />
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar alunos" />
    {loading ? <Text style={styles.state}>Carregando alunos...</Text> : null}
    {error ? <TouchableOpacity onPress={refetch} style={styles.errorBox}><Text style={styles.errorText}>{error}</Text><Text style={styles.retry}>Tentar novamente</Text></TouchableOpacity> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((aluno: any) => <View key={aluno.id} style={[styles.row, { width: itemWidth }]}>
        <View style={styles.rowCard}>
          <ListCard title={aluno.nome ?? 'Aluno sem nome'} subtitle={`${aluno.cpf ?? ''}\nCurso/turma: ${aluno.cursoId ?? aluno.courseId ?? '-'}`} status={aluno.status} onPress={() => setSelected(aluno)} />
        </View>
        <ActionMenu actions={[
          { label: 'Ver aluno', icon: 'account-eye-outline', onPress: () => setSelected(aluno) },
          { label: 'Editar aluno', icon: 'pencil-outline', onPress: () => setEditing(aluno) },
          { label: 'Cancelar inscricao', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...aluno, status: 'CANCELADO' }) }
        ]} />
      </View>)}
    </View>}
    {!loading && !error && !filtered.length ? <Text style={styles.state}>Não há dados ainda</Text> : null}

    <AppModal
      visible={!!selected}
      onClose={() => setSelected(null)}
      title="Detalhes do aluno"
      footer={selected ? <Button title="Editar aluno" tone="green" onPress={() => { setEditing(selected); setSelected(null); }} /> : undefined}
    >
      {selected ? <>
        <View style={styles.profileHeader}>
          <View style={styles.avatar}><MaterialCommunityIcons name="account-outline" color={colors.text} size={28} /></View>
          <View style={styles.profileCopy}>
            <Text style={styles.title}>{selected.nome || 'Aluno sem nome'}</Text>
            <Text style={styles.profileHint}>Dados da inscrição</Text>
          </View>
          {selected.status ? <StatusBadge status={selected.status} /> : null}
        </View>
        <View style={styles.detailsCard}>
          <DetailRow icon="card-account-details-outline" label="CPF" value={selected.cpf} />
          <DetailRow icon="phone-outline" label="Telefone" value={selected.telefone} />
          <DetailRow icon="email-outline" label="E-mail" value={selected.email} />
          <DetailRow icon="school-outline" label="Curso / turma" value={selected.cursoId ?? selected.courseId} />
          <DetailRow icon="account-heart-outline" label="Par" value={selected.nomePar ?? selected.par} />
          <DetailRow icon="map-marker-outline" label="Cidade" value={selected.cidade} last />
        </View>
        {selected.adicionais?.length ? <View style={styles.additionalSummary}>
          <MaterialCommunityIcons name="account-multiple-plus-outline" color={colors.red} size={21} />
          <View><Text style={styles.additionalTitle}>Pessoas adicionais</Text><Text style={styles.additionalText}>{selected.adicionais.length} participante(s) nesta inscrição</Text></View>
        </View> : null}
      </> : null}
    </AppModal>

    <AppModal
      visible={!!editing}
      onClose={() => setEditing(null)}
      title={editing?.id ? 'Editar aluno' : 'Novo aluno'}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {editing ? <>
        {errorForm ? <Text style={styles.formError}>{errorForm}</Text> : null}
        <FormField label="Nome completo" value={editing.nome ?? ''} onChangeText={(value) => patch('nome', value)} />
        {fieldErrors.nome ? <Text style={styles.fieldError}>{fieldErrors.nome}</Text> : null}
        <FormField label="CPF" value={editing.cpf ?? ''} onChangeText={(value) => patch('cpf', value)} keyboardType="numeric" placeholder="000.000.000-00" />
        {fieldErrors.cpf ? <Text style={styles.fieldError}>{fieldErrors.cpf}</Text> : null}
        <FormField label="Telefone" value={editing.telefone ?? ''} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" />
        <FormField label="E-mail" value={editing.email ?? ''} onChangeText={(value) => patch('email', value)} keyboardType="email-address" />
        <View style={[styles.inline, compact && styles.stack]}>
          <View style={styles.inlineItem}><FormField label="CEP" value={editing.cep ?? ''} onChangeText={patchCep} keyboardType="numeric" /></View>
          <View style={styles.inlineItem}><FormField label="Estado" value={editing.estado ?? ''} onChangeText={(value) => patch('estado', value)} placeholder="RS" /></View>
        </View>
        <FormField label="Rua" value={editing.rua ?? ''} onChangeText={(value) => patch('rua', value)} />
        <View style={[styles.inline, compact && styles.stack]}>
          <View style={styles.inlineItem}><FormField label="Numero" value={editing.numero ?? ''} onChangeText={(value) => patch('numero', value)} /></View>
          <View style={styles.inlineItem}><FormField label="Bairro" value={editing.bairro ?? ''} onChangeText={(value) => patch('bairro', value)} /></View>
        </View>
        <FormField label="Cidade" value={editing.cidade ?? ''} onChangeText={(value) => patch('cidade', value)} />
        <FormField label="Complemento" value={editing.complemento ?? ''} onChangeText={(value) => patch('complemento', value)} />
        <FormField label="Curso/turma vinculada" value={editing.cursoId ?? editing.courseId ?? ''} onChangeText={(value) => patch('cursoId', value)} />
        {fieldErrors.cursoId ? <Text style={styles.fieldError}>{fieldErrors.cursoId}</Text> : null}
        <ToggleRow label="Ja foi aluno?" value={!!editing.jaFoiAluno} onChange={(value) => setBoolean('jaFoiAluno', value)} />
        {editing.jaFoiAluno ? <FormField label="Qual curso/cidade participou" value={editing.cursoCidadeAnterior ?? ''} onChangeText={(value) => patch('cursoCidadeAnterior', value)} /> : null}
        <ToggleRow label="Não tem par" value={!!editing.semPar} onChange={(value) => setBoolean('semPar', value)} />
        {!editing.semPar ? <FormField label="Nome do par" value={editing.nomePar ?? editing.par ?? ''} onChangeText={(value) => patch('nomePar', value)} /> : null}
        <ToggleRow label="Inscrever mais de uma pessoa" value={!!editing.inscricaoMultipla} onChange={(value) => setBoolean('inscricaoMultipla', value)} />
        {editing.inscricaoMultipla ? <>
          <FormField label="Quantidade de pessoas adicionais" value={String(editing.quantidadeAdicionais ?? 0)} onChangeText={ensureAdditionalCount} keyboardType="numeric" />
          {(editing.adicionais ?? []).map((adicional: any, index: number) => <View key={index} style={styles.additionalCard}>
            <Text style={styles.section}>Pessoa adicional {index + 1}</Text>
            <FormField label="Nome completo" value={adicional.nome ?? ''} onChangeText={(value) => patchAdditional(index, 'nome', value)} />
            <FormField label="CPF" value={adicional.cpf ?? ''} onChangeText={(value) => patchAdditional(index, 'cpf', value)} keyboardType="numeric" />
            <FormField label="Telefone" value={adicional.telefone ?? ''} onChangeText={(value) => patchAdditional(index, 'telefone', value)} keyboardType="phone-pad" />
            <FormField label="Nome do par" value={adicional.nomePar ?? ''} onChangeText={(value) => patchAdditional(index, 'nomePar', value)} />
          </View>)}
        </> : null}
        <View style={styles.sponsorHeader}>
          <Text style={styles.section}>Padrinhos</Text>
          <Text style={styles.sponsorHint}>{expectedSponsors} esperados para {participantCount} participante(s)</Text>
        </View>
        {Array.from({ length: expectedSponsors }, (_, index) => (
          <FormField
            key={`padrinho-${index}`}
            label={`Padrinho ${index + 1}`}
            value={editing.padrinhos?.[index]?.nome ?? ''}
            onFocus={() => ensureSponsors(expectedSponsors)}
            onChangeText={(value) => patchSponsor(index, value)}
            placeholder="Nome opcional"
          />
        ))}
        <StatusPicker value={editing.status ?? 'PENDENTE'} onChange={(value) => patch('status', value)} />
        {Object.values(fieldErrors).length ? <Text style={styles.fieldError}>Revise os campos destacados antes de salvar.</Text> : null}
      </> : null}
    </AppModal>
  </Screen>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <View style={styles.options}>
      {[true, false].map((option) => <TouchableOpacity key={String(option)} style={[styles.option, value === option && styles.optionActive]} onPress={() => onChange(option)}>
        <Text style={[styles.optionText, value === option && styles.optionTextActive]}>{option ? 'Sim' : 'Não'}</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}

function DetailRow({ icon, label, value, last = false }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value?: unknown; last?: boolean }) {
  return <View style={[styles.detailRow, last && styles.detailRowLast]}>
    <View style={styles.detailIcon}><MaterialCommunityIcons name={icon} color={colors.red} size={20} /></View>
    <View style={styles.detailCopy}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text selectable style={styles.detailValue}>{value === undefined || value === null || value === '' ? 'Não informado' : String(value)}</Text>
    </View>
  </View>;
}

function StatusPicker({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>Status da inscricao</Text>
    <View style={styles.options}>
      {['PENDENTE', 'CONFIRMADO', 'CANCELADO', 'ATIVO'].map((status) => <TouchableOpacity key={status} style={[styles.option, value === status && styles.optionActive]} onPress={() => onChange(status)}>
        <Text style={[styles.optionText, value === status && styles.optionTextActive]}>{status}</Text>
      </TouchableOpacity>)}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  plus: { backgroundColor: colors.red, width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  rowCard: { flex: 1 },
  state: { color: colors.muted, fontWeight: '800', marginTop: 8 },
  errorBox: { borderRadius: 14, borderWidth: 1, borderColor: '#5A2A2A', backgroundColor: '#241414', padding: 12, marginBottom: 12 },
  errorText: { color: colors.muted, lineHeight: 20 },
  retry: { color: colors.red, fontWeight: '900', marginTop: 8 },
  profileHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar: { width: 52, height: 52, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  profileCopy: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 20, lineHeight: 25, fontWeight: '900' },
  profileHint: { color: colors.muted, fontSize: 12, marginTop: 3 },
  detailsCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, paddingHorizontal: 14 },
  detailRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRowLast: { borderBottomWidth: 0 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1717' },
  detailCopy: { flex: 1, minWidth: 0, paddingVertical: 10 },
  detailLabel: { color: colors.muted, fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 15, fontWeight: '800', marginTop: 3 },
  additionalSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12 },
  additionalTitle: { color: colors.text, fontWeight: '900' },
  additionalText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  section: { color: colors.text, fontWeight: '900', marginTop: 12 },
  inline: { flexDirection: 'row', gap: 10 },
  stack: { flexDirection: 'column' },
  inlineItem: { flex: 1 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  formError: { color: colors.red, fontWeight: '800', marginBottom: 8 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 5 },
  toggleRow: { marginTop: 14 },
  toggleLabel: { color: colors.text, fontSize: 13, fontWeight: '800', marginBottom: 8 },
  options: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  option: { minHeight: 38, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  optionActive: { backgroundColor: colors.red, borderColor: colors.red },
  optionText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  optionTextActive: { color: '#fff' },
  additionalCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 12 }
  ,
  sponsorHeader: { marginTop: 8 },
  sponsorHint: { color: colors.muted, fontSize: 12, fontWeight: '700', marginTop: 4 }
});
