import { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/shared/components/ui';
import { colors, theme } from '@/theme/theme';
import type { Sale } from '@/shared/types/entities';
import { buildTemplateDocument, ticketCountOf, type DocumentKind } from '@/features/documentos/templates/documentTemplates';

import { ScaledDocument } from './shared/ScaledDocument';
import { TemplateDocumentView } from './TemplateDocumentView';

export type { DocumentKind };

const TITLES: Record<DocumentKind, string> = { ticket: 'Ingresso', receipt: 'Cupom / Comprovante de Pagamento', registration: 'Comprovante de Inscrição' };

export function DocumentPreviewModal({ visible, onClose, sale, kind, initialTicketIndex = 0 }: { visible: boolean; onClose: () => void; sale: Sale | null; kind: DocumentKind; initialTicketIndex?: number }) {
  const [ticketIndex, setTicketIndex] = useState(initialTicketIndex);

  // Ao abrir a partir de um ingresso específico (tela de Ingressos), começa nele.
  useEffect(() => {
    if (visible) setTicketIndex(initialTicketIndex);
  }, [initialTicketIndex, visible]);
  const ticketCount = sale ? ticketCountOf(sale) : 1;
  const document = useMemo(() => (sale ? buildTemplateDocument(kind, sale, ticketIndex, ticketCount) : null), [kind, sale, ticketIndex, ticketCount]);

  async function handleShare() {
    if (!sale) return;
    const { shareSaleDocument } = await import('@/features/documentos/services/documents.service');
    await shareSaleDocument(sale, kind, ticketIndex);
  }

  async function handleDownload() {
    if (!sale) return;
    const { downloadSaleDocument } = await import('@/features/documentos/services/documents.service');
    await downloadSaleDocument(sale, kind, ticketIndex);
  }

  if (!sale || !document) return null;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Text style={styles.title}>{TITLES[kind]}</Text>
          <TouchableOpacity onPress={onClose} accessibilityLabel="Fechar" style={styles.close}>
            <MaterialCommunityIcons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {kind === 'ticket' && ticketCount > 1 ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.ticketSelector}>
            {Array.from({ length: ticketCount }, (_, index) => (
              <TouchableOpacity key={index} onPress={() => setTicketIndex(index)} style={[styles.ticketChip, ticketIndex === index && styles.ticketChipActive]}>
                <Text style={styles.ticketChipText}>Ingresso {index + 1}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        <ScrollView contentContainerStyle={styles.scroll}>
          {/* Limita a largura para o documento inteiro caber na tela; o ScaledDocument reduz a arte até esse tamanho. */}
          <View style={[styles.paper, { maxWidth: kind === 'ticket' ? 980 : 560 }]}>
            <ScaledDocument width={document.width}>
              <TemplateDocumentView document={document} />
            </ScaledDocument>
          </View>
        </ScrollView>

        <View style={styles.actions}>
          <View style={styles.actionItem}><Button title="Compartilhar" tone="green" onPress={handleShare} /></View>
          <View style={styles.actionItem}><Button title="Gerar PDF" tone="dark" onPress={handleDownload} /></View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.dark },
  topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 54, paddingBottom: 12 },
  title: { color: colors.text, fontSize: 18, fontFamily: theme.font.semiBold },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  ticketSelector: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  ticketChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ticketChipActive: { borderColor: colors.red },
  ticketChipText: { color: colors.text, fontFamily: theme.font.medium, fontSize: 12 },
  scroll: { paddingVertical: 16, paddingHorizontal: 12 },
  paper: { width: '100%', alignSelf: 'center', borderRadius: 8, overflow: 'hidden', boxShadow: '0 12px 40px rgba(0,0,0,0.45)' as any },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  actionItem: { flex: 1 }
});
