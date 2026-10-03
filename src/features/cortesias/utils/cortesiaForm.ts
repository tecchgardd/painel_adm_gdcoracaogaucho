export type CortesiaFormState = {
  cpf: string;
  /** Preenchido quando a pessoa foi encontrada pelo CPF. */
  pessoaId?: string;
  /** Cadastro rápido quando o CPF não existe. */
  nome: string;
  telefone: string;
  eventoId: string;
  quantidade: string;
  motivo: string;
};

export const emptyCortesiaForm: CortesiaFormState = { cpf: '', nome: '', telefone: '', eventoId: '', quantidade: '1', motivo: '' };

export const MAX_CORTESIAS_POR_EMISSAO = 20;

export function validateCortesia(form: CortesiaFormState) {
  const errors: Record<string, string> = {};
  if (form.cpf.replace(/\D/g, '').length !== 11) errors.cpf = 'Informe um CPF com 11 dígitos.';
  if (!form.pessoaId && form.nome.trim().length < 2) errors.nome = 'Pessoa não encontrada: informe o nome para cadastrar.';
  if (!form.eventoId) errors.eventoId = 'Escolha o evento ou baile.';
  const quantidade = Number(form.quantidade);
  if (!Number.isInteger(quantidade) || quantidade < 1) errors.quantidade = 'Informe ao menos 1 ingresso.';
  else if (quantidade > MAX_CORTESIAS_POR_EMISSAO) errors.quantidade = `No máximo ${MAX_CORTESIAS_POR_EMISSAO} por emissão.`;
  if (form.motivo.trim().length < 10) errors.motivo = 'Explique o motivo da cortesia (mínimo 10 caracteres).';
  return errors;
}

export function buildCortesiaPayload(form: CortesiaFormState, customerId: string) {
  return {
    customerId,
    cpf: form.cpf.replace(/\D/g, ''),
    eventoId: form.eventoId,
    quantidade: Number(form.quantidade),
    motivo: form.motivo.trim()
  };
}

/** `responsavel` pode vir como texto ou objeto, conforme a versão da API. */
export function responsavelNome(responsavel: unknown) {
  if (!responsavel) return undefined;
  if (typeof responsavel === 'string') return responsavel;
  return (responsavel as { nome?: string }).nome;
}
