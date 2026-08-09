import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Text, View } from 'react-native';

import type { Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';
import { colors } from '@/theme/colors';
import { getDocumentCode, getReceiptItems, getReceiptPaymentMethodLabel, getReceiptTotals } from '../documentUtils';
import { DocumentDivider } from '../shared/DocumentDivider';
import { DocumentLogo } from '../shared/DocumentLogo';
import { DocumentQRCode } from '../DocumentQRCode';
import { styles } from './styles';

export function PaymentReceipt({ sale, title = 'CUPOM', subtitle = 'COMPROVANTE DE PAGAMENTO' }: { sale: Sale; title?: string; subtitle?: string }) {
  const items = getReceiptItems(sale);
  const { subtotal, ajusteLabel, ajusteValor } = getReceiptTotals(sale);
  const metodo = getReceiptPaymentMethodLabel(sale);

  return (
    <View style={styles.sheet}>
      <View style={styles.headerRow}>
        <DocumentLogo size={48} />
        <Text style={styles.companyName}>GRUPO DE DANÇAS{'\n'}CORAÇÃO GAÚCHO</Text>
      </View>

      <DocumentDivider variant="solid" color="#111111" />
      <View style={styles.titleBlock}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      <View style={styles.row}><Text style={styles.label}>Nº DO CUPOM</Text><Text style={styles.value}>{sale.codigo}</Text></View>
      <View style={styles.row}><Text style={styles.label}>DATA</Text><Text style={styles.value}>{formatDateTime(sale.createdAt)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>CÓDIGO DO INGRESSO</Text><Text style={styles.value}>{getDocumentCode(sale)}</Text></View>
      <View style={styles.row}><Text style={styles.label}>FORMA DE PAGAMENTO</Text><Text style={styles.value}>{metodo}</Text></View>

      <View style={styles.spacerSm} />
      <DocumentDivider variant="dashed" color={colors.muted} />
      <Text style={styles.sectionTitle}>DADOS DO PARTICIPANTE</Text>
      <View style={styles.row}><Text style={styles.label}>Nome</Text><Text style={styles.value}>{sale.nome}</Text></View>
      <View style={styles.row}><Text style={styles.label}>CPF</Text><Text style={styles.value}>{maskCpf(sale.cpf)}</Text></View>

      <View style={styles.spacerSm} />
      <DocumentDivider variant="dashed" color={colors.muted} />
      <View style={styles.itemHeaderRow}>
        <Text style={[styles.itemHeaderText, styles.colDescricao]}>DESCRIÇÃO</Text>
        <Text style={[styles.itemHeaderText, styles.colQtd]}>QTD</Text>
        <Text style={[styles.itemHeaderText, styles.colUn]}>UN.</Text>
        <Text style={[styles.itemHeaderText, styles.colUnit]}>VL. UNIT.</Text>
        <Text style={[styles.itemHeaderText, styles.colTotal]}>VL. TOTAL</Text>
      </View>
      {items.map((item, index) => (
        <View key={index} style={styles.itemRow}>
          <Text style={[styles.itemText, styles.colDescricao]}>{item.description}</Text>
          <Text style={[styles.itemText, styles.colQtd]}>{item.quantity}</Text>
          <Text style={[styles.itemText, styles.colUn]}>UN</Text>
          <Text style={[styles.itemText, styles.colUnit]}>{formatCurrencyBRL(item.unitPrice)}</Text>
          <Text style={[styles.itemText, styles.colTotal]}>{formatCurrencyBRL(item.total)}</Text>
        </View>
      ))}

      <View style={styles.totalsBlock}>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>SUBTOTAL</Text><Text style={styles.totalValue}>{formatCurrencyBRL(subtotal)}</Text></View>
        {ajusteLabel ? (
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>{ajusteLabel.toUpperCase()}</Text>
            <Text style={styles.totalValue}>{formatCurrencyBRL(ajusteValor)}</Text>
          </View>
        ) : null}
        <DocumentDivider variant="solid" color="#111111" />
        <View style={styles.totalRow}><Text style={styles.grandTotalLabel}>TOTAL</Text><Text style={styles.grandTotalValue}>{formatCurrencyBRL(sale.valorTotal)}</Text></View>
        <View style={styles.spacerSm} />
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Valor pago via {metodo}</Text><Text style={styles.totalValue}>{formatCurrencyBRL(sale.valorTotal)}</Text></View>
        <View style={styles.totalRow}><Text style={styles.totalLabel}>Troco</Text><Text style={styles.totalValue}>{formatCurrencyBRL(0)}</Text></View>
      </View>

      <View style={styles.authBlock}>
        <Text style={styles.authText}>Autenticação: {`${sale.codigo}|${sale.id}`}</Text>
      </View>

      <View style={styles.thanksRow}>
        <DocumentQRCode value={`${sale.codigo}|${sale.id}`} size={70} />
        <View style={{ flex: 1 }}>
          <Text style={styles.thanksTitle}>Obrigado por prestigiar a cultura gaúcha!</Text>
          <Text style={styles.thanksSubtitle}>Coração que dança,{'\n'}tradição que encanta!</Text>
        </View>
      </View>

      <View style={styles.hearts}>
        <MaterialCommunityIcons name="heart" size={16} color={colors.green} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.red} />
        <MaterialCommunityIcons name="heart" size={16} color={colors.yellow} />
      </View>
    </View>
  );
}
