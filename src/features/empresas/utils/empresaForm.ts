import type { Empresa, EmpresaInput, EmpresaTipo } from '@/features/empresas/services/empresas.service';

export type EmpresaFormState = {
  nome: string;
  tipo: EmpresaTipo;
  link: string;
  publicado: boolean;
  ordem: string;
  /** dd/mm/aaaa */
  vigenciaInicio: string;
  vigenciaFim: string;
};

export const TIPO_LABELS: Record<EmpresaTipo, string> = { PATROCINADOR: 'Patrocinador', APOIADOR: 'Apoiador', PARCEIRO: 'Parceiro' };

function toBrDate(value?: string | null) {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

/** "31/12/2026" -> "2026-12-31"; vazio ou inválido -> undefined. */
export function parseBrDate(value: string) {
  const match = value.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return undefined;
  const [, dd, mm, yyyy] = match;
  const date = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  return Number.isNaN(date.getTime()) || date.getUTCDate() !== Number(dd) ? undefined : `${yyyy}-${mm}-${dd}`;
}

/** Aceita "instagram.com/x" e completa com https://. */
export function normalizeLink(value: string) {
  const link = value.trim();
  if (!link) return '';
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export function toEmpresaForm(empresa?: Empresa | null): EmpresaFormState {
  return {
    nome: empresa?.nome ?? '',
    tipo: empresa?.tipo ?? 'PATROCINADOR',
    link: empresa?.link ?? '',
    publicado: empresa ? empresa.publicado && empresa.ativo : true,
    ordem: String(empresa?.ordem ?? 0),
    vigenciaInicio: toBrDate(empresa?.vigenciaInicio),
    vigenciaFim: toBrDate(empresa?.vigenciaFim)
  };
}

export function validateEmpresa(form: EmpresaFormState, temImagem: boolean) {
  const errors: Record<string, string> = {};
  if (form.nome.trim().length < 2) errors.nome = 'Informe o nome da empresa.';
  if (!temImagem) errors.imagem = 'Selecione o logo ou banner.';
  if (form.link && !/^https?:\/\/[^\s.]+\.[^\s]+$/i.test(normalizeLink(form.link))) errors.link = 'Link inválido.';
  if (!/^\d+$/.test(form.ordem.trim())) errors.ordem = 'Use um número (0 aparece primeiro).';
  const inicio = form.vigenciaInicio ? parseBrDate(form.vigenciaInicio) : null;
  const fim = form.vigenciaFim ? parseBrDate(form.vigenciaFim) : null;
  if (inicio === undefined) errors.vigenciaInicio = 'Use dd/mm/aaaa.';
  if (fim === undefined) errors.vigenciaFim = 'Use dd/mm/aaaa.';
  if (inicio && fim && fim < inicio) errors.vigenciaFim = 'O fim deve ser depois do início.';
  return errors;
}

export function buildEmpresaInput(form: EmpresaFormState): EmpresaInput {
  return {
    nome: form.nome.trim(),
    tipo: form.tipo,
    link: normalizeLink(form.link) || undefined,
    publicado: form.publicado,
    ativo: true,
    ordem: Number(form.ordem.trim() || 0),
    vigenciaInicio: parseBrDate(form.vigenciaInicio),
    vigenciaFim: parseBrDate(form.vigenciaFim)
  };
}

/** Situação na landing page, considerando publicação e vigência. */
export function situacaoNoSite(empresa: Empresa, hoje = new Date()) {
  if (!empresa.publicado || !empresa.ativo) return 'OCULTA' as const;
  const dia = hoje.toISOString().slice(0, 10);
  if (empresa.vigenciaInicio && empresa.vigenciaInicio.slice(0, 10) > dia) return 'AGENDADA' as const;
  if (empresa.vigenciaFim && empresa.vigenciaFim.slice(0, 10) < dia) return 'ENCERRADA' as const;
  return 'PUBLICADA' as const;
}
