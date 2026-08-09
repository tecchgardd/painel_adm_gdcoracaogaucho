import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatDateTime, maskCpf } from '@/utils/format';
import { colors } from '@/theme/colors';

import { getDocumentCode, getEventInfo, getRegistrationFields } from '../documentUtils';
import { DocumentField } from '../shared/DocumentField';
import { DocumentLogo } from '../shared/DocumentLogo';
import { DocumentQRCode } from '../DocumentQRCode';

import { styles } from './styles';

export function CourseRegistrationReceipt({ sale }: { sale: Sale }) {
  const event = getEventInfo(sale);
  const fields = getRegistrationFields(sale);

  return (
    <View style={styles.sheet}>
      <View style={styles.header}>
        <Text style={styles.title}>COMPROVANTE DE INSCRIÇÃO</Text>
        <Text style={styles.subtitle}>CURSO DE DANÇAS GAÚCHAS</Text>
        <View style={styles.logoWrap}>
          <DocumentLogo size={130} />
        </View>
      </View>

      <View style={styles.confirmBanner}>
        <View style={styles.confirmOverlay} />
        <View style={styles.confirmCheck}>
          <MaterialCommunityIcons name="check-bold" size={14} color={colors.green} />
        </View>
        <Text style={styles.confirmText}>INSCRIÇÃO CONFIRMADA</Text>
      </View>
      <Text style={styles.paragraph}>Parabéns! Sua inscrição foi realizada com sucesso.</Text>

      <View style={styles.fields}>
        <DocumentField icon="account-outline" label="ALUNO(A)" value={sale.nome} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="card-account-details-outline" label="CPF" value={maskCpf(sale.cpf)} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="school-outline" label="CURSO" value={event.name} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="map-marker-outline" label="LOCAL" value={event.location} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="calendar-blank-outline" label="INÍCIO DAS AULAS" value={event.date ? formatDateTime(event.date) : undefined} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="account-heart-outline" label="TEM PAR" value={fields.temPar ? 'SIM' : 'NÃO'} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
        <DocumentField icon="account-multiple-outline" label="PAR" value={fields.parNome} textColor="#111111" mutedColor="#5A5A5A" badgeColor={colors.green} />
      </View>

      {event.observacao ? (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>ℹ️ INFORMAÇÕES IMPORTANTES</Text>
          <Text style={styles.infoText}>{event.observacao}</Text>
        </View>
      ) : null}

      <View style={styles.qrRow}>
        <DocumentQRCode value={getDocumentCode(sale)} size={84} />
      </View>

      <View style={styles.footer}>
        <View style={styles.footerOverlay} />
        <Text style={styles.footerText}>Coração que dança, tradição que encanta!</Text>
      </View>
      <View style={styles.hearts}>
        <MaterialCommunityIcons name="heart" size={16} color={colors.green} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.red} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.yellow} />
      </View>
    </View>
  );
}
