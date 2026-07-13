import type { Curso } from '@/types';
import { createEvento, deleteEvento, getEvento, listEventos, updateEvento } from './eventos.service';

function normalizeCurso(evento: any): Curso {
  return {
    id: String(evento.id),
    nome: evento.nome ?? evento.titulo ?? 'Curso sem nome',
    cidade: evento.cidade ?? '',
    horario: evento.data ?? evento.dataInicio ?? '',
    professor: evento.professor ?? evento.atracao ?? '',
    local: evento.local ?? '',
    status: evento.status ?? 'ATIVO',
    inscritos: evento.inscritos ?? evento._count?.inscricao ?? 0,
    capacidade: evento.capacidade ?? 0
  };
}

export async function listCursos() {
  const eventos = await listEventos({ tipo: 'CURSO' });
  return eventos.map(normalizeCurso);
}

export async function getCurso(id: string) {
  const evento = await getEvento(id);
  return normalizeCurso(evento);
}

export async function createCurso(data: Partial<Curso>) {
  const evento = await createEvento({ ...data, tipo: 'CURSO', preco: 0 } as any);
  return normalizeCurso(evento);
}

export async function updateCurso(id: string, data: Partial<Curso>) {
  const evento = await updateEvento(id, { ...data, tipo: 'CURSO' } as any);
  return normalizeCurso(evento);
}

export async function deleteCurso(id: string) {
  return deleteEvento(id);
}
