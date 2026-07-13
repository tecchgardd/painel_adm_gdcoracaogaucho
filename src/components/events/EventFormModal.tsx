import { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppModal, Button, FormField } from '@/components/ui';
import { createEvento, updateEvento } from '@/services/eventos.service';
import { uploadImage } from '@/services/uploads.service';
import { colors } from '@/theme/colors';
import { eventoSchema } from '@/validation/schemas';
import type { EventType } from '@/types/entities';

type EventStatus = 'ATIVO' | 'INATIVO' | 'CANCELADO' | 'ENCERRADO';
type LotForm = { nome: string; valor: string; quantidade: string; dataLimite: string; ativo: boolean };

type FormState = {
  id?: string | number;
  tipo: EventType;
  nome: string;
  data: string;
  local: string;
  cidade: string;
  capacidade: string;
  status: EventStatus;
  observacao: string;
  banner: string;
  atracao: string;
  preco: string;
  professor: string;
  dataLimiteInscricao: string;
  informacoesExtras: string;
  lotes: LotForm[];
};

const emptyLot = (): LotForm => ({ nome: '', valor: '0', quantidade: '0', dataLimite: '', ativo: true });

function normalizeInitial(initialType: EventType, initial?: any): FormState {
  return {
    id: initial?.id,
    tipo: initialType,
    nome: initial?.nome ?? initial?.titulo ?? '',
    data: initial?.data ?? initial?.dataInicio ?? initial?.horario ?? '',
    local: initial?.local ?? '',
    cidade: initial?.cidade ?? '',
    capacidade: String(initial?.capacidade ?? ''),
    status: initial?.status ?? 'ATIVO',
    observacao: initial?.observacao ?? initial?.descricao ?? '',
    banner: initial?.banner ?? initial?.imagemUrl ?? '',
    atracao: initial?.atracao ?? '',
    preco: String(initial?.preco ?? initial?.valor ?? ''),
    professor: initial?.professor ?? '',
    dataLimiteInscricao: initial?.dataLimiteInscricao ?? '',
    informacoesExtras: initial?.informacoesExtras ?? '',
    lotes: initial?.lotes?.length ? initial.lotes : []
  };
}

function currencyToNumber(value: string) {
  return Number(String(value || '0').replace(/\./g, '').replace(',', '.'));
}

function toApiPayload(form: FormState) {
  return {
    tipo: form.tipo,
    nome: form.nome.trim(),
    data: form.data,
    local: form.local.trim(),
    cidade: form.cidade.trim() || undefined,
    capacidade: form.capacidade ? Number(form.capacidade) : undefined,
    status: form.status,
    observacao: [form.observacao, form.informacoesExtras].filter(Boolean).join('\n\n') || undefined,
    descricao: form.observacao.trim() || undefined,
    banner: form.banner.trim() || undefined,
    atracao: form.atracao.trim() || undefined,
    professor: form.professor.trim() || undefined,
    preco: currencyToNumber(form.preco),
    dataLimiteInscricao: form.dataLimiteInscricao || undefined,
    lotes: form.lotes,
    valor: currencyToNumber(form.preco)
  };
}

