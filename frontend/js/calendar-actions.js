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
                !(await A.confirmAction({
                    title: 'Excluir ' + events.length + ' evento(s) do calendário?',
                    message:
                        (options.scope ? 'Calendário: ' + options.scope + '. ' : '') +
                        'Esta ação não pode ser desfeita.',
                    items: events.map((event) => event.titulo),
                    confirmLabel: 'Excluir eventos'
                }))
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
