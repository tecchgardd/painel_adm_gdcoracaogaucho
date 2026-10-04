import { describe, expect, it } from 'vitest';

import { MODULOS, TODAS_PERMISSOES } from '@/core/permissions/catalogo';

import { alternarModulo, alternarPermissao, buildPerfilPayload, estadoDoModulo, PERFIS_LOCAIS, resumoPermissoes, roleCompativel, toPerfilForm, validatePerfil } from './perfilForm';

const vendas = MODULOS.find((modulo) => modulo.chave === 'vendas')!;

describe('matriz de permissões', () => {
  it('marcar uma ação liga o "ver"; desligar o "ver" desliga o módulo', () => {
    const comVenda = alternarPermissao([], 'vendas.criar', true);
    expect(comVenda).toEqual(['vendas.ver', 'vendas.criar']);
    expect(alternarPermissao([...comVenda, 'pagamentos.ver'], 'vendas.ver', false)).toEqual(['pagamentos.ver']);
    expect(alternarPermissao(comVenda, 'vendas.criar', false)).toEqual(['vendas.ver']);
  });

  it('marca e desmarca o módulo inteiro e informa o estado', () => {
    const tudo = alternarModulo([], vendas, true);
    expect(estadoDoModulo(tudo, vendas)).toBe('todos');
    expect(estadoDoModulo(['vendas.ver'], vendas)).toBe('alguns');
    expect(alternarModulo(tudo, vendas, false)).toEqual([]);
  });
});

describe('formulário de perfil', () => {
  it('valida nome (mínimo e repetido) e permissões', () => {
    expect(validatePerfil({ nome: 'ab', descricao: '', permissoes: [] })).toEqual({ nome: expect.any(String), permissoes: expect.any(String) });
    expect(validatePerfil({ nome: ' atendimento ', descricao: '', permissoes: ['vendas.ver'] }, PERFIS_LOCAIS).nome).toMatch(/Já existe/);
    expect(validatePerfil({ id: 'atendimento', nome: 'Atendimento', descricao: '', permissoes: ['vendas.ver'] }, PERFIS_LOCAIS)).toEqual({});
  });

  it('duplicar copia as permissões com outro nome e sem id; o Administrador vira todas as chaves', () => {
    const admin = PERFIS_LOCAIS.find((perfil) => perfil.sistema)!;
    const copia = toPerfilForm(admin, true);
    expect(copia.id).toBeUndefined();
    expect(copia.nome).toBe('Administrador (cópia)');
    expect(copia.permissoes).toEqual(TODAS_PERMISSOES);
  });

  it('payload manda as permissões normalizadas e o role antigo equivalente', () => {
    expect(buildPerfilPayload({ nome: ' Portaria 2 ', descricao: '', permissoes: ['checkin.ver'] })).toEqual({ nome: 'Portaria 2', descricao: undefined, permissoes: ['checkin.ver'], role: 'CHECKIN' });
    expect(roleCompativel(['pagamentos.ver'])).toBe('STAFF');
    expect(roleCompativel(['*'])).toBe('ADMIN');
    expect(resumoPermissoes(['vendas.criar', 'pagamentos.ver'])).toBe('3 permissões em 2 módulos');
    expect(resumoPermissoes(['*'])).toBe('Acesso total');
  });
});
