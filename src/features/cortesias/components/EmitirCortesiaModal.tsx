import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { createCustomer } from '@/features/clientes/services/customers.service';
import { createCortesia } from '@/features/cortesias/services/cortesias.service';
import { buildCortesiaPayload, emptyCortesiaForm, MAX_CORTESIAS_POR_EMISSAO, validateCortesia, type CortesiaFormState } from '@/features/cortesias/utils/cortesiaForm';
import { listEventos } from '@/features/eventos/services/eventos.service';
import { findPersonByCpf } from '@/features/pessoas/services/people.service';
import { AppModal, Button, ChoiceGroup, FormField, FormRow, FormSection } from '@/shared/components/ui';
import { useApiQuery } from '@/shared/hooks/useApiQuery';
import { formatDateTime } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';

/** Emissão de cortesia (só ADMIN): gera ingresso gratuito, sem comprovante de pagamento, com motivo registrado. */
export function EmitirCortesiaModal({ visible, onClose, onCreated }: { visible: boolean; onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState<CortesiaFormState>(emptyCortesiaForm);
  const [pessoaNome, setPessoaNome] = useState('');
  const [lookupMessage, setLookupMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const queryEventos = useCallback(() => listEventos({ status: 'ATIVO' }), []);
  const { data: eventosData } = useApiQuery(queryEventos, { fallbackData: [], enabled: visible });
  const eventos = useMemo(() => (eventosData ?? []).filter((evento: any) => evento.tipo !== 'CURSO'), [eventosData]);

  useEffect(() => {
    if (!visible) return;
    setForm(emptyCortesiaForm);
    setPessoaNome('');
    setLookupMessage('');
    setErrors({});
    setFormError('');
  }, [visible]);

  function patch<K extends keyof CortesiaFormState>(key: K, value: CortesiaFormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function lookup() {
    setLookupMessage('');
    setPessoaNome('');
    patch('pessoaId', undefined);
    if (form.cpf.replace(/\D/g, '').length !== 11) return;
    try {
      const result = await findPersonByCpf(form.cpf);
      if (result.success && result.data) {
        patch('pessoaId', String(result.data.id));
        setPessoaNome(result.data.nome ?? '');
      } else {
        setLookupMessage('CPF não cadastrado: preencha nome e telefone para cadastrar junto com a cortesia.');
      }
    } catch {
      setLookupMessage('Não foi possível consultar o CPF agora. Preencha nome e telefone para cadastrar.');
    }
  }

  async function save() {
    const validation = validateCortesia(form);
    setErrors(validation);
    setFormError('');
    if (Object.keys(validation).length) return;
    setSaving(true);
    try {
      let customerId = form.pessoaId;
      if (!customerId) {
        const created = await createCustomer({ nome: form.nome.trim(), cpf: form.cpf.replace(/\D/g, ''), telefone: form.telefone.trim() || undefined });
        customerId = String(created.id);
      }
      await createCortesia(buildCortesiaPayload(form, customerId) as any);
      onCreated();
      onClose();
    } catch (saveError) {
      setFormError((saveError as { message?: string })?.message ?? 'Não foi possível emitir a cortesia.');
    } finally {
      setSaving(false);
    }
  }

  return <AppModal
    visible={visible}
    onClose={onClose}
    title="Emitir cortesia"
    subtitle="Ingresso gratuito, com motivo registrado no histórico."
    footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
      <View style={styles.footerItem}><Button title={saving ? 'Emitindo...' : 'Emitir cortesia'} tone="green" disabled={saving} onPress={save} /></View>
    </View>}
  >
    {formError ? <Text style={styles.formError}>{formError}</Text> : null}
    <FormSection first title="Beneficiário">
      <FormField required label="CPF" value={form.cpf} onChangeText={(value) => { patch('cpf', value); patch('pessoaId', undefined); setPessoaNome(''); }} onBlur={lookup} keyboardType="numeric" placeholder="000.000.000-00" error={errors.cpf} hint={pessoaNome ? `Encontrado: ${pessoaNome}` : undefined} />
      {lookupMessage ? <Text style={styles.hint}>{lookupMessage}</Text> : null}
      {!form.pessoaId && lookupMessage ? <FormRow>
        <FormField required label="Nome completo" value={form.nome} onChangeText={(value) => patch('nome', value)} error={errors.nome} />
        <FormField label="Telefone" value={form.telefone} onChangeText={(value) => patch('telefone', value)} keyboardType="phone-pad" placeholder="(51) 99999-9999" />
      </FormRow> : null}
    </FormSection>

    <FormSection title="Evento">
      {eventos.length ? <ChoiceGroup
        options={eventos.slice(0, 12).map((evento: any) => ({ value: String(evento.id), label: `${evento.nome}${evento.data ? ` · ${formatDateTime(evento.data).split(' ')[0]}` : ''}` }))}
        value={form.eventoId}
        onChange={(value) => patch('eventoId', value)}
      /> : <Text style={styles.hint}>Nenhum evento ou baile ativo.</Text>}
      {errors.eventoId ? <Text style={styles.fieldError}>{errors.eventoId}</Text> : null}
      <FormField required label="Quantidade de ingressos" value={form.quantidade} onChangeText={(value) => patch('quantidade', value.replace(/\D/g, ''))} keyboardType="numeric" hint={`Até ${MAX_CORTESIAS_POR_EMISSAO} por emissão.`} error={errors.quantidade} />
    </FormSection>

    <FormSection title="Motivo" description="Fica registrado junto com quem emitiu e aparece no Registro de atividades.">
      <FormField required label="Por que esta cortesia?" value={form.motivo} onChangeText={(value) => patch('motivo', value)} multiline placeholder="Ex.: convidado da diretoria, parceria com a empresa X, premiação..." error={errors.motivo} />
    </FormSection>
  </AppModal>;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 8 },
  fieldError: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 6 },
  formError: { color: colors.red, fontFamily: theme.font.medium, marginBottom: 10 }
});
