import React from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppModal, Button, ChoiceGroup, FormSection } from '@/shared/components/ui';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { exportarLista, type FormatoExportacao } from '@/shared/services/exportacao.service';
import type { ExportColumn } from '@/shared/utils/exportacao';
import { gridCellStyle, gridContainer } from '@/shared/components/ui/grid';
import { colors, theme } from '@/theme/theme';

type PressState = { pressed: boolean; hovered?: boolean };

const padroes = <T,>(columns: ExportColumn<T>[]) => columns.filter((column) => column.padrao).map((column) => column.key);

/**
 * Exportação de uma lista já filtrada/ordenada: formato (CSV ou PDF) e colunas escolhidas pelo operador.
 * As linhas exportadas são exatamente as da tela (mesmos filtros e ordem).
 */
export function ExportModal<T>({ visible, onClose, titulo, subtitulo, columns, rows }: {
  visible: boolean;
  onClose: () => void;
  titulo: string;
  /** Descrição dos filtros aplicados; vai no topo do PDF. */
  subtitulo?: string;
  columns: ExportColumn<T>[];
  rows: T[];
}) {
  const { isMobile } = useResponsive();
  const [formato, setFormato] = React.useState<FormatoExportacao>('csv');
  const [selecionadas, setSelecionadas] = React.useState<string[]>(() => padroes(columns));
  const [exportando, setExportando] = React.useState(false);
  const [erro, setErro] = React.useState('');
  const escolhidas = columns.filter((column) => selecionadas.includes(column.key));
  const celula = gridCellStyle(isMobile ? 1 : 2);
  const muitasNoPdf = formato === 'pdf' && escolhidas.length > 10;

  function alternar(key: string) {
    setSelecionadas((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  }

  async function exportar() {
    if (!escolhidas.length) return;
    setErro('');
    setExportando(true);
    try {
      await exportarLista({ formato, titulo, subtitulo, columns: escolhidas, rows });
      onClose();
    } catch (failure) {
      setErro((failure as { message?: string })?.message ?? 'Não foi possível gerar o arquivo.');
    } finally {
      setExportando(false);
    }
  }

  return <AppModal
    visible={visible}
    onClose={onClose}
    title={`Exportar ${titulo.toLowerCase()}`}
    subtitle={`${rows.length} registro(s) com os filtros e a ordem atuais da tela.`}
    footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
      <View style={styles.footerItem}><Button
        title={exportando ? 'Gerando...' : `Exportar ${formato.toUpperCase()}`}
        tone="green"
        disabled={!escolhidas.length || !rows.length}
        onPress={exportando ? undefined : exportar}
      /></View>
    </View>}
  >
    <FormSection first title="Formato">
      <ChoiceGroup
        tone="green"
        value={formato}
        onChange={(value) => setFormato(value as FormatoExportacao)}
        options={[
          { value: 'csv', label: 'Planilha (CSV)', icon: 'file-delimited-outline' },
          { value: 'pdf', label: 'Relatório (PDF)', icon: 'file-pdf-box' }
        ]}
      />
      <Text style={styles.hint}>{formato === 'csv' ? 'Abre no Excel ou Google Planilhas, com todas as colunas escolhidas.' : 'Tabela em A4 deitado, pronta para imprimir ou enviar.'}</Text>
    </FormSection>

    <FormSection title="Colunas" description={`${escolhidas.length} de ${columns.length} selecionada(s). A ordem segue a lista abaixo.`}>
      <View style={styles.atalhos}>
        <Atalho label="Todas" onPress={() => setSelecionadas(columns.map((column) => column.key))} />
        <Atalho label="Padrão" onPress={() => setSelecionadas(padroes(columns))} />
        <Atalho label="Nenhuma" onPress={() => setSelecionadas([])} />
      </View>
      <View style={styles.colunas}>
        {columns.map((column) => {
          const ativa = selecionadas.includes(column.key);
          return <View key={column.key} style={celula}><Pressable
            onPress={() => alternar(column.key)}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: ativa }}
            accessibilityLabel={column.label}
            style={(state) => [styles.coluna, ativa && styles.colunaAtiva, (state as PressState).hovered && styles.colunaHover]}
          >
            <MaterialCommunityIcons name={ativa ? 'checkbox-marked' : 'checkbox-blank-outline'} size={20} color={ativa ? colors.green : colors.muted} />
            <Text numberOfLines={1} style={[styles.colunaTexto, ativa && styles.colunaTextoAtiva]}>{column.label}</Text>
          </Pressable></View>;
        })}
      </View>
      {muitasNoPdf ? <Text style={styles.aviso}>Com mais de 10 colunas o PDF fica apertado; para relatórios completos prefira o CSV.</Text> : null}
      {!escolhidas.length ? <Text style={styles.erro}>Escolha ao menos uma coluna.</Text> : null}
      {!rows.length ? <Text style={styles.erro}>Nenhum registro com os filtros atuais.</Text> : null}
      {erro ? <Text style={styles.erro}>{erro}</Text> : null}
    </FormSection>
  </AppModal>;
}

/** Botão compacto "Exportar" para o `right` da FilterBar. */
export function ExportButton({ onPress }: { onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel="Exportar CSV ou PDF" style={(state) => [styles.exportButton, (state as PressState).hovered && styles.colunaHover]}>
    <MaterialCommunityIcons name="tray-arrow-down" size={16} color={colors.text} />
    <Text style={styles.atalhoTexto}>Exportar</Text>
  </Pressable>;
}

function Atalho({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={(state) => [styles.atalho, (state as PressState).hovered && styles.colunaHover]}>
    <Text style={styles.atalhoTexto}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  hint: { color: colors.muted, fontSize: 12, lineHeight: 18, fontFamily: theme.font.regular, marginTop: 8 },
  atalhos: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  atalho: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft },
  exportButton: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 42, paddingHorizontal: 12, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.dark },
  atalhoTexto: { color: colors.text, fontSize: 12, fontFamily: theme.font.medium },
  colunas: gridContainer,
  coluna: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderRadius: theme.radius.md, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: colors.cardAlt },
  colunaAtiva: { borderColor: colors.green + '80', backgroundColor: colors.greenSoft },
  colunaHover: { opacity: 0.85 },
  colunaTexto: { flex: 1, color: colors.muted, fontSize: 13, fontFamily: theme.font.regular },
  colunaTextoAtiva: { color: colors.text, fontFamily: theme.font.medium },
  aviso: { color: colors.text, fontSize: 12, lineHeight: 18, fontFamily: theme.font.regular, marginTop: 10, backgroundColor: colors.yellowSoft, borderRadius: theme.radius.md, padding: 10 },
  erro: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 10 }
});
