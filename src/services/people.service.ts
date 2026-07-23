import { api } from './api';

export type PersonLookup = {
  success: boolean;
  message?: string;
  data?: {
    id: string;
    tipo: 'ALUNO' | 'CLIENTE' | 'COLABORADOR';
    nome: string;
    cpf: string;
    email?: string | null;
    telefone?: string | null;
    cidade?: string | null;
    raw?: any;
  };
};

export async function findPersonByCpf(cpf: string) {
  const normalizedCpf = cpf.replace(/\D/g, '');
  if (normalizedCpf.length !== 11) {
    return { success: false, message: 'Informe um CPF com 11 dígitos.' } satisfies PersonLookup;
  }

  const response = await api.get(`/admin/pessoas/by-cpf/${normalizedCpf}`);
  const payload = response.data as PersonLookup | { data?: PersonLookup };

  if ('success' in payload && typeof payload.success === 'boolean') return payload;
  if (payload.data && 'success' in payload.data) return payload.data;

  return { success: false, message: 'Resposta inválida ao consultar o CPF.' };
}
