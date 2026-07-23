import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useEffect, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { AppModal, StatusBadge } from '@/components/ui';
import { useResponsive } from '@/hooks/useResponsive';
import { sendDocumentByEmail, sendDocumentByWhatsApp, shareDocument, receiptHtml, ticketHtml, viewOrPrintDocument } from '@/services/documents.service';
import { getSaleHistory } from '@/services/sales.service';
import { colors } from '@/theme/colors';
import type { Pagamento, PaymentHistory, Sale } from '@/types/entities';
import { formatCurrencyBRL, formatDateTime, maskCpf } from '@/utils/format';

type Tab = 'RESUMO' | 'ITENS' | 'PAGAMENTO' | 'DOCUMENTOS' | 'HISTORICO';

export function SaleDetailsModal({
  sale,
  onClose,
  onPaymentAction
}: {
  sale: Sale | null;
  onClose: () => void;
  onPaymentAction: (kind: 'edit' | 'external' | 'refund', paymentId: string) => void;
}) {
  const { isMobile } = useResponsive();
  const [tab, setTab] = useState<Tab>('RESUMO');
  const [doc, setDoc] = useState<'INGRESSO' | 'CUPOM'>('INGRESSO');
  const [history, setHistory] = useState<PaymentHistory[]>([]);
  const [historyError, setHistoryError] = useState('');
  const [ticketIndex, setTicketIndex] = useState(0);
  const payment = sale?.raw?.pagamentos?.find((item) => item.status === 'PAGO') ?? sale?.raw?.pagamentos?.[0];
  const ticketCount = Math.max(sale?.raw?.ingressos?.length ?? 0, sale?.raw?.loteIngresso?.tickets?.length ?? 0);
  const refundable = payment?.allowedActions?.refund ?? ['PAGO', 'PARCIALMENTE_ESTORNADO'].includes(String(payment?.status));
  const replaceable = payment?.allowedActions?.replaceWithExternal ?? (payment?.provider === 'STRIPE' && ['PENDENTE', 'PROCESSANDO', 'FALHOU', 'EXPIRADO'].includes(String(payment?.status)));

  useEffect(() => {
    setTab('RESUMO');
    setDoc('INGRESSO');
    setTicketIndex(0);
    setHistory([]);
    setHistoryError('');
  }, [sale?.id]);

  useEffect(() => {
    if (!sale || tab !== 'HISTORICO' || history.length) return;
    getSaleHistory(sale.id).then(setHistory).catch((error: { message?: string }) => setHistoryError(error.message ?? 'Não foi possível carregar o histórico.'));
  }, [history.length, sale, tab]);

  const ticket = useMemo(() => sale ? ticketHtml(sale, ticketIndex) : '', [sale, ticketIndex]);
  const receipt = useMemo(() => sale ? receiptHtml(sale) : '', [sale]);
  if (!sale) return null;

  return <AppModal visible={!!sale} onClose={onClose} position="center" title={`Venda ${sale.codigo}`}>
    <View style={styles.titleRow}>
      <View><Text style={styles.eyebrow}>GESTÃO DA VENDA</Text><Text style={styles.title}>{sale.eventoNome ?? 'Venda'}</Text></View>
      <StatusBadge status={sale.status} />
    </View>
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
      {(['RESUMO', 'ITENS', 'PAGAMENTO', 'DOCUMENTOS', 'HISTORICO'] as Tab[]).map((item) =>
        <TouchableOpacity key={item} style={[styles.tab, tab === item && styles.tabActive]} onPress={() => setTab(item)}>
          <Text style={[styles.tabText, tab === item && styles.tabTextActive]}>{item === 'DOCUMENTOS' ? 'Docs' : item === 'HISTORICO' ? 'Histórico' : item[0] + item.slice(1).toLowerCase()}</Text>
        </TouchableOpacity>)}
    </ScrollView>

    {tab === 'RESUMO' ? <View style={styles.panel}>
      <Info icon="account-outline" label="Comprador" value={sale.nome} secondary={maskCpf(sale.cpf)} />
      <Info icon="calendar-blank-outline" label="Evento/Curso" value={sale.eventoNome} />
      <Info icon="ticket-confirmation-outline" label="Quantidade" value={`${sale.quantidade} ${sale.tipo === 'CURSO' ? 'inscrição(ões)' : 'ingresso(s)'}`} />
      <Info icon="cash-multiple" label="Valor total" value={formatCurrencyBRL(sale.valorTotal)} />
      <Info icon="credit-card-outline" label="Forma de pagamento" value={sale.formaPagamento ?? '-'} />
      <Info icon="calendar-clock-outline" label="Data da venda" value={formatDateTime(sale.createdAt)} />
      <Info icon="check-circle-outline" label="Pago em" value={formatDateTime(sale.pagoEm ?? payment?.paidAt)} />
      <Info icon="store-outline" label="Origem" value={sale.origem ?? sale.raw?.origin ?? '-'} />
      {sale.observacao ? <Info icon="text-box-outline" label="Observações" value={sale.observacao} /> : null}
    </View> : null}

    {tab === 'ITENS' ? <View style={styles.stack}>
      {(sale.raw?.items ?? []).map((item, index) => <View style={styles.panel} key={String(item.id ?? index)}>
        <Text style={styles.cardTitle}>{item.description ?? item.nome ?? 'Item'}</Text>
        <Info icon="counter" label="Quantidade" value={String(item.quantity ?? item.quantidade ?? 1)} />
        <Info icon="cash" label="Valor unitário" value={formatCurrencyBRL(item.unitPrice ?? item.valorUnitario ?? 0)} />
        <Info icon="sale-outline" label="Desconto da venda" value={formatCurrencyBRL(sale.desconto)} />
        <Info icon="equal" label="Subtotal" value={formatCurrencyBRL(item.total ?? 0)} />
      </View>)}
      {!sale.raw?.items?.length ? <Empty text="Nenhum item retornado pelo backend." /> : null}
    </View> : null}

    {tab === 'PAGAMENTO' ? payment ? <View style={styles.stack}>
      <View style={styles.panel}>
        <Info icon="check-circle-outline" label="Status do pagamento" value={String(payment.status ?? '-')} />
        <Info icon="credit-card-outline" label="Forma de pagamento" value={payment.method ?? sale.formaPagamento ?? '-'} />
        <Info icon="cash-check" label="Valor pago" value={formatCurrencyBRL(Number(payment.amount ?? 0) / 100)} />
        <Info icon="calendar-check-outline" label="Data do pagamento" value={formatDateTime(payment.paidAt)} />
        <Info icon="identifier" label="Referência / Comprovante" value={payment.externalReference ?? '-'} />
        <Info icon="text-box-outline" label="Observação" value={payment.notes ?? '-'} />
      </View>
      <View style={[styles.actionGrid, isMobile && styles.actionGridMobile]}>
        {payment.allowedActions?.edit !== false && payment.provider !== 'STRIPE' ? <Action title="Editar pagamento" icon="pencil-outline" onPress={() => onPaymentAction('edit', payment.id)} /> : null}
        {replaceable ? <Action title="Substituir por pagamento externo" icon="swap-horizontal" danger onPress={() => onPaymentAction('external', payment.id)} /> : null}
        {refundable ? <Action title="Reembolsar" icon="cash-refund" danger onPress={() => onPaymentAction('refund', payment.id)} /> : null}
      </View>
      <Technical payment={payment} />
    </View> : <Empty text="Nenhum pagamento relacionado foi retornado." /> : null}

    {tab === 'DOCUMENTOS' ? <View style={styles.stack}>
      {!['PAGO', 'CORTESIA', 'PARCIALMENTE_ESTORNADO'].includes(sale.status) ? <Empty text="Documentos ficam disponíveis após a confirmação do pagamento." /> : <>
        <View style={styles.docSwitch}>
          <TouchableOpacity style={[styles.docTab, doc === 'INGRESSO' && styles.docTabActive]} onPress={() => setDoc('INGRESSO')}><Text style={styles.docTabText}>Ingresso / Inscrição</Text></TouchableOpacity>
          <TouchableOpacity style={[styles.docTab, doc === 'CUPOM' && styles.docTabActive]} onPress={() => setDoc('CUPOM')}><Text style={styles.docTabText}>Cupom</Text></TouchableOpacity>
        </View>
        {doc === 'INGRESSO' && ticketCount > 1 ? <ScrollView horizontal contentContainerStyle={styles.ticketSelector}>{Array.from({ length: ticketCount }, (_, index) => <TouchableOpacity key={index} onPress={() => setTicketIndex(index)} style={[styles.ticketChip, ticketIndex === index && styles.ticketChipActive]}><Text style={styles.docTabText}>Ingresso {index + 1}</Text></TouchableOpacity>)}</ScrollView> : null}
        {doc === 'INGRESSO' ? <TicketPreview sale={sale} ticketIndex={ticketIndex} /> : <ReceiptPreview sale={sale} />}
        <View style={[styles.actionGrid, isMobile && styles.actionGridMobile]}>
          <Action title={PlatformLabel('Visualizar / Imprimir', 'Visualizar')} icon="eye-outline" onPress={() => viewOrPrintDocument(doc === 'INGRESSO' ? ticket : receipt)} />
          <Action title="Baixar PDF" icon="download-outline" onPress={() => shareDocument(doc === 'INGRESSO' ? ticket : receipt, `Baixar ${doc.toLowerCase()}`)} />
          <Action title="Compartilhar" icon="share-variant-outline" green onPress={() => shareDocument(doc === 'INGRESSO' ? ticket : receipt, `Compartilhar ${doc.toLowerCase()}`)} />
          <Action title="Enviar por WhatsApp" icon="whatsapp" onPress={() => sendDocumentByWhatsApp(sale, doc === 'INGRESSO' ? 'Ingresso' : 'Cupom da compra')} />
          <Action title="Enviar por e-mail" icon="email-outline" onPress={() => sendDocumentByEmail(sale, doc === 'INGRESSO' ? 'Ingresso' : 'Cupom da compra')} />
        </View>
      </>}
    </View> : null}

    {tab === 'HISTORICO' ? <View style={styles.timeline}>
      {history.map((item) => <View key={item.id} style={styles.historyItem}><View style={styles.historyDot} /><View style={styles.historyBody}><Text style={styles.cardTitle}>{humanAction(item.action)}</Text><Text style={styles.muted}>{formatDateTime(item.createdAt)} · {item.userName ?? 'Sistema'}</Text>{item.fromStatus || item.toStatus ? <Text style={styles.historyStatus}>{item.fromStatus ?? '-'} → {item.toStatus ?? '-'}</Text> : null}{item.reason ? <Text style={styles.muted}>{item.reason}</Text> : null}</View></View>)}
      {historyError ? <Empty text={historyError} /> : null}
      {!history.length && !historyError ? <Empty text="Carregando histórico..." /> : null}
    </View> : null}
  </AppModal>;
}

