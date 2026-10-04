import { Fragment, useMemo, useState } from 'react';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ACOES_PADRAO, MODULOS, TODAS_PERMISSOES, type AcaoPadrao, type ModuloPermissao } from '@/core/permissions/catalogo';
import { alternarModulo, alternarPermissao, estadoDoModulo, type PerfilFormState } from '@/features/perfis/utils/perfilForm';
import { filterNavigation, navigationItems } from '@/shared/components/navigation/navigation.config';
import { AppModal, Button, FormField, FormSection } from '@/shared/components/ui';
import { useResponsive } from '@/shared/hooks/useResponsive';
import { colors, theme } from '@/theme/theme';

type PressState = { pressed: boolean; hovered?: boolean };

const GRUPOS = [...new Set(MODULOS.map((modulo) => modulo.grupo))];

function Caixa({ marcada, parcial = false, rotulo, onPress, disabled }: { marcada: boolean; parcial?: boolean; rotulo: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: parcial ? 'mixed' : marcada, disabled }}
    accessibilityLabel={rotulo}
    hitSlop={6}
    style={(state) => [styles.caixa, (state as PressState).hovered && !disabled && styles.caixaHover]}
  >
    <MaterialCommunityIcons
      name={parcial ? 'minus-box' : marcada ? 'checkbox-marked' : 'checkbox-blank-outline'}
      size={20}
      color={marcada || parcial ? colors.green : colors.muted}
    />
  </Pressable>;
}

