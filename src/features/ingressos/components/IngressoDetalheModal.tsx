import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { DocumentPreviewModal } from '@/features/documentos/components/DocumentPreviewModal';
import { DocumentQRCode } from '@/features/documentos/components/DocumentQRCode';
import { atualizarIngresso } from '@/features/ingressos/services/ingressos.service';
import { nomeDoPortador, podeTrocarPortador, SITUACAO_LABELS, type IngressoView } from '@/features/ingressos/utils/ingresso';
import { getSale } from '@/features/vendas/services/sales.service';
import { AppModal, Button, FormField, FormRow, FormSection, InfoList, InfoRow, StatusBadge } from '@/shared/components/ui';
import type { Sale } from '@/shared/types/entities';
import { formatDateTime, maskCpf } from '@/shared/utils/format';
import { colors, theme } from '@/theme/theme';

type Mode = 'detalhe' | 'portador' | 'cancelar';

export function IngressoDetalheModal({ ingresso, isAdmin, onClose, onChanged }: { ingresso: IngressoView | null; isAdmin: boolean; onClose: () => void; onChanged: () => void }) {
  const [mode, setMode] = useState<Mode>('detalhe');
  const [portadorNome, setPortadorNome] = useState('');
  const [portadorCpf, setPortadorCpf] = useState('');
  const [motivo, setMotivo] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sale, setSale] = useState<Sale | null>(null);
  const [ticketIndex, setTicketIndex] = useState(0);

  useEffect(() => {
    setMode('detalhe');
    setError('');
    setMotivo('');
    setPortadorNome(ingresso?.portador.nome ?? '');
    setPortadorCpf(ingresso?.portador.cpf ?? '');
  }, [ingresso]);

  if (!ingresso) return null;
  const current = ingresso;

  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    try {
      await action();
      onChanged();
      onClose();
    } catch (actionError) {
      setError((actionError as { message?: string })?.message ?? 'Não foi possível concluir a operação.');
    } finally {
      setBusy(false);
    }
  }

  async function abrirDocumento() {
    if (!current.vendaId) return;
    setBusy(true);
    setError('');
    try {
      const venda = await getSale(current.vendaId);
      // Ingresso montado da venda tem id 'venda-<id>-<n>': abre direto na n-ésima unidade.
      const index = current.sintetico
        ? Number(current.id.split('-').pop()) - 1
        : (venda.raw?.ingressos ?? []).findIndex((item) => String(item.id) === current.id || item.qrcode === current.codigo);
      setTicketIndex(Math.max(0, index));
      setSale(venda);
    } catch (loadError) {
      setError((loadError as { message?: string })?.message ?? 'Não foi possível abrir o ingresso.');
    } finally {
      setBusy(false);
    }
  }

  const footer = mode === 'portador'
    ? <View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setMode('detalhe')} /></View>
      <View style={styles.footerItem}><Button title={busy ? 'Salvando...' : 'Salvar portador'} tone="green" disabled={busy || portadorNome.trim().length < 2} onPress={() => run(() => atualizarIngresso(current.id, { portadorNome: portadorNome.trim(), portadorCpf: portadorCpf.replace(/\D/g, '') || undefined }))} /></View>
    </View>
    : mode === 'cancelar'
      ? <View style={styles.footer}>
        <View style={styles.footerItem}><Button title="Voltar" tone="dark" onPress={() => setMode('detalhe')} /></View>
        <View style={styles.footerItem}><Button title={busy ? 'Cancelando...' : 'Cancelar ingresso'} tone="red" disabled={busy || motivo.trim().length < 3} onPress={() => run(() => atualizarIngresso(current.id, { status: 'CANCELADO', motivo: motivo.trim() }))} /></View>
      </View>
      : undefined;

  return <>
    <AppModal visible={!!ingresso && !sale} onClose={onClose} title={`Ingresso ${current.codigo}`} subtitle={current.evento.nome} footer={footer}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {mode === 'detalhe' ? <>
        <View style={styles.top}>
          <DocumentQRCode value={current.codigo} size={140} />
          <View style={styles.topCopy}>
            <StatusBadge status={current.situacao} />
            {current.cortesia ? <Text style={styles.tag}>Cortesia</Text> : null}
            <Text style={styles.holder}>{nomeDoPortador(current)}</Text>
            <Text style={styles.code}>{current.codigo}</Text>
          </View>
        </View>
        <InfoList>
          <InfoRow label="Evento" value={current.evento.nome} />
          {current.evento.data ? <InfoRow label="Data do evento" value={formatDateTime(current.evento.data)} /> : null}
          <InfoRow label="Portador" value={current.portador.nome ? `${current.portador.nome}${current.portador.cpf ? ` · ${maskCpf(current.portador.cpf)}` : ''}` : 'O próprio comprador'} />
          <InfoRow label="Comprador" value={current.comprador.nome ? `${current.comprador.nome}${current.comprador.cpf ? ` · ${maskCpf(current.comprador.cpf)}` : ''}` : undefined} />
          <InfoRow label="Situação" value={SITUACAO_LABELS[current.situacao]} />
          {current.validadoEm ? <InfoRow label="Entrada" value={`${formatDateTime(current.validadoEm)}${current.validadoPor ? ` · ${current.validadoPor}` : ''}`} /> : null}
          {current.vendaId ? <InfoRow label="Venda" value={`#${current.vendaId}`} /> : null}
        </InfoList>
        <View style={styles.actions}>
          {current.vendaId ? <View style={styles.action}><Button title={busy ? 'Abrindo...' : 'Ver / reenviar ingresso'} tone="soft" disabled={busy} onPress={abrirDocumento} /></View> : null}
          {podeTrocarPortador(current) ? <View style={styles.action}><Button title="Trocar portador" tone="dark" onPress={() => setMode('portador')} /></View> : null}
          {isAdmin && !current.sintetico && current.situacao !== 'CANCELADO' && current.situacao !== 'UTILIZADO' ? <View style={styles.action}><Button title="Cancelar ingresso" tone="dark" onPress={() => setMode('cancelar')} /></View> : null}
        </View>
        {current.sintetico ? <Text style={styles.note}>Este ingresso foi montado a partir da venda, porque a API ainda não devolve os ingressos individuais. Troca de portador e cancelamento ficam disponíveis quando o backend expuser cada ingresso.</Text> : null}
      </> : null}

      {mode === 'portador' ? <FormSection first title="Novo portador" description="Quem vai usar este ingresso. Pode ser trocado até a entrada no evento.">
        <FormRow>
          <FormField required label="Nome do portador" value={portadorNome} onChangeText={setPortadorNome} placeholder="Nome e sobrenome" />
          <FormField label="CPF do portador" value={portadorCpf} onChangeText={setPortadorCpf} keyboardType="numeric" placeholder="000.000.000-00" />
        </FormRow>
      </FormSection> : null}

      {mode === 'cancelar' ? <FormSection first title="Cancelar ingresso" description="O ingresso deixa de valer na portaria. O pagamento da venda não é estornado automaticamente; se for o caso, faça o reembolso em Pagamentos.">
        <FormField required label="Motivo do cancelamento" value={motivo} onChangeText={setMotivo} multiline placeholder="Ex.: troca de data solicitada pelo cliente" />
      </FormSection> : null}
    </AppModal>

    <DocumentPreviewModal visible={!!sale} sale={sale} kind="ticket" initialTicketIndex={ticketIndex} onClose={() => setSale(null)} />
  </>;
}

const styles = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', gap: 18, marginBottom: 16 },
  topCopy: { flex: 1, minWidth: 0, gap: 6 },
  tag: { alignSelf: 'flex-start', color: colors.goldAccent, fontSize: 12, fontFamily: theme.font.medium },
  holder: { color: colors.text, fontSize: 18, lineHeight: 24, fontFamily: theme.font.semiBold },
  code: { color: colors.muted, fontSize: 13, fontFamily: theme.font.medium, letterSpacing: 1 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 16 },
  action: { flexGrow: 1, minWidth: 160 },
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  error: { color: colors.red, fontFamily: theme.font.medium, marginBottom: 10 },
  note: { color: colors.subtle, fontSize: 12, lineHeight: 17, fontFamily: theme.font.regular, marginTop: 12 }
});
