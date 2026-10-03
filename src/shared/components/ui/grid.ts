import type { ViewStyle } from 'react-native';

export const GRID_GAP = 12;

// Grid por padding negativo: as células têm largura exata (100 / colunas) e o espaçamento vem do
// padding, então a última linha fica alinhada à esquerda sem buracos (ao contrário de space-between).
export const gridContainer: ViewStyle = {
  flexDirection: 'row',
  flexWrap: 'wrap',
  marginHorizontal: -GRID_GAP / 2
};

export function gridCellStyle(columns: number): ViewStyle {
  return {
    width: `${100 / Math.max(columns, 1)}%`,
    paddingHorizontal: GRID_GAP / 2,
    paddingBottom: GRID_GAP
  };
}
