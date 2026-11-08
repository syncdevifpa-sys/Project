/* Exclusão de projetos restrita à administração; a API também confere a permissão. */
(function (A) {
    'use strict';
    A.projectActions = {
        canDelete(session = A.auth.getSessao()) {
            return session.tipo_usuario !== 'externo' && Number(session.id_usuario) > 0 &&
                (session.is_admin === true || session.is_admin === 1);
        },
        async remove(project, onSuccess) {
            if (!this.canDelete() || !/^[1-9]\d*$/.test(String(project?.id_projeto || ''))) return;
            if (!(await A.confirmAction({
                title: 'Excluir projeto?',
                message: 'O projeto e suas inscrições serão removidos. Esta ação não pode ser desfeita.',
                items: [project.titulo],
                confirmLabel: 'Excluir projeto'
            }))) return;
            await A.api.expect(A.api.del('/api/projects/' + encodeURIComponent(project.id_projeto)));
            A.showToast('Projeto excluído: ' + project.titulo);
            await onSuccess();
        }
    };
})(window.Arcadia);
