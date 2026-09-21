import React from 'react';

export type Tone = 'neutral' | 'cyan' | 'pink' | 'yellow' | 'green' | 'orange' | 'blue';

export interface BadgeProps {
  tone?: Tone;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = 'neutral', className, children }: BadgeProps) {
  const classes = ['ar-badge', 'ar-badge--' + tone, className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}

export interface TagProps {
  onField?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function Tag({ onField, className, children }: TagProps) {
  const classes = ['ar-tag', onField ? 'ar-tag--onfield' : '', className].filter(Boolean).join(' ');
  return <span className={classes}>{children}</span>;
}

/** Mapa fixo de status para o tom do Badge (Etapa 3) */
export const STATUS_TONE_MAP: Record<string, Tone> = {
  // Blue
  Fixado: 'blue',
  Edital: 'blue',
  Pesquisa: 'blue',

  // Green
  Novo: 'green',
  Publicado: 'green',
  Concluída: 'green',
  Concluida: 'green',
  Concluído: 'green',
  Concluido: 'green',
  Ativo: 'green',
  Pronto: 'green',

  // Orange
  Urgente: 'orange',
  Cancelamento: 'orange',

  // Cyan
  Matrícula: 'cyan',
  Matricula: 'cyan',
  Aberta: 'cyan',
  Aluno: 'cyan',

  // Pink
  Calendário: 'pink',
  Calendario: 'pink',
  Professor: 'pink',

  // Yellow
  Evento: 'yellow',
  'Em andamento': 'yellow',
  'Em seleção': 'yellow',
  'Em selecao': 'yellow',
  Inscrições: 'yellow',
  Inscricoes: 'yellow',
  Inovação: 'yellow',
  Inovacao: 'yellow',

  // Neutral
  Encerrado: 'neutral',
  Rascunho: 'neutral',
  Arquivado: 'neutral',
  Aguardando: 'neutral',
  'Em análise': 'neutral',
  'Em analise': 'neutral',
  Solicitado: 'neutral',
  Pendente: 'neutral',
  Servidor: 'neutral',
  Ensino: 'neutral',
  Extensão: 'neutral',
  Extensao: 'neutral',
};

export function getStatusTone(status: string): Tone {
  return STATUS_TONE_MAP[status] || 'neutral';
}
