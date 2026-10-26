export interface WeeklySlot {
    dia_semana: number;
    hora_inicio: string;
    hora_fim: string;
    vigencia_inicio: string;
    vigencia_fim: string;
}
function invalid(message: string): never {
    throw Object.assign(new Error(message), {status: 400});
}
export function isoDate(value: unknown): string {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
        !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0,10) !== value)
        invalid('Data inválida.');
    return value;
}
function clock(value: unknown, end = false): string {
    if (typeof value !== 'string' || !(/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(value) || (end && /^24:[0-5]\d$/.test(value))))
        invalid('Horário inválido.');
    return value;
}
export function weeklySlot(value: unknown): WeeklySlot {
    if (!value || typeof value !== 'object' || Array.isArray(value)) invalid('Horário inválido.');
    const input = value as Record<string,unknown>;
    if ((typeof input.dia_semana !== 'number' && typeof input.dia_semana !== 'string') ||
        !/^[1-7]$/.test(String(input.dia_semana))) invalid('Dia da semana inválido.');
    const weekday = Number(input.dia_semana);
    const from = isoDate(input.vigencia_inicio), until = isoDate(input.vigencia_fim);
    const start = clock(input.hora_inicio), end = clock(input.hora_fim, true);
    if (!Number.isInteger(weekday) || weekday < 1 || weekday > 7 || start >= end ||
        until < from || Date.parse(until) - Date.parse(from) > 370 * 86400000)
        invalid('Confira dia, horários e vigência da oferta.');
    return {dia_semana:weekday,hora_inicio:start,hora_fim:end,vigencia_inicio:from,vigencia_fim:until};
}
