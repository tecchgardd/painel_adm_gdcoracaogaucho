import { useRef, useState } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import * as ImagePicker from 'expo-image-picker';
import { Button, Header, Screen } from '@/components/ui';
import { uploadFotos, UploadablePhoto } from '@/services/fotos.service';
import { colors } from '@/theme/colors';
import { useResponsive } from '@/hooks/useResponsive';

type SelectedPhoto = {
  file: UploadablePhoto;
  id: string;
  name: string;
  relativePath?: string;
  status: 'PENDENTE' | 'ENVIANDO' | 'ENVIADA' | 'ERRO';
  error?: string;
};

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 1000;
const BATCH_SIZE = 50;

function getFolderName(file?: File) {
  const path = (file as File & { webkitRelativePath?: string } | undefined)?.webkitRelativePath;
  return path?.split('/')?.[0] || '';
}

function slugFolder(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9-_ ]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase();
}

export default function Fotos() {
  const { isMobile } = useResponsive();
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [folderName, setFolderName] = useState('');
  const [selected, setSelected] = useState<SelectedPhoto[]>([]);
  const [invalid, setInvalid] = useState<{ name: string; reason: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [sent, setSent] = useState(0);
  const [failed, setFailed] = useState(0);
  const [message, setMessage] = useState('');

  const totalFound = selected.length + invalid.length;
  const remaining = Math.max(0, selected.length - sent);
  const progressPercent = selected.length ? Math.round((sent / selected.length) * 100) : 0;

  async function openFolderPicker() {
    if (Platform.OS !== 'web') {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) return setMessage('Permita o acesso às fotos para continuar.');
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: true, selectionLimit: 0, quality: 1 });
      if (result.canceled) return;
      const assets = result.assets.slice(0, MAX_FILES).map((asset, index) => ({
        file: { uri: asset.uri, name: asset.fileName ?? `foto-${index + 1}.jpg`, type: asset.mimeType ?? 'image/jpeg' },
        id: `${asset.assetId ?? asset.uri}-${index}`,
        name: asset.fileName ?? `foto-${index + 1}.jpg`,
        status: 'PENDENTE' as const
      }));
      setFolderName(`formatura-${new Date().toISOString().slice(0, 10)}`);
      setSelected(assets);
      setInvalid(result.assets.length > MAX_FILES ? [{ name: 'Seleção', reason: 'Limite de 1000 imagens por lote' }] : []);
      setSent(0); setFailed(0); setMessage('');
      return;
    }
    folderInputRef.current?.click();
  }

  function validateFolder(fileList: FileList) {
    const allFiles = Array.from(fileList);
    const selectedFolder = getFolderName(allFiles[0]);
    const valid: SelectedPhoto[] = [];
    const invalidFiles: { name: string; reason: string }[] = [];

    allFiles.slice(0, MAX_FILES).forEach((file, index) => {
      const relativePath = (file as File & { webkitRelativePath?: string }).webkitRelativePath;
      if (!ACCEPTED_TYPES.includes(file.type)) {
        invalidFiles.push({ name: relativePath || file.name, reason: 'Formato inválido' });
        return;
      }
      if (file.size > MAX_SIZE) {
        invalidFiles.push({ name: relativePath || file.name, reason: 'Maior que 5MB' });
        return;
      }
      valid.push({
        file,
        id: `${relativePath || file.name}-${file.size}-${index}`,
        name: file.name,
        relativePath,
        status: 'PENDENTE'
      });
    });

    if (allFiles.length > MAX_FILES) {
      invalidFiles.push({ name: selectedFolder || 'Pasta', reason: 'Limite de 1000 imagens por lote' });
    }

    setFolderName(selectedFolder);
    setSelected(valid);
    setInvalid(invalidFiles);
    setSent(0);
    setFailed(0);
    setMessage('');
  }

  async function startUpload() {
    if (!selected.length || uploading) return;
    setUploading(true);
    setSent(0);
    setFailed(0);
    setMessage('');

    const next = [...selected];
    let sentCount = 0;
    let failedCount = 0;
    const targetFolder = slugFolder(folderName);

    for (let index = 0; index < next.length; index += BATCH_SIZE) {
      const batch = next.slice(index, index + BATCH_SIZE);
      batch.forEach((item) => { item.status = 'ENVIANDO'; });
      setSelected([...next]);

      try {
        const result = await uploadFotos(batch.map((item) => item.file), targetFolder);
        batch.forEach((item) => {
          const failedFile = result.erros.find((errorItem) => errorItem.arquivo.endsWith(item.name));
          item.status = failedFile ? 'ERRO' : 'ENVIADA';
          item.error = failedFile?.erro;
        });
        sentCount += result.totalEnviados;
        failedCount += result.totalFalhas;
      } catch (error) {
        batch.forEach((item) => {
          item.status = 'ERRO';
          item.error = (error as { message?: string })?.message ?? 'Falha no upload';
        });
        failedCount += batch.length;
      }

      setSent(sentCount);
      setFailed(failedCount);
      setSelected([...next]);
    }

    setUploading(false);
    setMessage(`Upload finalizado. Total: ${selected.length}. Enviadas: ${sentCount}. Falhas: ${failedCount}.`);
  }

  return <Screen variant="admin">
    <Header title="Fotos" />

    {Platform.OS === 'web' ? (
      <input
        ref={folderInputRef}
        type="file"
        multiple
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        {...({ webkitdirectory: '', directory: '' } as any)}
        onChange={(event) => event.target.files && validateFolder(event.target.files)}
      />
    ) : null}

    <View style={styles.panel}>
      <View style={[styles.actions, isMobile && styles.actionsMobile]}>
        <TouchableOpacity style={[styles.primaryAction, isMobile && styles.fullWidth]} onPress={openFolderPicker}>
          <MaterialCommunityIcons name="folder-image" color="#fff" size={20} />
          <Text style={styles.primaryActionText}>{Platform.OS === 'web' ? 'Selecionar pasta' : 'Selecionar fotos'}</Text>
        </TouchableOpacity>
        <View style={[styles.sendButton, isMobile && styles.fullWidth]}>
          <Button title={uploading ? 'Enviando...' : 'Enviar Fotos'} tone="green" onPress={uploading ? undefined : startUpload} />
        </View>
      </View>

      <View style={styles.summaryGrid}>
        <Info mobile={isMobile} label="Pasta" value={folderName || '-'} icon="folder-outline" />
        <Info mobile={isMobile} label="Imagens encontradas" value={String(totalFound)} icon="image-multiple-outline" />
        <Info mobile={isMobile} label="Válidas" value={String(selected.length)} icon="check-circle-outline" />
        <Info mobile={isMobile} label="Inválidas" value={String(invalid.length)} icon="alert-circle-outline" />
      </View>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progressPercent}%` }]} />
      </View>
      <Text style={styles.status}>Enviadas: {sent} · Restantes: {remaining} · Erros: {failed}</Text>

      {invalid.length ? <View style={styles.invalidBox}>
        {invalid.slice(0, 10).map((item) => <Text key={`${item.name}-${item.reason}`} style={styles.invalidText}>{item.name}: {item.reason}</Text>)}
      </View> : null}

      {message ? <Text style={styles.success}>{message}</Text> : null}
      {!folderName ? <Text style={styles.empty}>Não há dados ainda</Text> : null}
    </View>
  </Screen>;
}

function Info({ label, value, icon, mobile }: { label: string; value: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; mobile: boolean }) {
  return <View style={[styles.infoCard, mobile && styles.infoCardMobile]}>
    <MaterialCommunityIcons name={icon} color={colors.red} size={20} />
    <Text style={styles.infoLabel}>{label}</Text>
    <Text numberOfLines={1} style={styles.infoValue}>{value}</Text>
  </View>;
}

const styles = StyleSheet.create({
  panel: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.cardAlt, padding: 14, gap: 14 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  actionsMobile: { alignItems: 'stretch', flexDirection: 'column' },
  fullWidth: { minWidth: 0, width: '100%', justifyContent: 'center' },
  primaryAction: { minHeight: 46, borderRadius: 12, backgroundColor: colors.red, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  primaryActionText: { color: '#fff', fontWeight: '900' },
  sendButton: { minWidth: 180 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  infoCard: { minHeight: 86, width: '100%', maxWidth: 230, flexGrow: 1, borderRadius: 14, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.card, padding: 12, justifyContent: 'space-between' },
  infoCardMobile: { maxWidth: '100%' },
  infoLabel: { color: colors.muted, fontSize: 12, fontWeight: '800' },
  infoValue: { color: colors.text, fontSize: 16, fontWeight: '900' },
  progressTrack: { height: 12, borderRadius: 999, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: colors.green },
  status: { color: colors.muted, fontSize: 13, fontWeight: '800' },
  invalidBox: { borderRadius: 12, backgroundColor: '#2A1515', borderWidth: 1, borderColor: '#4A2020', padding: 10, gap: 4 },
  invalidText: { color: colors.red, fontSize: 12, fontWeight: '700' },
  success: { color: colors.green, fontSize: 14, fontWeight: '900' },
  empty: { color: colors.muted, fontWeight: '800' }
});
