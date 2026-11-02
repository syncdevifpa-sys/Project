const db = require('../config/database');
async function publicQuery(sql, params = []) {
    for (;;) {
        try {
            return await db.execute(sql, params);
        } catch (e) {
            const message = e.sqlMessage || e.message || '';
            if (e.code !== 'ER_BAD_FIELD_ERROR') throw e;
            if (/visibilidade/.test(message) && sql.includes('            visibilidade,'))
                sql = sql.replace(
                    '            visibilidade,',
                    "            'privado' AS visibilidade,"
                );
            else if (
                /permite_externos/.test(message) &&
                sql.includes('            permite_externos,')
            )
                sql = sql.replace(
                    '            permite_externos,',
                    '            0 AS permite_externos,'
                );
            else if (/capa/.test(message) && sql.includes('            capa,'))
                sql = sql.replace('            capa,', '            NULL AS capa,');
            else throw e;
        }
    }
}

async function listProjects(options = {}) {
    const [projects] = await publicQuery(`
        SELECT
            id_projeto,
            id_usuario,
            titulo,
            descricao,
            capa,
            eixo,
            responsavel_nome,
            rotulo_responsavel,
            vagas,
            permite_externos,
            visibilidade,
            unidade_vaga,
            link,
            situacao,
            aprovacao,
            aprovado_por,
            data_inicio,
            data_fim,
            criado_em,
            atualizado_em
        FROM projetos
        WHERE aprovacao = 'aprovado'
        ORDER BY criado_em DESC
    `);

    return options.institutional
        ? projects
        : projects.filter((project) => project.visibilidade === 'publico');
}

async function findProjectById(projectId) {
    const [projects] = await publicQuery(
        `
        SELECT
            id_projeto,
            id_usuario,
            titulo,
            descricao,
            capa,
            eixo,
            responsavel_nome,
            rotulo_responsavel,
            vagas,
            permite_externos,
            visibilidade,
            unidade_vaga,
            link,
            situacao,
            aprovacao,
            aprovado_por,
            data_inicio,
            data_fim,
            criado_em,
            atualizado_em
        FROM projetos
        WHERE id_projeto = ?
    `,
        [projectId]
    );

    return projects[0];
}

async function createProject(userId, projectData) {
    const {
        titulo,
        descricao,
        eixo = 'pesquisa',
        responsavel_nome = null,
        rotulo_responsavel = 'Coordenação',
        vagas = 0,
        unidade_vaga = 'vagas',
        link = null,
        situacao = 'ativo',
        permite_externos = false,
        data_inicio = null,
        data_fim = null,
        visibilidade = 'privado'
    } = projectData;

    let coverAvailable = false;
    if (projectData.capa) {
        const [columns] = await db.execute("SHOW COLUMNS FROM projetos LIKE 'capa'");
        coverAvailable = columns.some((column) => column.Field === 'capa');
        if (!coverAvailable)
            throw Object.assign(
                new Error(
                    'A equipe precisa habilitar imagens de Projetos no banco. Seus dados continuam no formulário.'
                ),
                { status: 409 }
            );
    }
    const [result] = await db.execute(
        `
        INSERT INTO projetos (
            id_usuario,
            titulo,
            descricao,
            eixo,
            responsavel_nome,
            rotulo_responsavel,
            vagas,
            permite_externos,
            unidade_vaga,
            link,
            situacao,
            data_inicio,
            data_fim,
            visibilidade${coverAvailable ? ', capa' : ''}
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?${coverAvailable ? ', ?' : ''})
    `,
        [
            userId,
            titulo,
            descricao,
            eixo,
            responsavel_nome,
            rotulo_responsavel,
            vagas,
            permite_externos,
            unidade_vaga,
            link,
            situacao,
            data_inicio,
            data_fim,
            visibilidade,
            ...(coverAvailable ? [projectData.capa] : [])
        ]
    );

    return result;
}

async function updateProject(projectId, projectData) {
    const currentProject = await findProjectById(projectId);

    if (!currentProject) {
        return null;
    }

    const {
        titulo = currentProject.titulo,
        descricao = currentProject.descricao,
        eixo = currentProject.eixo,
        responsavel_nome = currentProject.responsavel_nome,
        rotulo_responsavel = currentProject.rotulo_responsavel,
        vagas = currentProject.vagas,
        permite_externos = currentProject.permite_externos,
        unidade_vaga = currentProject.unidade_vaga,
        link = currentProject.link,
        situacao = currentProject.situacao,
        data_inicio = currentProject.data_inicio,
        data_fim = currentProject.data_fim
    } = projectData;

    const [result] = await db.execute(
        `
        UPDATE projetos
        SET
            titulo = ?,
            descricao = ?,
            eixo = ?,
            responsavel_nome = ?,
            rotulo_responsavel = ?,
            vagas = ?,
            permite_externos = ?,
            unidade_vaga = ?,
            link = ?,
            situacao = ?,
            data_inicio = ?,
            data_fim = ?
        WHERE id_projeto = ?
    `,
        [
            titulo,
            descricao,
            eixo,
            responsavel_nome,
            rotulo_responsavel,
            vagas,
            permite_externos,
            unidade_vaga,
            link,
            situacao,
            data_inicio,
            data_fim,
            projectId
        ]
    );

    return result;
}

async function deleteProject(projectId) {
    const [result] = await db.execute(
        `
        DELETE FROM projetos
        WHERE id_projeto = ?
    `,
        [projectId]
    );

    return result;
}

async function approveProject(projectId, adminId) {
    const [result] = await db.execute(
        `
        UPDATE projetos
        SET
            aprovacao = 'aprovado',
            aprovado_por = ?
        WHERE id_projeto = ?
    `,
        [adminId, projectId]
    );

    return result;
}

async function rejectProject(projectId, adminId) {
    const [result] = await db.execute(
        `
        UPDATE projetos
        SET
            aprovacao = 'recusado',
            aprovado_por = ?
        WHERE id_projeto = ?
    `,
        [adminId, projectId]
    );

    return result;
}

async function registerForProject(projectId, userId) {
    const [result] = await db.execute(
        `
        INSERT INTO projeto_inscricoes (
            id_projeto,
            id_usuario
        )
        VALUES (?, ?)
    `,
        [projectId, userId]
    );

    return result;
}

async function cancelRegistration(projectId, userId) {
    const [result] = await db.execute(
        `
        UPDATE projeto_inscricoes
        SET status = 'cancelado'
        WHERE id_projeto = ?
        AND id_usuario = ?
    `,
        [projectId, userId]
    );

    return result;
}

async function listProjectRegistrations(projectId) {
    const [registrations] = await db.execute(
        `
        SELECT
            pi.id_projeto,
            pi.id_usuario,
            u.nome,
            u.email,
            pi.status,
            pi.criado_em
        FROM projeto_inscricoes pi
        INNER JOIN usuarios u
            ON u.id_usuario = pi.id_usuario
        WHERE pi.id_projeto = ?
        ORDER BY pi.criado_em DESC
    `,
        [projectId]
    );

    return registrations;
}

module.exports = {
    listProjects,
    findProjectById,
    createProject,
    updateProject,
    deleteProject,
    approveProject,
    rejectProject,
    registerForProject,
    cancelRegistration,
    listProjectRegistrations
};
