import { useCallback, useEffect, useMemo, useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { ActionMenu, AppModal, Button, ChoiceGroup, FilterBar, FloatingActionButton, FormField, FormRow, FormSection, Header, ListCard, Screen, StatusBadge } from '@/shared/components/ui';
import { getCustomer } from '@/features/clientes/services/customers.service';
import { listEventos } from '@/features/eventos/services/eventos.service';
import { findPersonByCpf } from '@/features/pessoas/services/people.service';
import { formatDateTime, maskCpf } from '@/shared/utils/format';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { buscarEnderecoPorCep } from '@/shared/services/cep.service';
import { createInscricao, listInscricoes, updateInscricao } from '@/features/alunos/services/inscricoes.service';
import { alunoSchema } from '@/validation/schemas';
import { ExportButton, ExportModal } from '@/shared/components/ui/ExportModal';
import { usePeriodoFiltro } from '@/shared/components/ui/PeriodoFiltro';
import { INSCRICAO_COLUMNS } from '@/features/alunos/utils/inscricaoExport';
import { dentroDoIntervalo, ordenar, ORDENACAO_OPTIONS, type Ordenacao } from '@/shared/utils/listaAvancada';
import { matchSituacao } from '@/shared/utils/situacao';
import { colors, theme } from '@/theme/theme';
import { usePode } from '@/stores/auth.store';

const emptyAluno = {
  status: 'PENDENTE',
  jaFoiAluno: false,
  semPar: false,
  inscricaoMultipla: false,
  quantidadeAdicionais: 0,
  adicionais: []
};

const STATUS_OPTIONS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'PENDENTE', label: 'Pendentes' },
  { value: 'CONFIRMADO', label: 'Confirmadas' },
  { value: 'ATIVO', label: 'Ativas' },
  { value: 'CANCELADO', label: 'Canceladas' }
];

/** Campos da pessoa que pré-preenchem a inscrição (vindos de Pessoas ou da busca por CPF). */
function dadosDaPessoa(pessoa: any) {
  return {
    customerId: pessoa?.id != null ? String(pessoa.id) : undefined,
    nome: pessoa?.nome ?? pessoa?.name ?? '',
    cpf: pessoa?.cpf ?? '',
    telefone: pessoa?.telefone ?? pessoa?.phone ?? '',
    email: pessoa?.email ?? '',
    cep: pessoa?.cep ?? '',
    rua: pessoa?.rua ?? '',
    numero: pessoa?.numero ?? '',
    bairro: pessoa?.bairro ?? '',
    cidade: pessoa?.cidade ?? '',
    estado: pessoa?.estado ?? '',
    complemento: pessoa?.complemento ?? ''
  };
}

