import { Image, Platform, StyleSheet, Text, View } from 'react-native';

import type { TemplateDocument, TemplateFont } from '@/features/documentos/templates/documentTemplates';
import { TEMPLATE_IMAGES } from '@/features/documentos/templates/templateAssets';

import { DocumentQRCode } from './DocumentQRCode';

// Mesmas famílias usadas no PDF (Helvetica / Times), para a prévia bater com o arquivo gerado.
const FONT_FAMILY: Record<TemplateFont, string | undefined> = {
  sans: Platform.select({ web: 'Helvetica, Arial, sans-serif', ios: 'Helvetica', android: 'sans-serif' }),
  serif: Platform.select({ web: '"Times New Roman", Times, Georgia, serif', ios: 'Times New Roman', android: 'serif' })
};

/** Documento renderizado em pixels da arte; use dentro de `ScaledDocument` para caber na tela. */
export function TemplateDocumentView({ document }: { document: TemplateDocument }) {
  return <View style={{ width: document.width, height: document.height }}>
    <Image source={TEMPLATE_IMAGES[document.kind]} style={StyleSheet.absoluteFill} resizeMode="stretch" />
    {document.texts.map((item, index) => <View
      key={index}
      style={[styles.box, { left: item.x, top: item.y, width: item.width, height: item.height }]}
    >
      <Text
        numberOfLines={1}
        style={{ fontFamily: FONT_FAMILY[item.font], fontWeight: '700', fontSize: item.size, color: item.color, textAlign: item.align }}
      >{item.text}</Text>
    </View>)}
    {document.marks.map((mark, index) => <View key={`mark-${index}`} style={[styles.box, styles.mark, { left: mark.x, top: mark.y, width: mark.size, height: mark.size }]}>
      <Text style={{ fontSize: mark.size * 0.9, lineHeight: mark.size, color: mark.color, fontWeight: '700', textAlign: 'center' }}>✕</Text>
    </View>)}
    <View style={[styles.box, { left: document.qr.x, top: document.qr.y, width: document.qr.size, height: document.qr.size }]}>
      <DocumentQRCode value={document.qr.value} size={document.qr.size} />
    </View>
  </View>;
}

const styles = StyleSheet.create({
  box: { position: 'absolute', justifyContent: 'center' },
  mark: { alignItems: 'center' }
});
