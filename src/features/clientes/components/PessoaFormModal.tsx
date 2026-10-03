import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createCustomer, updateCustomer } from '@/features/clientes/services/customers.service';
import { findPersonByCpf } from '@/features/pessoas/services/people.service';
import { AppModal, Button, ChoiceGroup, FormField, FormRow, FormSection } from '@/shared/components/ui';
import { buscarEnderecoPorCep } from '@/shared/services/cep.service';
import type { Customer } from '@/shared/types/entities';
import { clienteSchema } from '@/validation/schemas';
import { colors, theme } from '@/theme/theme';

type Form = Record<string, string>;

const EMPTY: Form = { nome: '', cpf: '', telefone: '', email: '', cep: '', rua: '', numero: '', bairro: '', cidade: '', estado: '', complemento: '', status: 'ATIVO' };

function toForm(customer?: Customer | null): Form {
  if (!customer) return { ...EMPTY };
  return Object.fromEntries(Object.keys(EMPTY).map((key) => [key, String((customer as Record<string, unknown>)[key] ?? (key === 'nome' ? customer.name ?? '' : key === 'telefone' ? customer.phone ?? '' : EMPTY[key]))]));
}

/** Cadastro/edição de pessoa. Antes de criar, confere o CPF para não duplicar quem já existe. */
export function PessoaFormModal({ visible, pessoa, onClose, onSaved, onOpenExisting }: {
  visible: boolean;
  pessoa?: Customer | null;
  onClose: () => void;
  onSaved: (customer: Customer) => void;
  onOpenExisting: (id: string) => void;
}) {
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [existente, setExistente] = useState<{ id: string; nome?: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const editingId = pessoa?.id ? String(pessoa.id) : undefined;

  useEffect(() => {
    if (!visible) return;
    setForm(toForm(pessoa));
    setErrors({});
    setFormError('');
    setExistente(null);
  }, [pessoa, visible]);

  function patch(key: string, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function onCep(value: string) {
    patch('cep', value);
    if (value.replace(/\D/g, '').length !== 8) return;
    const address = await buscarEnderecoPorCep(value).catch(() => null);
    if (!address) return;
    setForm((current) => ({
      ...current,
      rua: current.rua || address.rua,
      bairro: current.bairro || address.bairro,
      cidade: current.cidade || address.cidade,
      estado: current.estado || address.estado
    }));
  }

  async function checkCpf() {
    setExistente(null);
    if (editingId || form.cpf.replace(/\D/g, '').length !== 11) return;
    try {
      const result = await findPersonByCpf(form.cpf);
      if (result.success && result.data?.id) setExistente({ id: String(result.data.id), nome: result.data.nome });
    } catch {
      // Conferência é uma ajuda: se a consulta falhar, a API ainda recusa CPF duplicado ao salvar.
    }
  }

  async function save() {
    const validation = clienteSchema.safeParse({ ...form, cpf: form.cpf });
    if (!validation.success) {
      const next: Record<string, string> = {};
      validation.error.issues.forEach((issue) => { next[String(issue.path[0] ?? 'form')] = issue.message; });
      setErrors(next);
      return;
    }
    if (existente) {
      setFormError('Este CPF já está cadastrado. Abra o cadastro existente em vez de criar outro.');
      return;
    }
    setSaving(true);
    setErrors({});
    setFormError('');
    try {
      const data = validation.data as Partial<Customer>;
      const saved = editingId ? await updateCustomer(editingId, data) : await createCustomer(data);
      onSaved(saved);
      onClose();
    } catch (saveError) {
      setFormError((saveError as { message?: string })?.message ?? 'Não foi possível salvar o cadastro.');
    } finally {
      setSaving(false);
    }
  }

  return <AppModal
    visible={visible}
    onClose={onClose}
    title={editingId ? 'Editar pessoa' : 'Nova pessoa'}
    subtitle="Cliente e aluno usam o mesmo cadastro. Para inscrever em curso, salve e use “Inscrever em curso” na ficha."
    footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
      <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" disabled={saving} onPress={save} /></View>
    </View>}
  >
    {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    <FormSection first title="Dados pessoais">
      <FormField required label="Nome completo" value={form.nome} onChangeText={(value) => patch('nome', value)} placeholder="Nome e sobrenome" error={errors.nome} />
      <FormRow>
        <FormField required label="CPF" value={form.cpf} onChangeText={(value) => { patch('cpf', value); setExistente(null); }} onBlur={checkCpf} keyboardType="numeric" placeholder="000.000.000-00" editable={!editingId} hint={editingId ? 'O CPF não muda depois do cadastro.' : undefined} error={errors.cpf} />
        <FormField required label="Telefone / WhatsApp" value={form.telefone} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" placeholder="(51) 99999-9999" error={errors.telefone} />
      </FormRow>
      {existente ? <View style={styles.existing}>
        <Text style={styles.existingText}>Já existe um cadastro com este CPF{existente.nome ? `: ${existente.nome}` : ''}.</Text>
        <View style={styles.existingAction}><Button title="Abrir cadastro existente" tone="soft" onPress={() => { onClose(); onOpenExisting(existente.id); }} /></View>
      </View> : null}
      <FormField label="E-mail" value={form.email} onChangeText={(value) => patch('email', value)} keyboardType="email-address" autoCapitalize="none" placeholder="nome@email.com" error={errors.email} />
    </FormSection>

    <FormSection title="Endereço" description="Informe o CEP para preencher rua, bairro, cidade e estado.">
      <FormRow>
        <FormField label="CEP" value={form.cep} onChangeText={onCep} keyboardType="numeric" placeholder="00000-000" error={errors.cep} />
        <FormField required label="Estado" value={form.estado} onChangeText={(value) => patch('estado', value.toUpperCase().slice(0, 2))} placeholder="RS" error={errors.estado} />
      </FormRow>
      <FormField required label="Rua" value={form.rua} onChangeText={(value) => patch('rua', value)} error={errors.rua} />
      <FormRow>
        <FormField required label="Número" value={form.numero} onChangeText={(value) => patch('numero', value)} error={errors.numero} />
        <FormField required label="Bairro" value={form.bairro} onChangeText={(value) => patch('bairro', value)} error={errors.bairro} />
      </FormRow>
      <FormRow>
        <FormField required label="Cidade" value={form.cidade} onChangeText={(value) => patch('cidade', value)} error={errors.cidade} />
        <FormField label="Complemento" value={form.complemento} onChangeText={(value) => patch('complemento', value)} placeholder="Apto, bloco..." />
      </FormRow>
    </FormSection>

    {editingId ? <FormSection title="Situação">
      <ChoiceGroup options={[{ value: 'ATIVO', label: 'Ativo' }, { value: 'INATIVO', label: 'Inativo' }]} value={form.status} onChange={(value) => patch('status', value)} />
    </FormSection> : null}
  </AppModal>;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  formError: { color: colors.red, fontFamily: theme.font.medium, marginBottom: 10 },
  existing: { marginTop: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.yellow + '66', backgroundColor: colors.yellowSoft, padding: 12, gap: 10 },
  existingText: { color: colors.text, fontSize: 13, fontFamily: theme.font.medium },
  existingAction: { alignSelf: 'flex-start', minWidth: 220 }
});
