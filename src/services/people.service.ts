import { api, unwrapData } from './api';

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
  const response = await api.get(`/admin/pessoas/by-cpf/${cpf.replace(/\D/g, '')}`);
  return unwrapData<PersonLookup>(response.data);
}

