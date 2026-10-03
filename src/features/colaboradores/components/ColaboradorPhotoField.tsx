import { useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { uploadImage } from '@/shared/services/uploads.service';
import { Avatar, Button } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';

/** Foto do colaborador: escolhe da galeria, envia pelo /uploads/image e devolve a URL HTTPS. */
export function ColaboradorPhotoField({ nome, value, onChange, onRemove }: { nome: string; value: string; onChange: (url: string) => void; onRemove: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  async function pick() {
    setError('');
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Permissão para acessar as fotos negada.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, allowsEditing: true, aspect: [1, 1] });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    try {
      setUploading(true);
      onChange(await uploadImage(asset.uri, asset.fileName ?? `colaborador-${Date.now()}.jpg`, asset.file ?? undefined, asset.mimeType));
    } catch (uploadError) {
      setError((uploadError as { message?: string })?.message ?? 'Não foi possível enviar a foto.');
    } finally {
      setUploading(false);
    }
  }

  return <View style={styles.row}>
    <View style={styles.preview}>
      {uploading ? <ActivityIndicator color={colors.red} />
        : value ? <Image source={{ uri: value }} style={styles.photo} accessibilityLabel={`Foto de ${nome || 'colaborador'}`} />
          : <Avatar name={nome} size={72} />}
    </View>
    <View style={styles.copy}>
      <Text style={styles.hint}>JPG, PNG ou WEBP. Aparece na lista, no perfil e no registro de atividades.</Text>
      <View style={styles.actions}>
        <View style={styles.action}><Button title={value ? 'Trocar foto' : 'Escolher foto'} tone="soft" disabled={uploading} onPress={pick} /></View>
        {value ? <View style={styles.action}><Button title="Remover" tone="dark" disabled={uploading} onPress={onRemove} /></View> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  </View>;
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginTop: 12 },
  preview: { width: 72, height: 72, borderRadius: 36, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  photo: { width: 72, height: 72 },
  copy: { flex: 1, minWidth: 0, gap: 8 },
  hint: { color: colors.subtle, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  action: { minWidth: 120 },
  error: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium }
});
