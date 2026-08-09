import { useState } from 'react';
import { Image, Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { getDocumentCode, getEventInfo } from '../documentUtils';
import { DocumentQRCode } from '../DocumentQRCode';
import { EventTicketStub } from './EventTicketStub';
import { styles } from './styles';

export function EventTicket({ sale, ticketIndex = 0 }: { sale: Sale; ticketIndex?: number }) {
  const [flyerFailed, setFlyerFailed] = useState(false);
  const event = getEventInfo(sale);
  const codigo = getDocumentCode(sale, ticketIndex);
  const dateParts = formatDateTime(event.date).split(' às ');

  return (
    <View style={styles.ticket}>
      <View style={styles.main}>
        {event.banner && !flyerFailed ? (
          <Image source={{ uri: event.banner }} style={styles.flyer} resizeMode="cover" onError={() => setFlyerFailed(true)} />
        ) : (
          <View style={styles.flyerFallback}>
            <Text style={styles.flyerFallbackText}>{event.name}</Text>
          </View>
        )}

        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>DATA</Text><Text style={styles.infoValue}>{dateParts[0] ?? '-'}</Text></View>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>INÍCIO</Text><Text style={styles.infoValue}>{dateParts[1] ?? '-'}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>LOCAL</Text><Text style={styles.infoValue}>{event.location}</Text></View>
        </View>
        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>PORTADOR</Text><Text style={styles.infoValue}>{sale.nome}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>CPF</Text><Text style={styles.infoValue}>{maskCpf(sale.cpf)}</Text></View>
        </View>
        <View style={styles.infoBar}>
          <View style={styles.infoCol}><Text style={styles.infoLabel}>VALOR</Text><Text style={styles.infoValue}>{formatCurrencyBRL(sale.valorUnitario)}</Text></View>
          <View style={[styles.infoCol, styles.infoColLast]}><Text style={styles.infoLabel}>CÓDIGO DO INGRESSO</Text><Text style={styles.infoValue}>{codigo}</Text></View>
        </View>

        <View style={styles.bottomRow}>
          <DocumentQRCode value={codigo} size={64} />
          <View style={styles.entranceBox}>
            <Text style={styles.entranceTitle}>APRESENTE NA ENTRADA</Text>
            <Text style={styles.entranceHint}>Este QR Code é único e pessoal. Não compartilhe.</Text>
          </View>
        </View>
      </View>

      <EventTicketStub codigo={codigo} />
    </View>
  );
}
