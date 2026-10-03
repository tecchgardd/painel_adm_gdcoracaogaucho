import { describe, expect, it } from 'vitest';

import { groupFields, optionLabel } from './fieldLayout';

describe('fieldLayout', () => {
  it('agrupa por seção e junta pares de campos half', () => {
    const sections = groupFields([
      { key: 'nome', label: 'Nome', section: 'Dados' },
      { key: 'cpf', label: 'CPF', half: true },
      { key: 'tel', label: 'Telefone', half: true },
      { key: 'cep', label: 'CEP', half: true, section: 'Endereço' },
      { key: 'rua', label: 'Rua' },
      { key: 'num', label: 'Número', half: true }
    ]);
    expect(sections.map((section) => section.title)).toEqual(['Dados', 'Endereço']);
    expect(sections[0].rows.map((row) => row.map((field) => field.key))).toEqual([['nome'], ['cpf', 'tel']]);
    // half sem par fica sozinho; não "pula" um campo inteiro para formar dupla
    expect(sections[1].rows.map((row) => row.map((field) => field.key))).toEqual([['cep'], ['rua'], ['num']]);
  });

  it('campos sem seção ficam num grupo inicial sem título', () => {
    expect(groupFields([{ key: 'a', label: 'A' }])).toEqual([{ title: undefined, rows: [[{ key: 'a', label: 'A' }]] }]);
  });

  it('usa o rótulo da opção, com padrão para ATIVO/INATIVO', () => {
    expect(optionLabel({ key: 's', label: 'S' }, 'ATIVO')).toBe('Ativo');
    expect(optionLabel({ key: 't', label: 'T', optionLabels: { FAQ: 'Pergunta frequente' } }, 'FAQ')).toBe('Pergunta frequente');
    expect(optionLabel({ key: 't', label: 'T' }, 'OUTRO')).toBe('OUTRO');
  });
});
