(function (A) {
    'use strict';
    A.calendarActions = {
        canDelete() {
            const s = A.auth.getSessao();
            return s.tipo_usuario !== 'externo' && (s.is_admin === true || s.is_admin === 1);
        },
        async remove(events, onSuccess, options = {}) {
            if (!this.canDelete() || !events.length) return;
            if (
                !window.confirm(
                    'Apagar definitivamente ' +
                        events.length +
                        ' evento(s) do calendário?\n' +
                        (options.scope ? 'Calendário: ' + options.scope + '\n' : '') +
                        events
                            .slice(0, 8)
                            .map((event) => '• ' + event.titulo)
                            .join('\n') +
                        (events.length > 8 ? '\n…' : '') +
                        '\nEsta ação não pode ser desfeita.'
                )
            )
                return;
            let removed = 0;
            try {
                for (const event of events) {
                    await A.api.expect(
                        A.api.del('/api/calendar/' + encodeURIComponent(event.id_evento))
                    );
                    removed++;
                }
            } catch (error) {
                A.showToast(
                    removed +
                        ' evento(s) apagado(s). Os demais foram mantidos. ' +
                        (error.message || 'Não foi possível concluir.')
                );
                return;
            } finally {
                if (removed) await onSuccess();
            }
            A.showToast(removed + ' evento(s) apagado(s).');
        }
    };
})(window.Arcadia);