export function EventFormModal({
  visible,
  onClose,
  onSaved,
  initialType,
  initial
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
  initialType: EventType;
  initial?: any;
}) {
  const [form, setForm] = useState<FormState>(() => normalizeInitial(initialType, initial));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!visible) return;
    setForm(normalizeInitial(initialType, initial));
    setError('');
    setFieldErrors({});
  }, [visible, initialType, initial]);

  const title = useMemo(() => {
    const label = initialType === 'CURSO' ? 'curso' : initialType === 'BAILE' ? 'baile' : 'evento';
    return `${form.id ? 'Editar' : 'Novo'} ${label}`;
  }, [form.id, initialType]);

  const copy = useMemo(() => ({
    nameLabel: initialType === 'CURSO' ? 'Nome do curso' : 'Nome do evento',
    namePlaceholder: initialType === 'CURSO' ? 'Ex: Curso de fandango' : initialType === 'BAILE' ? 'Ex: Baile de inverno' : 'Ex: Encontro cultural',
    capacityLabel: initialType === 'BAILE' ? 'Capacidade total' : 'Capacidade',
    notesLabel: initialType === 'EVENTO' ? 'Descricao' : 'Observacoes'
  }), [initialType]);

  function patch<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function patchLot(index: number, key: keyof LotForm, value: string | boolean) {
    setForm((current) => ({
      ...current,
      lotes: current.lotes.map((lot, lotIndex) => lotIndex === index ? { ...lot, [key]: value } : lot)
    }));
  }

  async function pickBanner() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissao para acessar imagens negada.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.82,
      allowsEditing: true
    });

    if (result.canceled || !result.assets?.[0]) return;

    try {
      setUploading(true);
      const asset = result.assets[0];
      const url = await uploadImage(asset.uri, asset.fileName ?? `banner-${Date.now()}.jpg`);
      patch('banner', url);
    } catch (uploadError) {
      setError((uploadError as { message?: string })?.message ?? 'Não foi possível enviar o banner.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    setError('');
    setFieldErrors({});
    const validation = eventoSchema.safeParse({
      ...form,
      capacidade: form.capacidade === '' ? undefined : form.capacidade,
      preco: form.preco === '' ? '0' : form.preco,
      lotes: form.lotes.map((lot) => ({ ...lot, quantidade: lot.quantidade || '0', valor: lot.valor || '0' }))
    });

    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((issue) => {
        const key = String(issue.path[0] ?? 'form');
        errors[key] = issue.message;
      });
      setFieldErrors(errors);
      setSaving(false);
      return;
    }

    try {
      const payload = toApiPayload(form);
      if (form.id) await updateEvento(String(form.id), payload as any);
      else await createEvento(payload as any);
      onSaved();
      onClose();
    } catch (saveError) {
      setError((saveError as { message?: string })?.message ?? 'Não foi possível salvar.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppModal
      visible={visible}
      onClose={onClose}
      position="center"
      title={title}
      footer={<View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
        <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar'} tone="green" onPress={saving ? undefined : save} /></View>
      </View>}
    >
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <FormField label={copy.nameLabel} value={form.nome} onChangeText={(value) => patch('nome', value)} placeholder={copy.namePlaceholder} />
      {fieldErrors.nome ? <Text style={styles.fieldError}>{fieldErrors.nome}</Text> : null}
      <FormField label="Data e horario" value={form.data} onChangeText={(value) => patch('data', value)} placeholder="2026-05-30T21:00" />
      {fieldErrors.data ? <Text style={styles.fieldError}>{fieldErrors.data}</Text> : null}
      <FormField label="Local" value={form.local} onChangeText={(value) => patch('local', value)} placeholder="CTG ou endereco" />
      {fieldErrors.local ? <Text style={styles.fieldError}>{fieldErrors.local}</Text> : null}
      <FormField label="Cidade" value={form.cidade} onChangeText={(value) => patch('cidade', value)} placeholder="Porto Alegre" />

      <View style={styles.inline}>
        <View style={styles.inlineItem}>
          <FormField label={copy.capacityLabel} value={form.capacidade} onChangeText={(value) => patch('capacidade', value)} keyboardType="numeric" placeholder="800" />
        </View>
        <View style={styles.inlineItem}>
          <FormField
            label={initialType === 'BAILE' && !form.lotes.length ? 'Valor do ingresso unico' : 'Valor'}
            value={form.preco}
            onChangeText={(value) => patch('preco', value)}
            keyboardType="decimal-pad"
            placeholder="0,00"
          />
        </View>
      </View>

      <Text style={styles.label}>Status</Text>
      <View style={styles.segmented}>
        {(['ATIVO', 'INATIVO', 'CANCELADO', 'ENCERRADO'] as EventStatus[]).map((status) => (
          <TouchableOpacity key={status} style={[styles.segment, form.status === status && styles.segmentActive]} onPress={() => patch('status', status)}>
            <Text style={[styles.segmentText, form.status === status && styles.segmentTextActive]}>{status}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.bannerRow}>
        <View style={styles.bannerCopy}>
          <Text style={styles.label}>Banner/imagem</Text>
          <Text style={styles.hint}>Envie uma imagem para o backend.</Text>
        </View>
        <TouchableOpacity style={styles.uploadButton} onPress={uploading ? undefined : pickBanner}>
          <MaterialCommunityIcons name="image-plus" color="#fff" size={18} />
          <Text style={styles.uploadText}>{uploading ? 'Enviando...' : 'Selecionar'}</Text>
        </TouchableOpacity>
      </View>
      {form.banner ? <Image source={{ uri: form.banner }} style={styles.preview} resizeMode="cover" /> : null}
      <FormField label="URL do banner" value={form.banner} onChangeText={(value) => patch('banner', value)} placeholder="https://..." />

      {initialType === 'BAILE' ? <>
        <FormField label="Atração" value={form.atracao} onChangeText={(value) => patch('atracao', value)} placeholder="Nome da atração" />
        {fieldErrors.atracao ? <Text style={styles.fieldError}>{fieldErrors.atracao}</Text> : null}
        <Text style={styles.sectionTitle}>Lotes de ingresso</Text>
        <Text style={styles.hint}>Opcional. Use lotes apenas quando houver virada de preço, quantidade ou data limite.</Text>
        {fieldErrors.lotes ? <Text style={styles.fieldError}>{fieldErrors.lotes}</Text> : null}
        {form.lotes.map((lot, index) => (
          <View key={`${index}-${lot.nome}`} style={styles.lotCard}>
            <View style={styles.lotHeader}>
              <Text style={styles.lotTitle}>Lote {index + 1}</Text>
              <TouchableOpacity onPress={() => patch('lotes', form.lotes.filter((_, lotIndex) => lotIndex !== index))}>
                <MaterialCommunityIcons name="trash-can-outline" color={colors.red} size={20} />
              </TouchableOpacity>
            </View>
            <FormField label="Nome do lote" value={lot.nome} onChangeText={(value) => patchLot(index, 'nome', value)} placeholder="Antecipado" />
            <View style={styles.inline}>
              <View style={styles.inlineItem}>
                <FormField label="Valor por lote" value={lot.valor} onChangeText={(value) => patchLot(index, 'valor', value)} keyboardType="decimal-pad" placeholder="50,00" />
              </View>
              <View style={styles.inlineItem}>
                <FormField label="Quantidade" value={lot.quantidade} onChangeText={(value) => patchLot(index, 'quantidade', value)} keyboardType="numeric" placeholder="100" />
              </View>
            </View>
            <FormField label="Data limite" value={lot.dataLimite} onChangeText={(value) => patchLot(index, 'dataLimite', value)} placeholder="2026-05-20T23:59" />
          </View>
        ))}
        <TouchableOpacity style={styles.addLot} onPress={() => patch('lotes', [...form.lotes, emptyLot()])}>
          <MaterialCommunityIcons name="plus" color={colors.red} size={18} />
          <Text style={styles.addLotText}>Adicionar lote</Text>
        </TouchableOpacity>
      </> : null}

      {initialType === 'CURSO' ? <>
        <FormField label="Professor/instrutor" value={form.professor} onChangeText={(value) => patch('professor', value)} placeholder="Nome do professor" />
        {fieldErrors.professor ? <Text style={styles.fieldError}>{fieldErrors.professor}</Text> : null}
        <FormField label="Data limite de inscricao" value={form.dataLimiteInscricao} onChangeText={(value) => patch('dataLimiteInscricao', value)} placeholder="2026-05-20T23:59" />
        <FormField label="Informacoes extras" value={form.informacoesExtras} onChangeText={(value) => patch('informacoesExtras', value)} placeholder="Requisitos, nivel, par opcional..." multiline />
      </> : null}

      <FormField label={copy.notesLabel} value={form.observacao} onChangeText={(value) => patch('observacao', value)} placeholder="Informações para o público" multiline />
    </AppModal>
  );
}

const styles = StyleSheet.create({
  segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  segment: { minHeight: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  segmentActive: { backgroundColor: colors.red, borderColor: colors.red },
  segmentText: { color: colors.muted, fontSize: 12, fontWeight: '900' },
  segmentTextActive: { color: '#fff' },
  error: { color: colors.red, fontWeight: '800', marginTop: 8 },
  fieldError: { color: colors.red, fontSize: 12, fontWeight: '700', marginTop: 5 },
  inline: { flexDirection: 'row', gap: 10 },
  inlineItem: { flex: 1 },
  label: { color: colors.text, fontSize: 13, fontWeight: '900', marginTop: 14, marginBottom: 8 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 17 },
  bannerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginTop: 8 },
  bannerCopy: { flex: 1 },
  uploadButton: { minHeight: 40, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 7 },
  uploadText: { color: '#fff', fontSize: 12, fontWeight: '900' },
  preview: { width: '100%', height: 160, borderRadius: 16, marginTop: 12, backgroundColor: colors.card },
  sectionTitle: { color: colors.text, fontSize: 16, fontWeight: '900', marginTop: 18 },
  lotCard: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 12, marginTop: 10 },
  lotHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  lotTitle: { color: colors.text, fontWeight: '900' },
  addLot: { minHeight: 42, borderRadius: 12, borderWidth: 1, borderColor: colors.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 12 },
  addLotText: { color: colors.red, fontWeight: '900' },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 }
});
