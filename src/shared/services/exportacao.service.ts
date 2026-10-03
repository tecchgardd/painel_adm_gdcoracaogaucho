import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Linking, Platform } from 'react-native';

import { gerarCsv, nomeDoArquivo, type ExportColumn } from '@/shared/utils/exportacao';

export type FormatoExportacao = 'csv' | 'pdf';

function base64ParaBlob(base64: string, type: string) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type });
}

/** Web: baixa o arquivo. App: grava e abre o compartilhamento (salvar, e-mail, WhatsApp...). */
async function salvar(conteudo: { base64?: string; texto?: string }, filename: string, mimeType: string) {
  if (Platform.OS === 'web') {
    const blob = conteudo.base64 ? base64ParaBlob(conteudo.base64, mimeType) : new Blob([conteudo.texto ?? ''], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = window.document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    window.document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    return;
  }
  const uri = `${FileSystem.cacheDirectory ?? FileSystem.documentDirectory}${filename}`;
  if (conteudo.base64) await FileSystem.writeAsStringAsync(uri, conteudo.base64, { encoding: FileSystem.EncodingType.Base64 });
  else await FileSystem.writeAsStringAsync(uri, conteudo.texto ?? '', { encoding: FileSystem.EncodingType.UTF8 });
  if (await Sharing.isAvailableAsync()) await Sharing.shareAsync(uri, { mimeType, dialogTitle: 'Exportar' });
  else await Linking.openURL(uri);
}

export async function exportarLista<T>({ formato, titulo, subtitulo, columns, rows }: { formato: FormatoExportacao; titulo: string; subtitulo?: string; columns: ExportColumn<T>[]; rows: T[] }) {
  const filename = nomeDoArquivo(titulo, formato);
  if (formato === 'csv') {
    await salvar({ texto: gerarCsv(rows, columns) }, filename, 'text/csv');
    return;
  }
  // pdf-lib é pesado: carregado só quando alguém exporta em PDF.
  const { gerarPdfTabela } = await import('@/shared/services/exportPdf');
  await salvar({ base64: await gerarPdfTabela({ titulo, subtitulo, columns, rows }) }, filename, 'application/pdf');
}
