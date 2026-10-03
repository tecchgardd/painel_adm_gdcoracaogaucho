import type { ColaboradorPayload } from '@/features/colaboradores/services/colaboradores.service';
import type { Colaborador } from '@/shared/types/entities';

export type ColaboradorFormState = {
  id?: string;
  nome: string;
  cpf: string;
  email: string;
  username: string;
  fotoUrl: string;
  /** A foto existente foi removida no formulário (envia null para apagar). */
  fotoRemovida: boolean;
  role: 'STAFF' | 'ADMIN';
  status: 'ATIVO' | 'INATIVO';
  password: string;
  generateTemporaryPassword: boolean;
  mustChangePassword: boolean;
};

export const emptyColaboradorForm: ColaboradorFormState = {
  nome: '',
  cpf: '',
  email: '',
  username: '',
  fotoUrl: '',
  fotoRemovida: false,
  role: 'STAFF',
  status: 'ATIVO',
  password: '',
  generateTemporaryPassword: true,
  mustChangePassword: true
};

/** Mesmas regras do plugin `username` do Better Auth: 3–30 caracteres, letras, números, ponto e _. */
export const USERNAME_PATTERN = /^[a-z0-9._]{3,30}$/;

export function normalizeCpf(value?: string) {
  return String(value ?? '').replace(/\D/g, '');
}

export function normalizeUsername(value?: string) {
  return String(value ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, '.').replace(/[^a-z0-9._]/g, '');
}

/** Sugestão a partir do nome: "Maria Aparecida Fernandes" -> "maria.fernandes". */
export function suggestUsername(nome: string) {
  const parts = normalizeUsername(nome).split('.').filter(Boolean);
  if (!parts.length) return '';
  const base = parts.length > 1 ? `${parts[0]}.${parts[parts.length - 1]}` : parts[0];
  return base.slice(0, 30);
}

export function colaboradorPhoto(colaborador?: Colaborador | null) {
  return colaborador?.fotoUrl ?? colaborador?.user?.image ?? undefined;
}

export function colaboradorUsername(colaborador?: Colaborador | null) {
  return colaborador?.username ?? colaborador?.user?.username ?? undefined;
}

export function toColaboradorForm(colaborador?: Colaborador): ColaboradorFormState {
  if (!colaborador) return { ...emptyColaboradorForm };
  return {
    ...emptyColaboradorForm,
    id: String(colaborador.id),
    nome: colaborador.nome ?? colaborador.name ?? '',
    cpf: colaborador.cpf ?? '',
    email: colaborador.email ?? colaborador.user?.email ?? '',
    username: colaboradorUsername(colaborador) ?? '',
    fotoUrl: colaboradorPhoto(colaborador) ?? '',
    role: colaborador.role === 'ADMIN' ? 'ADMIN' : 'STAFF',
    status: colaborador.status === 'INATIVO' ? 'INATIVO' : 'ATIVO',
    mustChangePassword: colaborador.user?.mustChangePassword ?? true
  };
}

export function validateColaborador(form: ColaboradorFormState) {
  const errors: Record<string, string> = {};
  if (form.nome.trim().length < 2) errors.nome = 'Informe o nome completo.';
  if (normalizeCpf(form.cpf).length !== 11) errors.cpf = 'Informe um CPF válido.';
  if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) errors.email = 'Informe um e-mail de login válido.';
  if (!USERNAME_PATTERN.test(form.username.trim())) errors.username = 'Use de 3 a 30 caracteres: letras minúsculas, números, ponto ou _.';
  if (!['STAFF', 'ADMIN'].includes(form.role)) errors.role = 'Selecione Atendimento ou Administrador.';
  if (!form.id && !form.generateTemporaryPassword && form.password.length < 8) errors.password = 'A senha manual deve ter pelo menos 8 caracteres.';
  return errors;
}

export function buildColaboradorPayload(form: ColaboradorFormState): ColaboradorPayload {
  const payload: ColaboradorPayload = {
    nome: form.nome.trim(),
    cpf: normalizeCpf(form.cpf),
    email: form.email.trim().toLowerCase(),
    username: form.username.trim().toLowerCase(),
    role: form.role,
    status: form.status
  };

  if (form.fotoRemovida) payload.fotoUrl = null;
  else if (form.fotoUrl) payload.fotoUrl = form.fotoUrl;

  if (!form.id) {
    payload.generateTemporaryPassword = form.generateTemporaryPassword;
    payload.mustChangePassword = form.mustChangePassword;
    if (!form.generateTemporaryPassword) payload.password = form.password;
  }

  return payload;
}
