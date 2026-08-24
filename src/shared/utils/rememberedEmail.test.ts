import { beforeEach, describe, expect, it, vi } from 'vitest';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { clearRememberedEmail, getRememberedEmail, setRememberedEmail } from './rememberedEmail';

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: { getItem: vi.fn(), setItem: vi.fn(), removeItem: vi.fn() }
}));

describe('rememberedEmail', () => {
  beforeEach(() => vi.clearAllMocks());

  it('lê o e-mail salvo pela chave dedicada', async () => {
    vi.mocked(AsyncStorage.getItem).mockResolvedValue('joao@coracaogaucho.com');
    await expect(getRememberedEmail()).resolves.toBe('joao@coracaogaucho.com');
    expect(AsyncStorage.getItem).toHaveBeenCalledWith('@cg_admin_remembered_email');
  });

  it('salva o e-mail informado', async () => {
    await setRememberedEmail('joao@coracaogaucho.com');
    expect(AsyncStorage.setItem).toHaveBeenCalledWith('@cg_admin_remembered_email', 'joao@coracaogaucho.com');
  });

  it('remove o e-mail salvo', async () => {
    await clearRememberedEmail();
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith('@cg_admin_remembered_email');
  });
});
