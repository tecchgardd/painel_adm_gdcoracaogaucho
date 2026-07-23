import { z } from 'zod';
import { parseCurrencyInput } from '@/utils/format';

const requiredString = z.preprocess((value) => value ?? '', z.string().trim().min(1, 'Campo obrigatorio'));
const optionalString = z.preprocess((value) => value ?? '', z.string().trim().optional().or(z.literal('')));
const optionalHttpsUrl = optionalString.refine((value) => !value || value.startsWith('https://'), 'A imagem deve usar uma URL HTTPS');
const requiredEmail = z.preprocess((value) => value ?? '', z.string().trim().min(1, 'Campo obrigatorio').email('E-mail invalido'));
const positiveOrZero = z.union([z.string(), z.number()])
  .transform(parseCurrencyInput)
  .refine((value) => value >= 0, 'Valor não pode ser negativo');

const onlyDigits = (value: string) => value.replace(/\D/g, '');

export function isValidCpf(value: string) {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  const calc = (base: string, factor: number) => {
    const total = base.split('').reduce((sum, digit) => sum + Number(digit) * factor--, 0);
    const rest = (total * 10) % 11;
    return rest === 10 ? 0 : rest;
  };
  return calc(cpf.slice(0, 9), 10) === Number(cpf[9]) && calc(cpf.slice(0, 10), 11) === Number(cpf[10]);
}

const cpfString = requiredString.refine(isValidCpf, 'CPF invalido');
const emailOptional = z.string().trim().email('E-mail invalido').optional().or(z.literal(''));

export const ticketLotSchema = z.object({
  nome: requiredString,
  valor: positiveOrZero,
  quantidade: z.coerce.number().int().nonnegative('Quantidade invalida'),
  dataLimite: optionalString,
  ativo: z.boolean().default(true)
});

export const eventoSchema = z.object({
  tipo: z.enum(['BAILE', 'CURSO', 'EVENTO']),
  nome: requiredString,
  data: requiredString,
  local: requiredString,
  cidade: optionalString,
  capacidade: z.coerce.number().int().nonnegative('Capacidade invalida').optional(),
  status: z.enum(['ATIVO', 'INATIVO', 'CANCELADO', 'ENCERRADO']),
  observacao: optionalString,
  banner: optionalHttpsUrl,
  atracao: optionalString,
  preco: positiveOrZero,
  professor: optionalString,
  dataLimiteInscricao: optionalString,
  informacoesExtras: optionalString,
  lotes: z.array(ticketLotSchema).default([])
}).superRefine((data, ctx) => {
  if (data.tipo === 'BAILE') {
    if (!data.atracao?.trim()) ctx.addIssue({ code: 'custom', path: ['atracao'], message: 'Atração obrigatória para baile' });
  }
  if (data.tipo === 'CURSO' && !data.professor?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['professor'], message: 'Professor/instrutor obrigatorio para curso' });
  }
});

export const colaboradorSchema = z.object({
  nome: requiredString,
  cpf: cpfString,
  email: requiredEmail,
  role: z.enum(['ADMIN', 'STAFF']),
  status: z.enum(['ATIVO', 'INATIVO'])
});

export const clienteSchema = z.object({
  nome: requiredString,
  cpf: cpfString,
  telefone: requiredString,
  email: emailOptional,
  cep: optionalString,
  rua: requiredString,
  numero: requiredString,
  bairro: requiredString,
  cidade: requiredString,
  estado: requiredString,
  complemento: optionalString,
  status: z.enum(['ATIVO', 'INATIVO'])
});

export const alunoAdicionalSchema = z.object({
  nome: requiredString,
  cpf: cpfString,
  telefone: optionalString,
  nomePar: optionalString
});

export const padrinhoSchema = z.object({
  nome: optionalString
});

export const alunoSchema = z.object({
  nome: requiredString,
  cpf: cpfString,
  telefone: requiredString,
  email: emailOptional,
  cep: optionalString,
  rua: requiredString,
  numero: requiredString,
  bairro: requiredString,
  cidade: requiredString,
  estado: requiredString,
  complemento: optionalString,
  jaFoiAluno: z.boolean().default(false),
  cursoCidadeAnterior: optionalString,
  nomePar: optionalString,
  semPar: z.boolean().default(false),
  inscricaoMultipla: z.boolean().default(false),
  quantidadeAdicionais: z.coerce.number().int().nonnegative().default(0),
  adicionais: z.array(alunoAdicionalSchema).default([]),
  quantidadeParticipantes: z.coerce.number().int().positive().optional(),
  padrinhos: z.array(padrinhoSchema).default([]),
  cursoId: requiredString,
  status: z.enum(['ATIVO', 'PENDENTE', 'CONFIRMADA', 'CONFIRMADO', 'CANCELADO'])
}).superRefine((data, ctx) => {
  if (data.jaFoiAluno && !data.cursoCidadeAnterior?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['cursoCidadeAnterior'], message: 'Informe curso/cidade anterior' });
  }
  if (!data.semPar && !data.nomePar?.trim()) {
    ctx.addIssue({ code: 'custom', path: ['nomePar'], message: 'Informe o nome do par ou marque sem par' });
  }
  if (data.inscricaoMultipla && data.adicionais.length !== data.quantidadeAdicionais) {
    ctx.addIssue({ code: 'custom', path: ['adicionais'], message: 'Preencha os dados das pessoas adicionais' });
  }
});

export const pedidoLojaSchema = z.object({
  cliente: requiredString,
  cpf: cpfString,
  produtos: requiredString,
  quantidade: z.coerce.number().int().positive('Quantidade invalida'),
  valorUnitario: positiveOrZero,
  status: requiredString,
  formaPagamento: requiredString,
  entregaRetirada: requiredString,
  enderecoEntrega: optionalString
});

export const pedidoEventoSchema = z.object({
  eventoId: requiredString,
  eventoTipo: z.enum(['BAILE', 'CURSO', 'EVENTO']),
  cliente: requiredString,
  cpf: cpfString,
  lote: optionalString,
  quantidade: z.coerce.number().int().positive('Quantidade invalida'),
  valor: positiveOrZero,
  cortesia: z.boolean().default(false),
  motivoCortesia: optionalString,
  responsavelCortesia: optionalString,
  status: requiredString,
  statusPagamento: requiredString
}).superRefine((data, ctx) => {
  if (data.cortesia) {
    if (!data.motivoCortesia?.trim()) ctx.addIssue({ code: 'custom', path: ['motivoCortesia'], message: 'Motivo obrigatorio para cortesia' });
    if (!data.responsavelCortesia?.trim()) ctx.addIssue({ code: 'custom', path: ['responsavelCortesia'], message: 'Responsavel obrigatorio para cortesia' });
  }
});

export const pagamentoSchema = z.object({
  cliente: requiredString,
  valor: positiveOrZero,
  forma: optionalString
});

export const cortesiaSchema = z.object({
  beneficiario: requiredString,
  evento: optionalString,
  codigo: optionalString
});