function PlatformLabel(web: string, native: string) {
  return typeof document !== 'undefined' ? web : native;
}
function humanAction(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}
function Info({ icon, label, value, secondary }: { icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; label: string; value?: string; secondary?: string }) {
  return <View style={styles.info}><MaterialCommunityIcons name={icon} size={21} color={colors.text} /><View style={styles.infoBody}><Text style={styles.label}>{label}</Text><Text style={styles.infoValue}>{value || '-'}</Text>{secondary ? <Text style={styles.muted}>{secondary}</Text> : null}</View></View>;
}
function Action({ title, icon, onPress, danger, green }: { title: string; icon: React.ComponentProps<typeof MaterialCommunityIcons>['name']; onPress: () => void; danger?: boolean; green?: boolean }) {
  return <TouchableOpacity style={[styles.action, danger && styles.actionDanger, green && styles.actionGreen]} onPress={onPress}><MaterialCommunityIcons name={icon} size={21} color={danger ? colors.red : green ? '#55C467' : colors.text} /><Text style={[styles.actionText, danger && { color: colors.red }]}>{title}</Text></TouchableOpacity>;
}
function Empty({ text }: { text: string }) { return <View style={styles.empty}><MaterialCommunityIcons name="information-outline" size={22} color={colors.muted} /><Text style={styles.muted}>{text}</Text></View>; }
function Technical({ payment }: { payment: Pagamento }) {
  const [open, setOpen] = useState(false);
  return <View style={styles.panel}><TouchableOpacity style={styles.technicalHeader} onPress={() => setOpen(!open)}><Text style={styles.cardTitle}>Dados técnicos</Text><MaterialCommunityIcons name={open ? 'chevron-up' : 'chevron-down'} size={22} color={colors.muted} /></TouchableOpacity>{open ? <View><Text style={styles.muted}>Checkout Session: {payment.stripeCheckoutSessionId ?? '-'}</Text><Text style={styles.muted}>PaymentIntent: {payment.stripePaymentIntentId ?? '-'}</Text><Text style={styles.muted}>Charge: {payment.stripeChargeId ?? '-'}</Text></View> : null}</View>;
}
function TicketPreview({ sale, ticketIndex }: { sale: Sale; ticketIndex: number }) {
  const event = sale.raw?.evento;
  const ticket = sale.raw?.ingressos?.[ticketIndex] ?? sale.raw?.loteIngresso?.tickets?.[ticketIndex];
  const code = 'qrcode' in (ticket ?? {}) ? ticket?.qrcode : undefined;
  return <View style={styles.document}><View style={styles.documentHead}><Text style={styles.documentBrand}>CORAÇÃO GAÚCHO</Text><Text style={styles.documentTitle}>{sale.eventoNome}</Text><Text style={styles.documentSubtitle}>{sale.tipo === 'CURSO' ? 'INSCRIÇÃO CONFIRMADA' : 'INGRESSO CONFIRMADO'}</Text></View><View style={styles.documentBody}><Image source={require('../../../assets/logo-oficial.jpeg')} style={styles.documentLogo} /><Text style={styles.label}>PARTICIPANTE</Text><Text style={styles.documentValue}>{sale.nome}</Text><Text style={styles.label}>CPF</Text><Text style={styles.documentValue}>{maskCpf(sale.cpf)}</Text><Text style={styles.label}>DATA E LOCAL</Text><Text style={styles.documentValue}>{formatDateTime(event?.data ?? event?.date)} · {event?.local ?? event?.location ?? event?.cidade ?? '-'}</Text><View style={styles.qr}><MaterialCommunityIcons name="qrcode" size={92} color="#111" /><Text style={styles.qrCode}>{code ?? sale.codigo}</Text></View></View><View style={styles.documentFoot}><Text style={styles.documentFootText}>Documento pessoal, intransferível e de uso único.</Text></View></View>;
}
function ReceiptPreview({ sale }: { sale: Sale }) {
  return <View style={[styles.document, styles.receipt]}><Image source={require('../../../assets/logo-oficial.jpeg')} style={styles.receiptLogo} /><Text style={styles.receiptTitle}>CUPOM DA COMPRA</Text><Text style={styles.receiptNotice}>NÃO É DOCUMENTO FISCAL</Text><Text style={styles.receiptLine}>Venda: {sale.codigo}</Text><Text style={styles.receiptLine}>Comprador: {sale.nome}</Text><Text style={styles.receiptLine}>CPF: {maskCpf(sale.cpf)}</Text><View style={styles.receiptRule} />{(sale.raw?.items ?? []).map((item, index) => <View key={index} style={styles.receiptRow}><Text style={styles.receiptLine}>{item.description ?? item.nome}</Text><Text style={styles.receiptLine}>{item.quantity ?? item.quantidade ?? 1} × {formatCurrencyBRL(item.unitPrice ?? item.valorUnitario ?? 0)}</Text></View>)}<View style={styles.receiptRule} /><Text style={styles.receiptTotal}>TOTAL {formatCurrencyBRL(sale.valorTotal)}</Text><Text style={styles.receiptLine}>Pagamento: {sale.formaPagamento ?? '-'}</Text><Text style={styles.receiptThanks}>Obrigado pela confiança!{'\n'}Volte sempre.</Text></View>;
}

