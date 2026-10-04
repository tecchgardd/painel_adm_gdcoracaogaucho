import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { PessoaFichaModal } from '@/features/clientes/components/PessoaFichaModal';
import { PessoaFormModal } from '@/features/clientes/components/PessoaFormModal';
import { listCustomers, type CustomerFilters } from '@/features/clientes/services/customers.service';
import { normalizePessoa, type PessoaView } from '@/features/clientes/utils/pessoa';
import { EmptyState } from '@/shared/components/feedback/EmptyState';
import { ErrorState } from '@/shared/components/feedback/ErrorState';
import { LoadingState } from '@/shared/components/feedback/LoadingState';
import { FilterBar, FloatingActionButton, Header, ListCard, Screen } from '@/shared/components/ui';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { useResponsive } from '@/shared/hooks/useResponsive';
import type { Customer } from '@/shared/types/entities';
import { maskCpf } from '@/shared/utils/format';
import { usePode } from '@/stores/auth.store';

const TIPOS = [
  { value: 'TODOS', label: 'Todos' },
  { value: 'aluno', label: 'Alunos' },
  { value: 'comprador', label: 'Compradores' }
];
const SITUACOES = [
  { value: 'ATIVO', label: 'Ativos' },
  { value: 'INATIVO', label: 'Inativos' },
  { value: 'TODOS', label: 'Todos' }
];

function normalizeBusca(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
}

/** Mantém o filtro mesmo quando a API ainda não filtra por tipo/situação (ignora os params). */
function combina(pessoa: PessoaView, tipo: string, situacao: string, busca: string) {
  if (situacao === 'ATIVO' && !pessoa.ativo) return false;
  if (situacao === 'INATIVO' && pessoa.ativo) return false;
  if (tipo === 'aluno' && pessoa.aluno === false) return false;
  if (tipo === 'comprador' && pessoa.comprador === false) return false;
  if (!busca) return true;
  const digits = busca.replace(/\D/g, '');
  const alvo = normalizeBusca(`${pessoa.nome} ${pessoa.email ?? ''} ${pessoa.cidade ?? ''}`);
  return alvo.includes(normalizeBusca(busca)) || (!!digits && `${pessoa.cpf ?? ''}${pessoa.telefone ?? ''}`.replace(/\D/g, '').includes(digits));
}

/**
 * Pessoas: cadastro único de clientes e alunos (mesmo CPF). Aluno é quem tem inscrição em curso;
 * a inscrição em si fica em Comercial → Inscrições, aberta a partir da ficha ("Inscrever em curso").
 */
export default function Pessoas() {
  const podeCriar = usePode('pessoas.criar');
  const [busca, setBusca] = useState('');
  const [buscaApi, setBuscaApi] = useState('');
  const params = useLocalSearchParams<{ tipo?: string }>();
  const [tipo, setTipo] = useState(params.tipo === 'aluno' || params.tipo === 'comprador' ? params.tipo : 'TODOS');
  const [situacao, setSituacao] = useState('ATIVO');
  const [fichaId, setFichaId] = useState<string | null>(null);
  const [form, setForm] = useState<{ open: boolean; pessoa?: Customer | null }>({ open: false });
  const { numColumns } = useResponsive();
  const gridCell = gridCellStyle(numColumns);

  useEffect(() => {
    const timer = setTimeout(() => setBuscaApi(busca.trim()), 400);
    return () => clearTimeout(timer);
  }, [busca]);

  const filtros = useMemo<CustomerFilters>(() => ({
    tipo: tipo === 'TODOS' ? undefined : tipo as CustomerFilters['tipo'],
    status: situacao === 'TODOS' ? undefined : situacao as CustomerFilters['status'],
    search: buscaApi || undefined
  }), [buscaApi, situacao, tipo]);
  const query = useCallback(() => listCustomers(filtros), [filtros]);
  const { data, loading, error, refetch } = useApiQuery(query, { fallbackData: [] });
  const pessoas = useMemo(() => (data ?? []).map(normalizePessoa).filter((pessoa) => combina(pessoa, tipo, situacao, busca.trim())), [busca, data, situacao, tipo]);

  return <Screen variant="admin">
    <Header
      title="Pessoas"
      subtitle="Clientes e alunos num cadastro só. Abra a ficha para ver o histórico, inscrever em curso ou vender."
      right={podeCriar ? <FloatingActionButton onPress={() => setForm({ open: true, pessoa: null })} accessibilityLabel="Nova pessoa" /> : undefined}
    />
    <FilterBar
      search={{ value: busca, onChange: setBusca, placeholder: 'Buscar por nome, CPF, telefone ou e-mail' }}
      filters={[
        { key: 'tipo', label: 'Tipo', value: tipo, allValue: 'TODOS', options: TIPOS, onChange: setTipo },
        { key: 'situacao', label: 'Situação', value: situacao, allValue: 'ATIVO', options: SITUACOES, onChange: setSituacao }
      ]}
    />

    {loading && !data?.length ? <LoadingState label="Carregando pessoas..." /> : null}
    {error ? <ErrorState message={error} onRetry={refetch} /> : null}
    {!loading && !error && !pessoas.length ? <EmptyState icon="account-search-outline" title="Ninguém encontrado" subtitle={busca || tipo !== 'TODOS' ? 'Ajuste a busca ou os filtros.' : 'Use o botão + para cadastrar a primeira pessoa.'} /> : null}

    {!error ? <View style={styles.grid}>
      {pessoas.map((pessoa) => <View key={pessoa.id} style={gridCell}>
        <ListCard
          title={pessoa.nome}
          subtitle={`${pessoa.cpf ? maskCpf(pessoa.cpf) : 'CPF não informado'}${pessoa.telefone ? ` · ${pessoa.telefone}` : ''}\n${[pessoa.aluno ? 'Aluno' : null, pessoa.comprador ? 'Comprador' : null, pessoa.cidade].filter(Boolean).join(' · ') || ' '}`}
          status={pessoa.ativo ? undefined : 'INATIVO'}
          onPress={() => setFichaId(pessoa.id)}
        />
      </View>)}
    </View> : null}

    <PessoaFichaModal
      pessoaId={fichaId}
      onClose={() => setFichaId(null)}
      onEdit={(customer) => { setFichaId(null); setForm({ open: true, pessoa: customer }); }}
      onChanged={refetch}
    />
    <PessoaFormModal
      visible={form.open}
      pessoa={form.pessoa}
      onClose={() => setForm({ open: false })}
      onSaved={(saved) => { refetch(); if (!form.pessoa && saved?.id) setFichaId(String(saved.id)); }}
      onOpenExisting={(id) => setFichaId(id)}
    />
  </Screen>;
}

const styles = StyleSheet.create({
  grid: gridContainer
});
