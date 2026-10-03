import { describe, expect, it } from 'vitest';

import type { Empresa } from '@/features/empresas/services/empresas.service';

import { buildEmpresaInput, normalizeLink, parseBrDate, situacaoNoSite, toEmpresaForm, validateEmpresa } from './empresaForm';

const base: Empresa = { id: '1', nome: 'Gaúcha Tintas', imagemUrl: 'https://img/1.png', ativo: true, publicado: true, ordem: 0, createdAt: '2026-01-01' };

describe('datas e links', () => {
  it('converte dd/mm/aaaa e recusa datas impossíveis', () => {
    expect(parseBrDate('31/12/2026')).toBe('2026-12-31');
    expect(parseBrDate('31/02/2026')).toBeUndefined();
    expect(parseBrDate('2026-12-31')).toBeUndefined();
  });

  it('completa o link com https', () => {
    expect(normalizeLink('instagram.com/cg')).toBe('https://instagram.com/cg');
    expect(normalizeLink('http://site.com')).toBe('http://site.com');
    expect(normalizeLink('  ')).toBe('');
  });
});

describe('validateEmpresa', () => {
  it('exige nome e imagem', () => {
    const errors = validateEmpresa(toEmpresaForm(), false);
    expect(errors.nome).toBeDefined();
    expect(errors.imagem).toBeDefined();
  });

  it('vigência: formato e ordem', () => {
    const form = { ...toEmpresaForm(base), vigenciaInicio: '10/10/2026', vigenciaFim: '01/10/2026' };
    expect(validateEmpresa(form, true).vigenciaFim).toBe('O fim deve ser depois do início.');
    expect(validateEmpresa({ ...form, vigenciaFim: '2026' }, true).vigenciaFim).toBe('Use dd/mm/aaaa.');
    expect(validateEmpresa({ ...form, vigenciaFim: '' }, true)).toEqual({});
  });
});

describe('buildEmpresaInput', () => {
  it('normaliza link, ordem e datas', () => {
    const input = buildEmpresaInput({ ...toEmpresaForm(base), link: 'site.com.br', ordem: ' 3 ', vigenciaInicio: '01/11/2026' });
    expect(input).toMatchObject({ nome: 'Gaúcha Tintas', link: 'https://site.com.br', ordem: 3, vigenciaInicio: '2026-11-01', vigenciaFim: undefined, publicado: true });
  });
});

describe('situacaoNoSite', () => {
  const hoje = new Date('2026-10-03T12:00:00Z');
  it('considera publicação e vigência', () => {
    expect(situacaoNoSite(base, hoje)).toBe('PUBLICADA');
    expect(situacaoNoSite({ ...base, publicado: false }, hoje)).toBe('OCULTA');
    expect(situacaoNoSite({ ...base, vigenciaInicio: '2026-11-01' }, hoje)).toBe('AGENDADA');
    expect(situacaoNoSite({ ...base, vigenciaFim: '2026-09-30' }, hoje)).toBe('ENCERRADA');
  });
});