const styles = StyleSheet.create({
  titleRow:{flexDirection:'row',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:14},eyebrow:{color:colors.red,fontSize:10,fontWeight:'900',letterSpacing:1.5},title:{color:colors.text,fontSize:20,fontWeight:'900',marginTop:3},tabs:{gap:6,paddingBottom:14},tab:{minHeight:38,paddingHorizontal:13,borderRadius:10,alignItems:'center',justifyContent:'center'},tabActive:{backgroundColor:colors.red},tabText:{color:colors.muted,fontSize:12,fontWeight:'800'},tabTextActive:{color:'#fff'},stack:{gap:12},panel:{backgroundColor:colors.card,borderWidth:1,borderColor:colors.border,borderRadius:14,paddingHorizontal:14,paddingVertical:5},info:{minHeight:64,flexDirection:'row',alignItems:'center',gap:12,borderBottomWidth:1,borderBottomColor:colors.border},infoBody:{flex:1,paddingVertical:10},label:{color:colors.muted,fontSize:11,fontWeight:'700'},infoValue:{color:colors.text,fontSize:15,fontWeight:'800',marginTop:3},muted:{color:colors.muted,fontSize:12,lineHeight:18},cardTitle:{color:colors.text,fontWeight:'900',fontSize:14},empty:{minHeight:90,alignItems:'center',justifyContent:'center',gap:8,borderRadius:14,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,padding:16},actionGrid:{flexDirection:'row',flexWrap:'wrap',gap:10},actionGridMobile:{flexDirection:'column'},action:{flex:1,minWidth:190,minHeight:52,borderRadius:12,borderWidth:1,borderColor:colors.border,backgroundColor:colors.card,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:9,paddingHorizontal:12},actionDanger:{borderColor:colors.red,backgroundColor:'#261313'},actionGreen:{borderColor:'#2E7D32',backgroundColor:'#15331B'},actionText:{color:colors.text,fontWeight:'800',fontSize:13,textAlign:'center'},technicalHeader:{minHeight:50,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},docSwitch:{flexDirection:'row',backgroundColor:colors.card,borderRadius:12,borderWidth:1,borderColor:colors.border,padding:3},docTab:{flex:1,minHeight:40,alignItems:'center',justifyContent:'center',borderRadius:9},docTabActive:{backgroundColor:'#6A1B1B'},docTabText:{color:colors.text,fontWeight:'800',fontSize:12},ticketSelector:{gap:8},ticketChip:{paddingHorizontal:12,paddingVertical:8,borderRadius:10,backgroundColor:colors.card,borderWidth:1,borderColor:colors.border},ticketChipActive:{borderColor:colors.red},document:{alignSelf:'center',width:'100%',maxWidth:480,borderRadius:12,overflow:'hidden',backgroundColor:'#F7F4F0',borderWidth:1,borderColor:'#873030'},documentHead:{backgroundColor:'#681B1B',padding:20,alignItems:'center'},documentBrand:{color:'#E0AC3D',fontSize:11,fontWeight:'900',letterSpacing:2},documentTitle:{color:'#fff',fontSize:22,fontWeight:'900',textAlign:'center',marginTop:8},documentSubtitle:{color:'#fff',fontSize:11,fontWeight:'800',marginTop:4},documentBody:{padding:20},documentLogo:{position:'absolute',right:16,top:16,width:54,height:54,borderRadius:27},documentValue:{color:'#111',fontSize:14,fontWeight:'800',marginBottom:13,marginTop:2,maxWidth:'75%'},qr:{alignSelf:'center',alignItems:'center',marginTop:10},qrCode:{color:'#111',fontSize:10,fontWeight:'800',marginTop:4},documentFoot:{backgroundColor:'#681B1B',padding:14},documentFootText:{color:'#fff',fontSize:10,textAlign:'center'},receipt:{padding:22,borderStyle:'dashed',borderColor:'#777',borderRadius:0},receiptLogo:{width:58,height:58,borderRadius:29,alignSelf:'center'},receiptTitle:{color:'#111',fontSize:20,fontWeight:'900',textAlign:'center',marginTop:10},receiptNotice:{color:'#111',fontSize:11,fontWeight:'900',textAlign:'center',marginBottom:14},receiptLine:{color:'#111',fontSize:11,flex:1},receiptRule:{borderTopWidth:1,borderStyle:'dashed',borderColor:'#555',marginVertical:12},receiptRow:{flexDirection:'row',justifyContent:'space-between',gap:12,marginBottom:5},receiptTotal:{color:'#111',fontSize:17,fontWeight:'900',textAlign:'right'},receiptThanks:{color:'#111',fontSize:12,textAlign:'center',marginTop:22},timeline:{gap:0},historyItem:{flexDirection:'row',gap:12,minHeight:76},historyDot:{width:12,height:12,borderRadius:6,backgroundColor:colors.red,marginTop:5},historyBody:{flex:1,borderLeftWidth:1,borderLeftColor:colors.border,paddingLeft:14,paddingBottom:18},historyStatus:{color:colors.yellow,fontSize:12,fontWeight:'800',marginTop:4}
});
