// @ts-expect-error entrada ESM do pdf-lib (a mesma usada pelo serviço)
import { PDFDocument } from 'pdf-lib/dist/pdf-lib.esm.js';
import { describe, expect, it } from 'vitest';

import { gerarPdfTabela } from './exportPdf';

describe('PDF de tabela', () => {
  it('pagina listas longas e aceita textos fora do WinAnsi', async () => {
    const rows = Array.from({ length: 120 }, (_, index) => ({ nome: `Aluno ${index} 🎉`, obs: 'texto bem comprido '.repeat(12) }));
    const base64 = await gerarPdfTabela({
      titulo: 'Inscrições',
      subtitulo: 'Status: Pendentes',
      columns: [{ key: 'nome', label: 'Nome', value: (row: typeof rows[number]) => row.nome }, { key: 'obs', label: 'Observação', value: (row: typeof rows[number]) => row.obs, peso: 3 }],
      rows
    });
    const pdf = await PDFDocument.load(base64);
    expect(pdf.getPageCount()).toBeGreaterThan(2);
    expect(pdf.getPage(0).getSize()).toEqual({ width: 842, height: 595 });
  });

  it('lista vazia gera uma página com aviso', async () => {
    const base64 = await gerarPdfTabela({ titulo: 'Cortesias', columns: [{ key: 'a', label: 'A', value: () => '' }], rows: [] });
    expect((await PDFDocument.load(base64)).getPageCount()).toBe(1);
  });
});
