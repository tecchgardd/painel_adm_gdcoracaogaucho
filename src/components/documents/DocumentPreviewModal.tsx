import { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

import { Button } from '@/components/ui';
import { colors } from '@/theme/colors';
import type { Sale } from '@/types/entities';

import { CourseRegistrationReceipt } from './CourseRegistrationReceipt/CourseRegistrationReceipt';
import { COURSE_RECEIPT_WIDTH } from './CourseRegistrationReceipt/styles';
import { EventTicket } from './EventTicket/EventTicket';
import { EVENT_TICKET_WIDTH } from './EventTicket/styles';
import { PaymentReceipt } from './PaymentReceipt/PaymentReceipt';
import { PAYMENT_RECEIPT_WIDTH } from './PaymentReceipt/styles';
import { ScaledDocument } from './shared/ScaledDocument';

export type DocumentKind = 'ticket' | 'receipt' | 'registration';

const TITLES: Record<DocumentKind, string> = { ticket: 'Ingresso', receipt: 'Cupom / Comprovante de Pagamento', registration: 'Comprovante de Inscrição' };

export function DocumentPreviewModal({ visible, onClose, sale, kind }: { visible: boolean; onClose: () => void; sale: Sale | null; kind: DocumentKind }) {
  const [ticketIndex, setTicketIndex] = useState(0);
  const ticketCount = Math.max(sale?.raw?.ingressos?.length ?? 0, sale?.raw?.loteIngresso?.tickets?.length ?? 0, 1);

  const width = kind === 'ticket' ? EVENT_TICKET_WIDTH : kind === 'registration' ? COURSE_RECEIPT_WIDTH : PAYMENT_RECEIPT_WIDTH;

  async function handleShare() {
    if (!sale) return;
    const { shareSaleDocument } = await import('@/services/documents.service');
    await shareSaleDocument(sale, kind, ticketIndex);
  }

  async function handleDownload() {
    if (!sale) return;
    const { downloadSaleDocument } = await import('@/services/documents.service');
    await downloadSaleDocument(sale, kind, ticketIndex);
  }

  if (!sale) return null;

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
          <ScaledDocument width={width}>
            {kind === 'ticket' ? <EventTicket sale={sale} ticketIndex={ticketIndex} /> : null}
            {kind === 'registration' ? <CourseRegistrationReceipt sale={sale} /> : null}
            {kind === 'receipt' ? <PaymentReceipt sale={sale} /> : null}
          </ScaledDocument>
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
  title: { color: colors.text, fontSize: 18, fontWeight: '900' },
  close: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  ticketSelector: { gap: 8, paddingHorizontal: 16, paddingBottom: 8 },
  ticketChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  ticketChipActive: { borderColor: colors.red },
  ticketChipText: { color: colors.text, fontWeight: '800', fontSize: 12 },
  scroll: { alignItems: 'center', paddingVertical: 16, paddingHorizontal: 12 },
  actions: { flexDirection: 'row', gap: 12, paddingHorizontal: 16, paddingBottom: 24, paddingTop: 8 },
  actionItem: { flex: 1 }
});