function Chip({ ativa, label, onPress, disabled }: { ativa: boolean; label: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable
    onPress={onPress}
    disabled={disabled}
    accessibilityRole="checkbox"
    accessibilityState={{ checked: ativa, disabled }}
    accessibilityLabel={label}
    style={(state) => [styles.chip, ativa && styles.chipAtiva, (state as PressState).hovered && !disabled && styles.caixaHover]}
  >
    <MaterialCommunityIcons name={ativa ? 'check' : 'plus'} size={14} color={ativa ? colors.green : colors.muted} />
    <Text style={[styles.chipTexto, ativa && styles.chipTextoAtiva]}>{label}</Text>
  </Pressable>;
}

function nomeAcao(modulo: ModuloPermissao, acao: AcaoPadrao) {
  return modulo.rotulos?.[acao] ?? ACOES_PADRAO.find((item) => item.chave === acao)!.nome;
}

/** Matriz módulo × ação. No desktop vira tabela (Ver / Criar / Editar / Excluir / Especiais); no celular, um bloco por módulo. */
export function MatrizPermissoes({ permissoes, onChange, readOnly = false }: { permissoes: string[]; onChange: (permissoes: string[]) => void; readOnly?: boolean }) {
  const { isMobile } = useResponsive();
  const marcar = (chave: string, ativa: boolean) => onChange(alternarPermissao(permissoes, chave, ativa));

  return <View>
    {!isMobile ? <View style={[styles.linha, styles.cabecalho]}>
      <Text style={[styles.colModulo, styles.cabecalhoTexto]}>Módulo</Text>
      {ACOES_PADRAO.map((acao) => <Text key={acao.chave} style={[styles.colAcao, styles.cabecalhoTexto]}>{acao.nome}</Text>)}
      <Text style={[styles.colEspeciais, styles.cabecalhoTexto]}>Ações especiais</Text>
    </View> : null}
    {GRUPOS.map((grupo) => <Fragment key={grupo}>
      <Text style={styles.grupo}>{grupo.toUpperCase()}</Text>
      {MODULOS.filter((modulo) => modulo.grupo === grupo).map((modulo) => {
        const estado = estadoDoModulo(permissoes, modulo);
        const podeVer = permissoes.includes(`${modulo.chave}.ver`);
        const titulo = <View style={styles.moduloTitulo}>
          <Caixa marcada={estado === 'todos'} parcial={estado === 'alguns'} rotulo={`${modulo.nome}: tudo`} disabled={readOnly} onPress={() => onChange(alternarModulo(permissoes, modulo, estado !== 'todos'))} />
          <View style={styles.moduloTexto}>
            <Text style={[styles.moduloNome, !podeVer && styles.apagado]}>{modulo.nome}</Text>
            <Text style={styles.moduloDescricao}>{modulo.descricao}</Text>
          </View>
        </View>;
        const especiais = modulo.especiais?.map((especial) => <Chip
          key={especial.chave}
          label={especial.nome}
          ativa={permissoes.includes(`${modulo.chave}.${especial.chave}`)}
          disabled={readOnly}
          onPress={() => marcar(`${modulo.chave}.${especial.chave}`, !permissoes.includes(`${modulo.chave}.${especial.chave}`))}
        />);

        if (isMobile) {
          return <View key={modulo.chave} style={styles.blocoMobile}>
            {titulo}
            <View style={styles.chips}>
              {modulo.acoes.map((acao) => <Chip key={acao} label={nomeAcao(modulo, acao)} ativa={permissoes.includes(`${modulo.chave}.${acao}`)} disabled={readOnly} onPress={() => marcar(`${modulo.chave}.${acao}`, !permissoes.includes(`${modulo.chave}.${acao}`))} />)}
              {especiais}
            </View>
          </View>;
        }

        return <View key={modulo.chave} style={styles.linha}>
          <View style={styles.colModulo}>{titulo}</View>
          {ACOES_PADRAO.map(({ chave: acao }) => <View key={acao} style={styles.colAcao}>
            {modulo.acoes.includes(acao) ? <>
              <Caixa
                marcada={permissoes.includes(`${modulo.chave}.${acao}`)}
                rotulo={`${modulo.nome}: ${nomeAcao(modulo, acao)}`}
                disabled={readOnly}
                onPress={() => marcar(`${modulo.chave}.${acao}`, !permissoes.includes(`${modulo.chave}.${acao}`))}
              />
              {modulo.rotulos?.[acao] ? <Text style={styles.rotuloAcao} numberOfLines={2}>{modulo.rotulos[acao]}</Text> : null}
            </> : <Text style={styles.semAcao}>—</Text>}
          </View>)}
          <View style={[styles.colEspeciais, styles.chips]}>{especiais?.length ? especiais : <Text style={styles.semAcao}>—</Text>}</View>
        </View>;
      })}
    </Fragment>)}
  </View>;
}

/** Prévia do menu lateral que o perfil enxerga — "o que cada usuário vai ver". */
export function PreviaMenu({ permissoes }: { permissoes: string[] }) {
  const itens = useMemo(() => filterNavigation(navigationItems, permissoes), [permissoes]);
  if (!itens.length) return <Text style={styles.moduloDescricao}>Nenhuma tela no menu. O usuário só verá o próprio perfil e a ajuda.</Text>;
  return <View style={styles.previa}>
    {itens.map((item) => <View key={item.label} style={styles.previaItem}>
      <View style={styles.previaLinha}>
        <MaterialCommunityIcons name={item.icon} size={16} color={colors.text} />
        <Text style={styles.previaTexto}>{item.label}</Text>
      </View>
      {item.children?.map((filho) => <View key={filho.label} style={[styles.previaLinha, styles.previaFilho]}>
        <MaterialCommunityIcons name={filho.icon} size={14} color={colors.muted} />
        <Text style={styles.previaFilhoTexto}>{filho.label}</Text>
      </View>)}
    </View>)}
  </View>;
}

export function PerfilFormModal({ form, readOnly, errors, saving, onClose, onChange, onSave }: {
  form: PerfilFormState | null;
  readOnly?: boolean;
  errors: Record<string, string>;
  saving?: boolean;
  onClose: () => void;
  onChange: (form: PerfilFormState) => void;
  onSave: () => void;
}) {
  const [previa, setPrevia] = useState(false);
  if (!form) return null;
  const patch = (value: Partial<PerfilFormState>) => onChange({ ...form, ...value });
  const titulo = readOnly ? form.nome : form.id ? 'Editar perfil' : 'Novo perfil';

  return <AppModal
    visible
    onClose={onClose}
    size="lg"
    title={titulo}
    subtitle={readOnly ? 'Somente leitura.' : 'Marque o que quem tiver este perfil pode ver e fazer no painel.'}
    footer={<View style={styles.footer}>
      <View style={styles.footerItem}><Button title={readOnly ? 'Fechar' : 'Cancelar'} tone="dark" onPress={onClose} /></View>
      {!readOnly ? <View style={styles.footerItem}><Button title={saving ? 'Salvando...' : 'Salvar perfil'} tone="green" disabled={saving} onPress={onSave} /></View> : null}
    </View>}
  >
    {!readOnly ? <FormSection first title="Identificação">
      <FormField label="Nome do perfil" required value={form.nome} onChangeText={(nome) => patch({ nome })} placeholder="Ex.: Financeiro, Professor, Portaria" error={errors.nome} />
      <FormField label="Descrição" value={form.descricao} onChangeText={(descricao) => patch({ descricao })} placeholder="Para que serve este perfil" multiline />
    </FormSection> : form.descricao ? <Text style={styles.descricaoLeitura}>{form.descricao}</Text> : null}

    <FormSection first={readOnly} title="Permissões" description={`${form.permissoes.length} de ${TODAS_PERMISSOES.length} marcadas. Marcar qualquer ação libera também o "Ver" do módulo.`}>
      {!readOnly ? <View style={styles.atalhos}>
        <Atalho label="Marcar tudo" onPress={() => patch({ permissoes: [...TODAS_PERMISSOES] })} />
        <Atalho label="Só visualizar" onPress={() => patch({ permissoes: TODAS_PERMISSOES.filter((chave) => chave.endsWith('.ver')) })} />
        <Atalho label="Limpar" onPress={() => patch({ permissoes: [] })} />
        <Atalho label={previa ? 'Ocultar prévia do menu' : 'Ver prévia do menu'} onPress={() => setPrevia((atual) => !atual)} />
      </View> : null}
      {previa || readOnly ? <View style={styles.previaBox}>
        <Text style={styles.previaTitulo}>O que aparece no menu</Text>
        <PreviaMenu permissoes={form.permissoes} />
      </View> : null}
      <MatrizPermissoes permissoes={form.permissoes} readOnly={readOnly} onChange={(permissoes) => patch({ permissoes })} />
      {errors.permissoes ? <Text style={styles.erro}>{errors.permissoes}</Text> : null}
      {errors.form ? <Text style={styles.erro}>{errors.form}</Text> : null}
    </FormSection>
  </AppModal>;
}

function Atalho({ label, onPress }: { label: string; onPress: () => void }) {
  return <Pressable onPress={onPress} accessibilityRole="button" style={(state) => [styles.atalho, (state as PressState).hovered && styles.caixaHover]}>
    <Text style={styles.atalhoTexto}>{label}</Text>
  </Pressable>;
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', gap: 10 },
  footerItem: { flex: 1 },
  linha: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: 8 },
  cabecalho: { paddingVertical: 8, borderBottomColor: colors.border },
  cabecalhoTexto: { color: colors.muted, fontSize: 11, fontFamily: theme.font.semiBold, letterSpacing: 0.4, textTransform: 'uppercase' },
  colModulo: { flex: 3, minWidth: 0 },
  colAcao: { width: 72, alignItems: 'center', textAlign: 'center' },
  colEspeciais: { flex: 2.2, minWidth: 0 },
  grupo: { color: colors.goldAccent, fontSize: 11, fontFamily: theme.font.bold, letterSpacing: 1, marginTop: 16, marginBottom: 2 },
  moduloTitulo: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  moduloTexto: { flex: 1, minWidth: 0 },
  moduloNome: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  moduloDescricao: { color: colors.muted, fontSize: 11, lineHeight: 15, fontFamily: theme.font.regular, marginTop: 1 },
  apagado: { color: colors.muted },
  caixa: { padding: 2, borderRadius: 6 },
  caixaHover: { backgroundColor: colors.borderSoft },
  rotuloAcao: { color: colors.muted, fontSize: 10, fontFamily: theme.font.regular, textAlign: 'center', marginTop: 2 },
  semAcao: { color: colors.border, fontSize: 13, textAlign: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  chipAtiva: { borderColor: colors.green, backgroundColor: colors.greenSoft },
  chipTexto: { color: colors.muted, fontSize: 12, fontFamily: theme.font.medium },
  chipTextoAtiva: { color: colors.text },
  blocoMobile: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.borderSoft, gap: 10 },
  atalhos: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  atalho: { borderWidth: 1, borderColor: colors.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 6 },
  atalhoTexto: { color: colors.text, fontSize: 12, fontFamily: theme.font.medium },
  previaBox: { borderWidth: 1, borderColor: colors.border, borderRadius: theme.radius.md, padding: 12, marginBottom: 8, backgroundColor: colors.cardAlt },
  previaTitulo: { color: colors.muted, fontSize: 11, fontFamily: theme.font.semiBold, letterSpacing: 0.4, textTransform: 'uppercase', marginBottom: 8 },
  previa: { flexDirection: 'row', flexWrap: 'wrap', gap: 16 },
  previaItem: { minWidth: 150, gap: 4 },
  previaLinha: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  previaTexto: { color: colors.text, fontSize: 13, fontFamily: theme.font.semiBold },
  previaFilho: { paddingLeft: 18 },
  previaFilhoTexto: { color: colors.muted, fontSize: 12, fontFamily: theme.font.regular },
  descricaoLeitura: { color: colors.muted, fontSize: 13, lineHeight: 19, fontFamily: theme.font.regular, marginBottom: 8 },
  erro: { color: colors.red, fontSize: 12, fontFamily: theme.font.medium, marginTop: 8 }
});
