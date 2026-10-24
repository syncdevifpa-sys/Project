export interface CalendarEvent {
    readonly oculto?: unknown;
    readonly visibilidade?: unknown;
    readonly id_usuario?: unknown;
}
export interface CalendarViewer {
    readonly institutional?: boolean;
    readonly external?: boolean;
    readonly actorId?: unknown;
}
/** A checagem runtime permanece obrigatória; valores desconhecidos ficam restritos. */
export function canRead(event: CalendarEvent | null | undefined, viewer: CalendarViewer = {}): boolean {
    if (!event || event.oculto === true || Number(event.oculto) === 1) return false;
    if (event.visibilidade === 'publico') return true;
    if (event.visibilidade === 'comunidade') return !!(viewer.institutional || viewer.external);
    if (event.visibilidade === 'institucional') return !!viewer.institutional;
    // Bancos legados sem a coluna continuam restritos a sessões institucionais.
    if (event.visibilidade == null) return !!viewer.institutional;
    if (event.visibilidade === 'pessoal') {
        const owner = Number(event.id_usuario), actor = Number(viewer.actorId);
        return !!viewer.institutional && Number.isSafeInteger(owner) && owner > 0 && owner === actor;
    }
    return false;
}
