import { describe, expect, it } from 'vitest';

import { gerarCsv, nomeDoArquivo, textoDaCelula, type ExportColumn } from './exportacao';
import { dentroDoIntervalo, intervaloDoPeriodo, ordenar, parseDataBr } from './listaAvancada';

const agora = new Date(2026, 9, 3, 15, 30);

describe('período', () => {
  it('7 dias inclui hoje e os 6 anteriores', () => {
    const intervalo = intervaloDoPeriodo('7', {}, agora);
    expect(dentroDoIntervalo(new Date(2026, 8, 27, 10).toISOString(), intervalo)).toBe(true);
    expect(dentroDoIntervalo(new Date(2026, 8, 26, 23).toISOString(), intervalo)).toBe(false);
  });

  it('personalizado inclui o dia final inteiro', () => {
    const intervalo = intervaloDoPeriodo('PERSONALIZADO', { de: '01/09/2026', ate: '30/09/2026' }, agora);
    expect(dentroDoIntervalo(new Date(2026, 8, 30, 22).toISOString(), intervalo)).toBe(true);
    expect(dentroDoIntervalo(new Date(2026, 9, 1, 0, 1).toISOString(), intervalo)).toBe(false);
  });

  it('sem filtro aceita tudo; com filtro, registro sem data fica de fora', () => {
    expect(dentroDoIntervalo(undefined, intervaloDoPeriodo('TODOS'))).toBe(true);
    expect(dentroDoIntervalo(undefined, intervaloDoPeriodo('HOJE', {}, agora))).toBe(false);
  });

  it('recusa datas impossíveis', () => {
    expect(parseDataBr('31/02/2026')).toBeUndefined();
    expect(parseDataBr('2026-02-01')).toBeUndefined();
  });
});

describe('ordenar', () => {
  const rows = [
    { nome: 'Carla', criado: '2026-08-01', modificado: '2026-10-01' },
    { nome: 'Ana', criado: '2026-09-01', modificado: null },
    { nome: 'Bruno', criado: null, modificado: null }
  ];
  const campos = { criado: (row: typeof rows[number]) => row.criado, modificado: (row: typeof rows[number]) => row.modificado, nome: (row: typeof rows[number]) => row.nome };

  it('recentes, antigas, modificadas e nome', () => {
    expect(ordenar(rows, 'RECENTES', campos).map((row) => row.nome)).toEqual(['Ana', 'Carla', 'Bruno']);
    expect(ordenar(rows, 'ANTIGAS', campos).map((row) => row.nome)).toEqual(['Carla', 'Ana', 'Bruno']);
    expect(ordenar(rows, 'MODIFICADAS', campos).map((row) => row.nome)).toEqual(['Carla', 'Ana', 'Bruno']);
    expect(ordenar(rows, 'NOME', campos).map((row) => row.nome)).toEqual(['Ana', 'Bruno', 'Carla']);
  });

  it('não altera a lista original', () => {
    ordenar(rows, 'NOME', campos);
    expect(rows[0].nome).toBe('Carla');
  });
});

describe('exportação CSV', () => {
  const columns: ExportColumn<{ nome: string; obs: string; pago: boolean }>[] = [
    { key: 'nome', label: 'Nome', value: (row) => row.nome },
    { key: 'obs', label: 'Observação', value: (row) => row.obs },
    { key: 'pago', label: 'Pago', value: (row) => row.pago }
  ];

  it('usa ; com BOM, escapa aspas e protege fórmulas', () => {
    const csv = gerarCsv([{ nome: 'João "Jota"', obs: '=SOMA(A1); teste', pago: true }], columns);
    expect(csv.startsWith('\uFEFFNome;Observação;Pago\r\n')).toBe(true);
    expect(csv).toContain('"João ""Jota"""');
    expect(csv).toContain(`"'=SOMA(A1); teste"`);
    expect(csv.endsWith(';Sim')).toBe(true);
  });

  it('células vazias e quebras de linha', () => {
    expect(textoDaCelula(null)).toBe('');
    expect(textoDaCelula('a\nb')).toBe('a b');
  });

  it('nome de arquivo sem acentos e com data', () => {
    expect(nomeDoArquivo('Inscrições', 'csv', agora)).toBe('inscricoes-20261003-1530.csv');
  });
});
