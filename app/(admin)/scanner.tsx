import { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { ActionMenu, AppModal, Button, Screen, SearchBar } from '@/components/ui';
import { validarCodigoManual, validarQRCode } from '@/services/scanner.service';
import type { ScannerResult } from '@/types/entities';
import { colors } from '@/theme/colors';

export default function Scanner() {
  const [permission, requestPermission] = useCameraPermissions();
  const [modal, setModal] = useState(false);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScannerResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function validate(codigo: string, manual = false) {
    if (!codigo || loading) return;
    setLoading(true);
    setError(null);
    setModal(true);
    try {
      const response = manual ? await validarCodigoManual(codigo) : await validarQRCode(codigo);
      setResult(response);
    } catch (err) {
      setResult(null);
      const message = err instanceof Error ? err.message : (err as { message?: string })?.message ?? 'Não foi possível validar o ingresso.';
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function openManual() {
    setResult(null);
    setError(null);
    setModal(true);
  }

  if (!permission?.granted) {
    return <Screen><View style={styles.center}><Text style={styles.title}>Permissão da câmera</Text><Text style={styles.text}>Libere a câmera para validar QR Codes.</Text><Button title="Permitir câmera" onPress={requestPermission} /></View></Screen>;
  }

  return <Screen>
    <View style={styles.header}>
      <Text style={styles.headerText}>Scanner QR Code</Text>
      <ActionMenu actions={[
        { label: 'Digitar código', icon: 'keyboard-outline', onPress: openManual },
        { label: 'Histórico', icon: 'history', onPress: () => {} },
        { label: 'Alternar flash', icon: 'flash', onPress: () => {} }
      ]} />
    </View>
    <SearchBar value={query} onChangeText={setQuery} placeholder="Pesquisar código, CPF ou cliente" />
    <View style={styles.cameraWrap}><CameraView style={StyleSheet.absoluteFill} facing="back" barcodeScannerSettings={{ barcodeTypes: ['qr'] }} onBarcodeScanned={({ data }) => validate(data)} /><View style={styles.corner} /><View style={styles.line} /></View>
    <Text style={styles.instruction}>Aponte a câmera para o QR Code para validar o ingresso</Text>
    <View style={styles.row}><View style={styles.buttonHalf}><Button title="Histórico" tone="dark" /></View><View style={styles.buttonHalf}><Button title="Digitar código" tone="dark" onPress={openManual} /></View></View>
    <AppModal
      visible={modal}
      onClose={() => setModal(false)}
      position="center"
      title="Validar ingresso"
      footer={<View style={styles.row}>
        <View style={styles.buttonHalf}><Button title="Cancelar" tone="dark" onPress={() => setModal(false)} /></View>
        <View style={styles.buttonHalf}><Button title={loading ? 'Validando...' : 'Validar código'} tone="green" onPress={() => validate(query || 'CG250523ABC123', true)} /></View>
      </View>}
    >
        <View style={styles.modalBody}>
          <MaterialCommunityIcons name={result?.status === 'VALIDO' ? 'check-circle' : 'alert-circle'} color={result?.status === 'VALIDO' ? '#40C463' : colors.yellow} size={76} />
          <Text style={[styles.valid, result?.status !== 'VALIDO' && styles.warning]}>{loading ? 'Validando...' : result?.status ?? 'Digite ou leia um código'}</Text>
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <SearchBar value={query} onChangeText={setQuery} placeholder="Código do ingresso" />
          <Text style={styles.info}>Status possíveis: VÁLIDO, JÁ_UTILIZADO, CANCELADO, NÃO_ENCONTRADO, EVENTO_EXPIRADO</Text>
          {result?.message ? <Text style={styles.code}>{result.message}</Text> : null}
        </View>
    </AppModal>
  </Screen>;
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  headerText: { color: '#fff', fontSize: 20, fontWeight: '900' },
  cameraWrap: { height: 380, borderRadius: 22, overflow: 'hidden', marginTop: 14, borderWidth: 1, borderColor: '#444', backgroundColor: '#222' },
  corner: { position: 'absolute', inset: 38, borderWidth: 4, borderColor: colors.red, borderRadius: 18 },
  line: { position: 'absolute', left: 30, right: 30, top: '50%', height: 2, backgroundColor: colors.red },
  instruction: { color: '#fff', textAlign: 'center', marginTop: 22, lineHeight: 22 },
  row: { flexDirection: 'row', gap: 12, marginTop: 20 },
  buttonHalf: { flex: 1 },
  center: { flex: 1, justifyContent: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '900' },
  text: { color: '#ccc', marginVertical: 12 },
  modalBody: { alignItems: 'center' },
  close: { position: 'absolute', right: 18, top: 18 },
  valid: { color: '#40C463', fontSize: 25, fontWeight: '900', marginTop: 12 },
  warning: { color: colors.yellow, textAlign: 'center' },
  error: { color: colors.red, marginTop: 10, textAlign: 'center', lineHeight: 20 },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', marginTop: 16 },
  info: { color: '#ddd', marginTop: 8 },
  code: { color: '#aaa', marginTop: 18 }
});