export default function Alunos() {
  const params = useLocalSearchParams<{ pessoa?: string }>();
  const [statusFilter, setStatusFilter] = useState('TODOS');
  const [cursoFilter, setCursoFilter] = useState('TODOS');
  const [pessoaHint, setPessoaHint] = useState('');
  const queryCursos = useCallback(() => listEventos({ status: 'ATIVO' }), []);
  const { data: eventosData } = useApiQuery(queryCursos, { fallbackData: [] });
  const cursos = useMemo(() => (eventosData ?? []).filter((evento: any) => evento.tipo === 'CURSO'), [eventosData]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<any>(null);
  const [editing, setEditing] = useState<any>(null);
  const podeCriar = usePode('inscricoes.criar');
  const podeEditar = usePode('inscricoes.editar');
  const podeExportar = usePode('inscricoes.exportar');
  const [saving, setSaving] = useState(false);
  const [errorForm, setErrorForm] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);
  const queryAlunos = useCallback(() => listInscricoes(), []);
  const { data, loading, error, refetch } = useApiQuery(queryAlunos, { fallbackData: [] });
  const alunos = useMemo(() => data ?? [], [data]);
  const [ordenacao, setOrdenacao] = useState<Ordenacao>('RECENTES');
  const [exportando, setExportando] = useState(false);
  const periodo = usePeriodoFiltro('Inscrição');
  const intervalo = periodo.intervalo;
  // Turmas: cursos ativos + cursos que aparecem nas inscrições (turmas já encerradas continuam filtráveis).
  const turmas = useMemo(() => {
    const mapa = new Map<string, string>();
    cursos.forEach((curso: any) => mapa.set(String(curso.id), curso.nome));
    alunos.forEach((aluno: any) => { if (aluno.cursoId && !mapa.has(String(aluno.cursoId))) mapa.set(String(aluno.cursoId), aluno.courseId || `Curso ${aluno.cursoId}`); });
    return [...mapa].map(([value, label]) => ({ value, label })).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [alunos, cursos]);
  const filtered = useMemo(() => {
    const termo = query.trim().toLowerCase();
    const visiveis = alunos.filter((aluno: any) =>
      matchSituacao(aluno.status, statusFilter)
      && (cursoFilter === 'TODOS' || String(aluno.cursoId) === cursoFilter)
      && dentroDoIntervalo(aluno.createdAt, intervalo)
      && (!termo || `${aluno.nome} ${aluno.cpf} ${aluno.telefone} ${aluno.email ?? ''} ${aluno.courseId ?? ''} ${aluno.nomePar ?? ''} ${(aluno.padrinhos ?? []).map((padrinho: any) => padrinho?.nome ?? '').join(' ')}`.toLowerCase().includes(termo))
    );
    return ordenar(visiveis, ordenacao, { criado: (aluno: any) => aluno.createdAt, modificado: (aluno: any) => aluno.updatedAt, nome: (aluno: any) => aluno.nome ?? '' });
  }, [alunos, cursoFilter, intervalo, ordenacao, query, statusFilter]);
  const descricaoFiltros = [
    cursoFilter !== 'TODOS' ? `Turma: ${turmas.find((turma) => turma.value === cursoFilter)?.label ?? cursoFilter}` : '',
    statusFilter !== 'TODOS' ? `Status: ${STATUS_OPTIONS.find((option) => option.value === statusFilter)?.label}` : '',
    periodo.descricao ? `Inscrição: ${periodo.descricao}` : '',
    query.trim() ? `Busca: "${query.trim()}"` : '',
    `Ordem: ${ORDENACAO_OPTIONS.find((option) => option.value === ordenacao)?.label}`
  ].filter(Boolean).join(' · ');

  // Veio da ficha da pessoa ("Inscrever em curso"): abre a inscrição já preenchida com o cadastro dela.
  useEffect(() => {
    if (!params.pessoa || !podeCriar) return;
    let active = true;
    getCustomer(String(params.pessoa)).then((pessoa) => {
      if (!active) return;
      setEditing({ ...emptyAluno, ...dadosDaPessoa(pessoa) });
      setPessoaHint(`Inscrição para ${pessoa?.nome ?? pessoa?.name ?? 'pessoa cadastrada'}: dados preenchidos a partir do cadastro.`);
      router.setParams({ pessoa: undefined });
    }).catch(() => undefined);
    return () => { active = false; };
  }, [params.pessoa, podeCriar]);

  // Nova inscrição: ao informar o CPF, reaproveita o cadastro existente em vez de criar outro.
  async function lookupCpf() {
    if (!editing || editing.id || editing.customerId || String(editing.cpf ?? '').replace(/\D/g, '').length !== 11) return;
    try {
      const result = await findPersonByCpf(editing.cpf);
      if (!result.success || !result.data?.id) return;
      const pessoa = await getCustomer(String(result.data.id)).catch(() => result.data);
      setEditing((current: any) => {
        const dados = dadosDaPessoa(pessoa);
        const preenchido = Object.fromEntries(Object.entries(dados).map(([key, value]) => [key, current?.[key] || value]));
        return { ...current, ...preenchido, customerId: dados.customerId };
      });
      setPessoaHint(`CPF já cadastrado: ${result.data.nome ?? 'pessoa encontrada'}. Os dados foram preenchidos a partir do cadastro.`);
    } catch {
      // Sem a busca, a inscrição segue normal e a API associa pelo CPF.
    }
  }
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
    <Header title="Inscrições" subtitle="Alunos inscritos nos cursos, com par, padrinhos e situação. O cadastro da pessoa fica em Cadastros → Pessoas." right={podeCriar ? <FloatingActionButton onPress={() => { setPessoaHint(''); setEditing(emptyAluno); }} accessibilityLabel="Nova inscrição" /> : undefined} />
    <FilterBar
      search={{ value: query, onChange: setQuery, placeholder: 'Buscar por aluno, CPF, par, padrinho ou curso' }}
      filters={[
        ...(turmas.length ? [{ key: 'curso', label: 'Turma', value: cursoFilter, allValue: 'TODOS', options: [{ value: 'TODOS', label: 'Todas' }, ...turmas], onChange: setCursoFilter }] : []),
        { key: 'status', label: 'Status', value: statusFilter, allValue: 'TODOS', options: STATUS_OPTIONS, onChange: setStatusFilter },
        periodo.filter,
        { key: 'ordem', label: 'Ordenar', value: ordenacao, allValue: 'RECENTES', options: ORDENACAO_OPTIONS, onChange: (value) => setOrdenacao(value as Ordenacao) }
      ]}
      right={podeExportar ? <ExportButton onPress={() => setExportando(true)} /> : undefined}
    />
    {!loading && !error && alunos.length ? <Text style={styles.resultCount}>{filtered.length === alunos.length ? `${alunos.length} inscrição(ões)` : `${filtered.length} de ${alunos.length} inscrição(ões)`}</Text> : null}
    {loading ? <LoadingState label="Carregando inscrições..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!error && <View style={styles.grid}>
      {filtered.map((aluno: any) => <View key={aluno.id} style={gridCell}>
        <ListCard title={aluno.nome ?? 'Aluno sem nome'} subtitle={`${aluno.cpf ? maskCpf(aluno.cpf) : 'CPF não informado'}${aluno.telefone ? ` · ${aluno.telefone}` : ''}\n${aluno.courseId || 'Curso não informado'}${aluno.createdAt ? ` · inscrita em ${formatDateTime(aluno.createdAt)}` : ''}`} status={aluno.status} onPress={() => setSelected(aluno)}
            actions={<ActionMenu variant="ghost" actions={[
          { label: 'Ver inscrição', icon: 'account-eye-outline', onPress: () => setSelected(aluno) },
          ...(podeEditar ? [{ label: 'Editar inscrição', icon: 'pencil-outline' as const, onPress: () => { setPessoaHint(''); setEditing(aluno); } }] : []),
          { label: 'Cancelar inscrição', icon: 'close-circle-outline', tone: 'danger', onPress: () => setEditing({ ...aluno, status: 'CANCELADO' }) }
        ]} />}
          />
      </View>)}
    </View>}
    {!loading && !error && !filtered.length ? <EmptyState title="Nenhuma inscrição encontrada" icon="school-outline" /> : null}
    {periodo.modal}
    <ExportModal visible={exportando} onClose={() => setExportando(false)} titulo="Inscrições" subtitulo={descricaoFiltros} columns={INSCRICAO_COLUMNS} rows={filtered} />

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
          <DetailRow icon="map-marker-outline" label="Cidade" value={selected.cidade} />
          <DetailRow icon="account-group-outline" label="Padrinhos" value={(selected.padrinhos ?? []).map((padrinho: any) => padrinho?.nome).filter(Boolean).join(', ')} />
          <DetailRow icon="calendar-plus" label="Inscrição feita em" value={selected.createdAt ? formatDateTime(selected.createdAt) : undefined} />
          <DetailRow icon="calendar-edit" label="Última modificação" value={selected.updatedAt ? formatDateTime(selected.updatedAt) : undefined} last />
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
      title={editing?.id ? 'Editar inscrição' : 'Nova inscrição'}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={() => setEditing(null)} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {editing ? <>
        {errorForm ? <Text style={styles.formError}>{errorForm}</Text> : null}
        {pessoaHint ? <Text style={styles.pessoaHint}>{pessoaHint}</Text> : null}
        <FormSection first title="Dados pessoais">
          <FormField required label="Nome completo" value={editing.nome ?? ''} onChangeText={(value) => patch('nome', value)} placeholder="Nome e sobrenome" error={fieldErrors.nome} />
          <FormRow>
            <FormField required label="CPF" onBlur={lookupCpf} value={editing.cpf ?? ''} onChangeText={(value) => setEditing((current: any) => ({ ...current, cpf: value, customerId: current?.id ? current.customerId : undefined }))} keyboardType="numeric" placeholder="000.000.000-00" error={fieldErrors.cpf} />
            <FormField label="Telefone" value={editing.telefone ?? ''} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" placeholder="(51) 99999-9999" />
          </FormRow>
          <FormField label="E-mail" value={editing.email ?? ''} onChangeText={(value) => patch('email', value)} keyboardType="email-address" placeholder="nome@email.com" autoCapitalize="none" />
        </FormSection>

        <FormSection title="Endereço" description="Ao informar o CEP, rua, bairro, cidade e estado são preenchidos automaticamente.">
          <FormRow>
            <FormField label="CEP" value={editing.cep ?? ''} onChangeText={patchCep} keyboardType="numeric" placeholder="00000-000" />
            <FormField label="Estado" value={editing.estado ?? ''} onChangeText={(value) => patch('estado', value)} placeholder="RS" />
          </FormRow>
          <FormField label="Rua" value={editing.rua ?? ''} onChangeText={(value) => patch('rua', value)} />
          <FormRow>
            <FormField label="Número" value={editing.numero ?? ''} onChangeText={(value) => patch('numero', value)} />
            <FormField label="Bairro" value={editing.bairro ?? ''} onChangeText={(value) => patch('bairro', value)} />
          </FormRow>
          <FormRow>
            <FormField label="Cidade" value={editing.cidade ?? ''} onChangeText={(value) => patch('cidade', value)} />
            <FormField label="Complemento" value={editing.complemento ?? ''} onChangeText={(value) => patch('complemento', value)} placeholder="Apto, bloco..." />
          </FormRow>
        </FormSection>

        <FormSection title="Curso">
          {cursos.length ? <View style={styles.toggleRow}>
            <Text style={styles.toggleLabel}>Curso / turma <Text style={styles.required}>*</Text></Text>
            <ChoiceGroup options={cursos.map((curso: any) => ({ value: String(curso.id), label: curso.nome }))} value={String(editing.cursoId ?? '')} onChange={(value) => patch('cursoId', value)} />
            {fieldErrors.cursoId ? <Text style={styles.formError}>Escolha o curso.</Text> : null}
          </View> : <FormField required label="Curso/turma vinculada" value={editing.cursoId ?? editing.courseId ?? ''} onChangeText={(value) => patch('cursoId', value)} hint="Nenhum curso ativo encontrado: informe o código do curso." error={fieldErrors.cursoId} />}
          <ToggleRow label="Já foi aluno?" value={!!editing.jaFoiAluno} onChange={(value) => setBoolean('jaFoiAluno', value)} />
          {editing.jaFoiAluno ? <FormField label="Qual curso/cidade participou" value={editing.cursoCidadeAnterior ?? ''} onChangeText={(value) => patch('cursoCidadeAnterior', value)} /> : null}
        </FormSection>

        <FormSection title="Par e acompanhantes">
          <ToggleRow label="Não tem par" value={!!editing.semPar} onChange={(value) => setBoolean('semPar', value)} />
          {!editing.semPar ? <FormField label="Nome do par" value={editing.nomePar ?? editing.par ?? ''} onChangeText={(value) => patch('nomePar', value)} /> : null}
          <ToggleRow label="Inscrever mais de uma pessoa" value={!!editing.inscricaoMultipla} onChange={(value) => setBoolean('inscricaoMultipla', value)} />
          {editing.inscricaoMultipla ? <>
            <FormField label="Quantidade de pessoas adicionais" value={String(editing.quantidadeAdicionais ?? 0)} onChangeText={ensureAdditionalCount} keyboardType="numeric" />
            {(editing.adicionais ?? []).map((adicional: any, index: number) => <View key={index} style={styles.additionalCard}>
              <Text style={styles.additionalTitle}>Pessoa adicional {index + 1}</Text>
              <FormField label="Nome completo" value={adicional.nome ?? ''} onChangeText={(value) => patchAdditional(index, 'nome', value)} />
              <FormRow>
                <FormField label="CPF" value={adicional.cpf ?? ''} onChangeText={(value) => patchAdditional(index, 'cpf', value)} keyboardType="numeric" placeholder="000.000.000-00" />
                <FormField label="Telefone" value={adicional.telefone ?? ''} onChangeText={(value) => patchAdditional(index, 'telefone', value)} keyboardType="phone-pad" />
              </FormRow>
              <FormField label="Nome do par" value={adicional.nomePar ?? ''} onChangeText={(value) => patchAdditional(index, 'nomePar', value)} />
            </View>)}
          </> : null}
        </FormSection>

        <FormSection title="Padrinhos" description={`${expectedSponsors} esperado(s) para ${participantCount} participante(s). Opcional.`}>
          {Array.from({ length: expectedSponsors }, (_, index) => (
            <FormField
              key={`padrinho-${index}`}
              label={`Padrinho ${index + 1}`}
              value={editing.padrinhos?.[index]?.nome ?? ''}
              onFocus={() => ensureSponsors(expectedSponsors)}
              onChangeText={(value) => patchSponsor(index, value)}
              placeholder="Nome do padrinho"
            />
          ))}
        </FormSection>

        <FormSection title="Status">
          <StatusPicker value={editing.status ?? 'PENDENTE'} onChange={(value) => patch('status', value)} />
        </FormSection>
        {Object.values(fieldErrors).length ? <Text style={styles.formError}>Revise os campos destacados antes de salvar.</Text> : null}
      </> : null}
    </AppModal>
  </Screen>;
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (value: boolean) => void }) {
  return <View style={styles.toggleRow}>
    <Text style={styles.toggleLabel}>{label}</Text>
    <ChoiceGroup
      options={[{ value: 'SIM', label: 'Sim' }, { value: 'NAO', label: 'Não' }]}
      value={value ? 'SIM' : 'NAO'}
      onChange={(next) => onChange(next === 'SIM')}
    />
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
    <Text style={styles.toggleLabel}>Status da inscrição</Text>
    <ChoiceGroup
      options={[['PENDENTE', 'Pendente'], ['CONFIRMADO', 'Confirmado'], ['CANCELADO', 'Cancelado'], ['ATIVO', 'Ativo']].map(([status, label]) => ({ value: status, label }))}
      value={value}
      onChange={onChange}
    />
  </View>;
}

