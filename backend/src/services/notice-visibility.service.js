// Visibility is enforced before returning publications, independently of UI filters.
function canReadNotice(notice, viewer) {
    const institutional = viewer && viewer.tipo_usuario !== 'externo' && viewer.id_usuario;
    if (
        institutional &&
        (viewer.is_admin === true ||
            viewer.is_admin === 1 ||
            Number(notice.id_usuario) === Number(viewer.id_usuario))
    )
        return true;
    if (notice.situacao !== 'publicado') return false;
    const audience = notice.publico_alvo;
    if (audience === 'todos' || audience === 'externo') return true;
    return Boolean(institutional && audience === viewer.tipo_usuario);
}
module.exports = { canReadNotice };
