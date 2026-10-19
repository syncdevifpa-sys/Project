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
    const audiences = require('../../../front/js/notice-audiences').parse(notice.publico_alvo);
    if (audiences.includes('todos') || audiences.includes('externo')) return true;
    return Boolean(institutional && audiences.includes(viewer.tipo_usuario));
}
module.exports = { canReadNotice };