const styles = StyleSheet.create({
  grid: gridContainer,
  resultCount: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginTop: -6, marginBottom: 12 },
  profileHeader: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 12, marginBottom: 18 },
  avatar: { width: 52, height: 52, flexShrink: 0, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  profileCopy: { flex: 1, minWidth: 0 },
  title: { color: '#fff', fontSize: 20, lineHeight: 25, fontFamily: theme.font.bold },
  profileHint: { color: colors.muted, fontSize: 12, marginTop: 3 },
  detailsCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, paddingHorizontal: 14 },
  detailRow: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  detailRowLast: { borderBottomWidth: 0 },
  detailIcon: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#2A1717' },
  detailCopy: { flex: 1, minWidth: 0, paddingVertical: 10 },
  detailLabel: { color: colors.muted, fontSize: 11, fontFamily: theme.font.semiBold, textTransform: 'uppercase' },
  detailValue: { color: colors.text, fontSize: 15, fontFamily: theme.font.semiBold, marginTop: 3 },
  additionalSummary: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, borderColor: colors.border, padding: 14, marginTop: 12 },
  additionalTitle: { color: colors.text, fontFamily: theme.font.bold },
  additionalText: { color: colors.muted, fontSize: 12, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  formError: { color: colors.red, fontFamily: theme.font.semiBold, marginBottom: 8 },
  toggleRow: { marginTop: 14 },
  required: { color: colors.red },
  pessoaHint: { color: colors.text, fontSize: 13, lineHeight: 19, fontFamily: theme.font.regular, backgroundColor: colors.blueSoft, borderRadius: theme.radius.md, padding: 12, marginBottom: 6 },
  toggleLabel: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium, marginBottom: 8 },
  additionalCard: { borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 12 },
});
