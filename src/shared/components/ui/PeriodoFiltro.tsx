import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { AppModal, Button, FormField, FormRow } from '@/shared/components/ui';
import type { FilterConfig } from '@/shared/components/ui/FilterBar';
import { intervaloDoPeriodo, parseDataBr, PERIODO_OPTIONS, type PeriodoPreset } from '@/shared/utils/listaAvancada';
import { colors, theme } from '@/theme/theme';

function mascaraData(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  return [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4)].filter(Boolean).join('/');
}

/**
 * Filtro de período para a FilterBar: presets ("Últimos 30 dias", "Este mês"...) e "Personalizado…",
 * que abre um modal com as datas inicial e final (dd/mm/aaaa). Devolve o `filter`, o `intervalo` e o `modal`.
 */
export function usePeriodoFiltro(label = 'Período') {
  const [periodo, setPeriodo] = React.useState<PeriodoPreset>('TODOS');
  const [personalizado, setPersonalizado] = React.useState<{ de?: string; ate?: string }>({});
  const [editando, setEditando] = React.useState(false);
  const intervalo = React.useMemo(() => intervaloDoPeriodo(periodo, personalizado), [periodo, personalizado]);
  const resumoPersonalizado = personalizado.de && personalizado.ate
    ? `${personalizado.de} – ${personalizado.ate}`
    : personalizado.de ? `desde ${personalizado.de}` : personalizado.ate ? `até ${personalizado.ate}` : '';

  const filter: FilterConfig = {
    key: 'periodo',
    label,
    value: periodo,
    allValue: 'TODOS',
    options: PERIODO_OPTIONS.map((option) => option.value === 'PERSONALIZADO' && periodo === 'PERSONALIZADO' && resumoPersonalizado ? { ...option, label: resumoPersonalizado } : option),
    onChange: (value) => {
      if (value === 'PERSONALIZADO') setEditando(true);
      else setPeriodo(value as PeriodoPreset);
    }
  };

  const descricao = periodo === 'TODOS' ? '' : periodo === 'PERSONALIZADO' ? resumoPersonalizado : PERIODO_OPTIONS.find((option) => option.value === periodo)?.label ?? '';

  const modal = <PeriodoModal
    visible={editando}
    inicial={personalizado}
    onClose={() => setEditando(false)}
    onApply={(value) => { setPersonalizado(value); setPeriodo('PERSONALIZADO'); setEditando(false); }}
  />;

  return { filter, intervalo, descricao, modal };
}

function PeriodoModal({ visible, inicial, onClose, onApply }: { visible: boolean; inicial: { de?: string; ate?: string }; onClose: () => void; onApply: (value: { de?: string; ate?: string }) => void }) {
  const [de, setDe] = React.useState(inicial.de ?? '');
  const [ate, setAte] = React.useState(inicial.ate ?? '');
  const erroDe = de && !parseDataBr(de) ? 'Data inválida.' : undefined;
  const erroAte = ate && !parseDataBr(ate) ? 'Data inválida.' : undefined;
  const inicio = parseDataBr(de);
  const fim = parseDataBr(ate);
  const invertido = inicio && fim && inicio > fim;
  const valido = (de || ate) && !erroDe && !erroAte && !invertido;

  return <AppModal
    visible={visible}
    onClose={onClose}
    size="sm"
    title="Período personalizado"
    subtitle="Deixe uma das datas em branco para não limitar aquele lado."
    footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title="Cancelar" tone="dark" onPress={onClose} /></View>
      <View style={styles.footerItem}><Button title="Aplicar" tone="green" disabled={!valido} onPress={() => onApply({ de: de || undefined, ate: ate || undefined })} /></View>
    </View>}
  >
    <FormRow>
      <FormField label="De" value={de} onChangeText={(value) => setDe(mascaraData(value))} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} error={erroDe} />
      <FormField label="Até" value={ate} onChangeText={(value) => setAte(mascaraData(value))} placeholder="dd/mm/aaaa" keyboardType="numeric" maxLength={10} error={erroAte} />
    </FormRow>
    {invertido ? <Text style={styles.erro}>A data inicial é depois da final.</Text> : null}
  </AppModal>;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  erro: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 8 }
});
