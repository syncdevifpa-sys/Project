(function (A) {
    'use strict';
    A.noticeActions = {
        canDelete(notice, session = A.auth.getSessao()) {
            return session.tipo_usuario !== 'externo' && Number(session.id_usuario) > 0 &&
                (session.is_admin === true || session.is_admin === 1 || Number(notice.id_usuario) === Number(session.id_usuario));
        },
        async remove(notices, onSuccess) {
            if (!notices.length || notices.some(notice => !this.canDelete(notice))) return;
            const titles = notices.map(notice => '• ' + notice.titulo).join('\n');
            if (!window.confirm('Excluir definitivamente esta(s) publicação(ões)?\n' + titles + '\nEsta ação não pode ser desfeita.')) return;
            for (const notice of notices) await A.api.expect(A.api.del('/api/notices/' + encodeURIComponent(notice.id_aviso)));
            A.showToast('Publicação excluída.');
            await onSuccess();
        }
    };
})(window.Arcadia);
