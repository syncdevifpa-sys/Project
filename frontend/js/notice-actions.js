(function (A) {
    'use strict';
    A.noticeActions = {
        canDelete(notice, session = A.auth.getSessao()) {
            return (
                session.tipo_usuario !== 'externo' &&
                Number(session.id_usuario) > 0 &&
                (session.is_admin === true ||
                    session.is_admin === 1 ||
                    Number(notice.id_usuario) === Number(session.id_usuario))
            );
        },
        async remove(notices, onSuccess) {
            if (!notices.length || notices.some((notice) => !this.canDelete(notice))) return;
            if (
                !(await A.confirmAction({
                    title:
                        notices.length === 1
                            ? 'Excluir publicação?'
                            : 'Excluir ' + notices.length + ' publicações?',
                    message: 'Esta ação não pode ser desfeita.',
                    items: notices.map((notice) => notice.titulo),
                    confirmLabel:
                        notices.length === 1 ? 'Excluir publicação' : 'Excluir publicações'
                }))
            )
                return;
            for (const notice of notices)
                await A.api.expect(
                    A.api.del('/api/notices/' + encodeURIComponent(notice.id_aviso))
                );
            A.showToast('Publicação excluída.');
            await onSuccess();
        }
    };
})(window.Arcadia);
