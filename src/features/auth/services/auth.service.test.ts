import { beforeEach, describe, expect, it, vi } from 'vitest';

import { api } from '@/core/api/client';

import { buildSignInRequest, login } from './auth.service';

vi.mock('@/core/api/client', () => ({ api: { post: vi.fn(), get: vi.fn() }, unwrapData: (value: any) => value?.data ?? value }));
vi.mock('@/core/storage/authStorage', () => ({ saveAuthToken: vi.fn(), saveStoredUser: vi.fn(), clearAuthStorage: vi.fn() }));
vi.mock('@react-native-async-storage/async-storage', () => ({ default: { multiRemove: vi.fn() } }));

describe('buildSignInRequest', () => {
  it('usa a rota de e-mail quando há @', () => {
    expect(buildSignInRequest(' Maria@CG.com ', 'x')).toEqual({ path: '/auth/sign-in/email', body: { email: 'maria@cg.com', password: 'x' } });
  });

  it('usa a rota de usuário quando não há @', () => {
    expect(buildSignInRequest('Maria.Fernandes', 'x')).toEqual({ path: '/auth/sign-in/username', body: { username: 'maria.fernandes', password: 'x' } });
  });
});

describe('login', () => {
  beforeEach(() => { vi.mocked(api.post).mockReset(); });

  it('explica quando o backend ainda não aceita login por usuário', async () => {
    vi.mocked(api.post).mockImplementation(async () => { throw { status: 404, message: 'Not found' }; });
    const error = await login('maria', 'x').catch((caught: unknown) => caught);
    expect((error as Error).message).toContain('Login por usuário ainda não está disponível');
  });

  it('não mascara erros de credencial', async () => {
    vi.mocked(api.post).mockImplementation(async () => { throw { status: 401, message: 'Sessão expirada.' }; });
    const error = await login('maria', 'x').catch((caught: unknown) => caught);
    expect(error).toEqual({ status: 401, message: 'Sessão expirada.' });
  });
});
