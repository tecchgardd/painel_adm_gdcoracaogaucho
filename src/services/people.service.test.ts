import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api } from './api';
import { findPersonByCpf } from './people.service';

vi.mock('./api', () => ({
  api: { get: vi.fn() }
}));

const getMock = vi.mocked(api.get);

describe('findPersonByCpf', () => {
  beforeEach(() => getMock.mockReset());

  it('envia somente os 11 dígitos e preserva o contrato success/data', async () => {
    getMock.mockResolvedValue({
      data: {
        success: true,
        data: {
          id: '55',
          tipo: 'ALUNO',
          nome: 'Gabriel Aluir da Rosa',
          cpf: '12007279916'
        }
      }
    });

    const result = await findPersonByCpf('120.072.799-16');

    expect(getMock).toHaveBeenCalledWith('/admin/pessoas/by-cpf/12007279916');
    expect(result.success).toBe(true);
    expect(result.data?.id).toBe('55');
  });

  it('não chama a API quando o CPF não possui 11 dígitos', async () => {
    const result = await findPersonByCpf('120');
    expect(result.success).toBe(false);
    expect(getMock).not.toHaveBeenCalled();
  });
});
