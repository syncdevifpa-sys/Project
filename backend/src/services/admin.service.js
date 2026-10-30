const db = require('../config/database');
function fail(status, message) {
    const error = new Error(message);
    error.status = status;
    throw error;
}
// Identificadores SQL vêm apenas deste catálogo fixo, nunca do cliente.
const resources = {
    notices: [
        'avisos',
        'id_aviso',
        'Avisos e notícias',
        'id_usuario tipo_publicacao capa titulo resumo descricao categoria publico_alvo situacao urgente fixado referencia data_prazo data_evento vagas'
    ],
    calendar: [
        'calendario',
        'id_evento',
        'Calendário',
        'id_usuario titulo descricao categoria periodo_letivo data_evento data_fim hora_inicio hora_fim local origem_calendario'
    ],
    documents: [
        'documentos',
        'id_documento',
        'Documentos',
        'id_usuario id_responsavel titulo motivo descricao tipo status observacao previsao data_emissao arquivo'
    ],
    projects: [
        'projetos',
        'id_projeto',
        'Projetos',
        'id_usuario titulo descricao eixo responsavel_nome rotulo_responsavel vagas unidade_vaga link situacao aprovacao aprovado_por data_inicio data_fim permite_externos'
    ],
    tasks: [
        'tarefas',
        'id_tarefa',
        'Tarefas',
        'id_usuario titulo categoria responsavel data_entrega prioridade status observacao concluida_em'
    ],
    reminders: [
        'lembretes',
        'id_lembrete',
        'Lembretes',
        'id_usuario id_evento titulo descricao tipo data_lembrete ativo'
    ],
    links: [
        'links_uteis',
        'id_link',
        'Links úteis',
        'id_usuario titulo descricao url categoria ordem'
    ],
    courses: ['cursos', 'id_curso', 'Cursos', 'nome nivel ativo regime_etapas total_etapas']
};
const labels = {
    regime_etapas: 'Regime das etapas (semestral ou anual)',
    total_etapas: 'Quantidade de etapas do curso',
    capa: 'Imagem de capa',
    tipo_publicacao: 'Tipo de publicação',
    titulo: 'Título',
    nome: 'Nome',
    resumo: 'Resumo',
    descricao: 'Descrição',
    categoria: 'Categoria',
    situacao: 'Situação',
    status: 'Situação',
    urgente: 'Urgente',
    fixado: 'Fixado',
    referencia: 'Referência',
    vagas: 'Vagas',
    motivo: 'Motivo',
    tipo: 'Tipo',
    observacao: 'Observação',
    previsao: 'Previsão',
    arquivo: 'URL do arquivo',
    local: 'Local',
    eixo: 'Área temática',
    link: 'Link',
    aprovacao: 'Aprovação',
    responsavel: 'Responsável',
    prioridade: 'Prioridade',
    ativo: 'Ativo',
    url: 'URL',
    ordem: 'Ordem',
    nivel: 'Nível',
    id_usuario: 'Pessoa responsável (ID)',
    id_responsavel: 'Responsável pelo documento (ID)',
    id_evento: 'Evento (ID)',
    aprovado_por: 'Aprovado por (ID)',
    publico_alvo: 'Público',
    data_prazo: 'Prazo',
    data_evento: 'Data do evento',
    data_fim: 'Data final',
    hora_inicio: 'Horário inicial',
    hora_fim: 'Horário final',
    responsavel_nome: 'Responsável',
    rotulo_responsavel: 'Rótulo do responsável',
    unidade_vaga: 'Unidade de vagas',
    data_inicio: 'Data inicial',
    data_lembrete: 'Data do lembrete',
    concluida_em: 'Concluída em',
    data_emissao: 'Emissão',
    periodo_letivo: 'Período letivo'
};
function config(key) {
    if (!Object.hasOwn(resources, key)) fail(404, 'Recurso inexistente.');
    return resources[key];
}
async function fields(key) {
    const [table, , , names] = config(key);
    const [columns] = await db.execute('SHOW COLUMNS FROM ' + table);
    return columns
        .filter((column) => names.split(' ').includes(column.Field))
        .map((column) => ({
            name: column.Field,
            label: labels[column.Field] || column.Field.replace(/_/g, ' '),
            type: column.Type,
            nullable: column.Null === 'YES',
            required: column.Null === 'NO' && column.Default === null,
            default: column.Default,
            options: column.Type.startsWith('enum(')
                ? [...column.Type.matchAll(/'([^']+)'/g)].map((match) => match[1])
                : null
        }));
}
async function catalog() {
    return Promise.all(
        Object.keys(resources).map(async (key) => ({
            key,
            label: resources[key][2],
            id: resources[key][1],
            fields: await fields(key)
        }))
    );
}
async function list(key) {
    const [table, id, , names] = config(key);
    let selected = names.split(' ');
    if (key === 'courses') selected = (await fields(key)).map((field) => field.name);
    if (key === 'notices' && !(await require('./notice-schema.service').hasNoticeType()))
        selected = selected.filter((name) => name !== 'tipo_publicacao');
    if (key === 'notices' && !(await require('./notice-schema.service').hasNoticeCover()))
        selected = selected.filter((name) => name !== 'capa');
    const [rows] = await db.execute(
        'SELECT ' + id + ', ' + selected.join(', ') + ' FROM ' + table + ' ORDER BY ' + id + ' DESC'
    );
    return rows;
}
async function save(key, id, body, actor) {
    const [table, primary] = config(key);
    const metadata = await fields(key);
    const values = {};
    for (const field of metadata) {
        let value = body[field.name];
        if (value === undefined) {
            if (!id && field.name === 'id_usuario') value = actor;
            else if (!id && field.required) fail(400, 'Preencha ' + field.label + '.');
            else continue;
        }
        if (value === '') value = null;
        if (!field.nullable && value === null) fail(400, 'Preencha ' + field.label + '.');
        if (field.name === 'capa')
            require('./profile-photo.service').validateProfilePhoto({ foto: value || '' });
        if (value !== null) {
            if (field.options && !field.options.includes(value))
                fail(400, 'Opção inválida em ' + field.label + '.');
            if (/^(?:int|smallint|tinyint)/.test(field.type)) {
                value = Number(value);
                if (
                    !Number.isInteger(value) ||
                    (field.type.includes('unsigned') && value < 0) ||
                    (field.type === 'tinyint(1)' && ![0, 1].includes(value))
                )
                    fail(400, 'Número inválido em ' + field.label + '.');
            } else if (typeof value !== 'string')
                fail(400, 'Texto inválido em ' + field.label + '.');
            const limit = field.type.match(/^varchar\((\d+)\)/);
            if (limit && value.length > Number(limit[1]))
                fail(400, 'Texto muito longo em ' + field.label + '.');
            if (['url', 'link', 'arquivo'].includes(field.name) && !/^https?:\/\//i.test(value))
                fail(400, 'Use uma URL HTTP ou HTTPS.');
        }
        values[field.name] = value;
    }
    if (
        key === 'courses' &&
        ['regime_etapas', 'total_etapas'].some((key) => Object.hasOwn(values, key))
    ) {
        const [current] = id
            ? await db.execute('SELECT regime_etapas,total_etapas FROM cursos WHERE id_curso = ?', [
                  id
              ])
            : [[]];
        const stage = { ...(current[0] || {}), ...values };
        if (stage.regime_etapas || stage.total_etapas) {
            if (
                !['semestral', 'anual'].includes(stage.regime_etapas) ||
                !Number.isInteger(stage.total_etapas) ||
                stage.total_etapas < 1 ||
                stage.total_etapas > 20
            )
                fail(400, 'Informe o regime e uma quantidade de 1 a 20 etapas.');
        }
    }
    if (key === 'projects' && (!id || values.aprovacao === 'aprovado')) values.aprovado_por = actor;
    const names = Object.keys(values);
    if (!names.length) fail(400, 'Nenhum campo para salvar.');
    if (id) {
        const [found] = await db.execute(`SELECT ${primary} FROM ${table} WHERE ${primary} = ?`, [
            id
        ]);
        if (!found.length) fail(404, 'Registro não encontrado.');
        await db.execute(
            `UPDATE ${table} SET ${names.map((name) => name + ' = ?').join(', ')} WHERE ${primary} = ?`,
            [...Object.values(values), id]
        );
    } else
        await db.execute(
            `INSERT INTO ${table} (${names.join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
            Object.values(values)
        );
}
async function remove(key, id) {
    const [table, primary] = config(key);
    if (key === 'courses') {
        const [used] = await db.execute(
            'SELECT id_usuario FROM usuarios WHERE id_curso = ? LIMIT 1',
            [id]
        );
        if (used.length) fail(409, 'Curso vinculado a pessoas. Desative-o em vez de excluir.');
    }
    if (key === 'projects') {
        const [used] = await db.execute(
            'SELECT id_usuario FROM projeto_inscricoes WHERE id_projeto = ? LIMIT 1',
            [id]
        );
        if (used.length) fail(409, 'Projeto com inscrições. Encerre-o em vez de excluir.');
    }
    if (key === 'calendar') {
        const [used] = await db.execute(
            'SELECT id_lembrete FROM lembretes WHERE id_evento = ? LIMIT 1',
            [id]
        );
        if (used.length) fail(409, 'Evento com lembretes. Edite-o em vez de excluir.');
    }
    const [result] = await db.execute(`DELETE FROM ${table} WHERE ${primary} = ?`, [id]);
    if (!result.affectedRows) fail(404, 'Registro não encontrado.');
}
async function people(kind) {
    if (!['users', 'external-users'].includes(kind)) fail(404, 'Grupo inexistente.');
    const table = kind === 'users' ? 'usuarios' : 'publico_externo';
    const columns =
        kind === 'users'
            ? 'id_usuario, nome, nome_social, telefone, matricula, email, tipo_usuario, situacao, is_admin, id_curso, periodo, setor'
            : 'id_externo, nome, email, situacao, organizacao';
    const [rows] = await db.execute(
        `SELECT ${columns} FROM ${table}${kind === 'external-users' ? ' WHERE NOT EXISTS(SELECT 1 FROM conta_vinculos v WHERE v.id_externo=publico_externo.id_externo)' : ''} ORDER BY nome`
    );
    return rows;
}
async function changePerson(kind, id, body, actor, deletion = false, selfRemoval = false) {
    actor = Number(actor);
    if (!['users', 'external-users'].includes(kind)) fail(404, 'Grupo inexistente.');
    const institutional = kind === 'users';
    if (selfRemoval && id !== actor)
        fail(403, 'A exclusão própria só permite a conta autenticada.');
    if (
        institutional &&
        id === actor &&
        ((deletion && !selfRemoval) ||
            (body.situacao && body.situacao !== 'ativo') ||
            body.is_admin === false)
    )
        fail(
            409,
            'Use a opção de exclusão própria nas configurações; não bloqueie nem retire a própria administração.'
        );
    const table = institutional ? 'usuarios' : 'publico_externo',
        primary = institutional ? 'id_usuario' : 'id_externo';
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();
        await require('./email-verification.service').lock(connection);
        // Todos os caminhos de gestão de pessoas usam esta trava para proteger o último admin.
        const [admins] = await connection.execute(
            "SELECT id_usuario FROM usuarios WHERE is_admin = TRUE AND situacao = 'ativo' ORDER BY id_usuario FOR UPDATE"
        );
        const [rows] = await connection.execute(
            `SELECT ${primary}, nome, email, situacao${institutional ? ', is_admin, tipo_usuario, id_externo_origem, nome_social, telefone, matricula' : ', (SELECT v.id_usuario FROM conta_vinculos v WHERE v.id_externo=publico_externo.id_externo) AS id_usuario_vinculado'}${selfRemoval ? ', senha' : ''} FROM ${table} WHERE ${primary} = ? FOR UPDATE`,
            [id]
        );
        const person = rows[0];
        if (!person) fail(404, 'Pessoa não encontrada.');
        if (!institutional && person.id_usuario_vinculado)
            fail(
                409,
                'Esta é a origem de uma conta já vinculada. Gerencie a mesma conta na lista de usuários institucionais.'
            );
        if (
            institutional &&
            person.is_admin &&
            person.situacao === 'ativo' &&
            admins.length <= 1 &&
            (deletion || body.is_admin === false || (body.situacao && body.situacao !== 'ativo'))
        )
            fail(409, 'Não é permitido remover o último administrador ativo.');
        if (deletion) {
            if (selfRemoval) {
                if (
                    body.confirmacao !== 'EXCLUIR' ||
                    typeof body.senha !== 'string' ||
                    !body.senha ||
                    Buffer.byteLength(body.senha, 'utf8') > 72
                )
                    fail(400, 'Confirme EXCLUIR e informe sua senha atual.');
                if (!(await require('bcrypt').compare(body.senha, person.senha)))
                    fail(403, 'Senha atual incorreta.');
            } else if (person.situacao !== 'bloqueado')
                fail(409, 'Desative a pessoa antes da exclusão definitiva.');
            const relations = institutional
                ? [
                      ['avisos', 'id_usuario'],
                      ['avisos_lidos', 'id_usuario'],
                      ['tarefas', 'id_usuario'],
                      ['documentos', 'id_usuario'],
                      ['documentos', 'id_responsavel'],
                      ['calendario', 'id_usuario'],
                      ['projetos', 'id_usuario'],
                      ['projetos', 'aprovado_por'],
                      ['projeto_inscricoes', 'id_usuario'],
                      ['lembretes', 'id_usuario'],
                      ['links_uteis', 'id_usuario'],
                      ['recuperacao_senha', 'id_usuario']
                  ]
                : [['recuperacao_senha', 'id_externo']];
            for (const [relation, column] of selfRemoval ? relations : []) {
                const [used] = await connection.execute(
                    `SELECT 1 FROM ${relation} WHERE ${column} = ? LIMIT 1`,
                    [id]
                );
                if (used.length)
                    fail(
                        409,
                        'Esta conta possui ligações ou histórico. A exclusão não é permitida; use desativação pela administração.'
                    );
            }
            if (selfRemoval) {
                const optionalRelations = institutional
                    ? [
                          ['documento_itens', 'id_usuario'],
                          ['documento_pastas', 'id_usuario'],
                          ['documento_salvos', 'id_usuario'],
                          ['academico_matriculas', 'id_aluno'],
                          ['academico_disciplinas', 'id_professor'],
                          ['academico_saidas_professor', 'id_professor'],
                          ['academico_vinculos_turma', 'id_aluno'],
                          ['academico_pedidos_ingresso', 'id_aluno'],
                          ['academico_gestao_historico', 'id_autor']
                      ]
                    : [
                          ['projeto_inscricoes_externas', 'id_externo'],
                          ['agenda_externa', 'id_externo'],
                          ['tarefas', 'id_externo'],
                          ['lembretes', 'id_externo']
                      ];
                for (const [relation, column] of optionalRelations) {
                    try {
                        const [used] = await connection.execute(
                            `SELECT 1 FROM ${relation} WHERE ${column} = ? LIMIT 1`,
                            [id]
                        );
                        if (used.length)
                            fail(
                                409,
                                'Esta conta possui ligações ou histórico. Use desativação pela administração.'
                            );
                    } catch (e) {
                        if (e.code !== 'ER_NO_SUCH_TABLE') throw e;
                    }
                }
            }
            await connection.execute(`DELETE FROM tokens WHERE ${primary} = ?`, [id]);
            try {
                const [requests] = await connection.execute(
                    `SELECT 1 FROM docente_requisitos WHERE ${primary} = ? LIMIT 1`,
                    [id]
                );
                if (selfRemoval && requests.length)
                    fail(
                        409,
                        'Esta conta possui uma solicitação de vínculo ou histórico em Requisitos. Use desativação para preservar o histórico.'
                    );
            } catch (error) {
                if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
            }
            if (!selfRemoval) {
                // Limpeza na mesma transação; módulos ainda não instalados são opcionais.
                const optional = async (sql, values = [id]) => {
                    try {
                        await connection.execute(sql, values);
                    } catch (error) {
                        if (error.code !== 'ER_NO_SUCH_TABLE') throw error;
                    }
                };
                await optional(`DELETE FROM docente_requisitos WHERE ${primary} = ?`);
                await optional('DELETE FROM academico_convites WHERE email = ?', [person.email]);
                if (institutional) {
                    // Excluir disciplinas primeiro libera seus anexos e demais dependências.
                    await optional('DELETE FROM academico_disciplinas WHERE id_professor = ?');
                    await optional(
                        'DELETE p FROM academico_publicacoes p JOIN documento_itens i ON i.id_item = p.id_item WHERE i.id_usuario = ?'
                    );
                    await optional('DELETE FROM documento_salvos WHERE id_usuario = ?');
                    await optional('DELETE FROM documento_itens WHERE id_usuario = ?');
                    await optional('DELETE FROM documento_pastas WHERE id_usuario = ?');
                    for (const relation of [
                        'avisos',
                        'tarefas',
                        'documentos',
                        'calendario',
                        'projetos',
                        'links_uteis'
                    ]) {
                        await connection.execute(`DELETE FROM ${relation} WHERE id_usuario = ?`, [
                            id
                        ]);
                    }
                }
                // As demais relações usam CASCADE ou SET NULL conforme o esquema.
            }
            await require('./email-verification.service').removeAccountState(
                connection,
                institutional ? 'users' : 'external',
                id
            );
            await require('./account-names.service').remove(
                connection,
                institutional ? 'users' : 'external',
                id
            );
            await connection.execute(`DELETE FROM ${table} WHERE ${primary} = ?`, [id]);
            if (institutional && person.id_externo_origem) {
                await require('./email-verification.service').removeAccountState(
                    connection,
                    'external',
                    person.id_externo_origem
                );
                await require('./account-names.service').remove(
                    connection,
                    'external',
                    person.id_externo_origem
                );
                await connection.execute('DELETE FROM publico_externo WHERE id_externo=?', [
                    person.id_externo_origem
                ]);
            }
        } else {
            if (Object.hasOwn(body, 'nome') && body.nome !== person.nome)
                fail(409, 'Use a solicitação de alteração do nome completo.');
            const allowed = institutional
                ? [
                      'nome',
                      'nome_social',
                      'telefone',
                      'matricula',
                      'email',
                      'tipo_usuario',
                      'situacao',
                      'is_admin',
                      'id_curso',
                      'periodo',
                      'setor'
                  ]
                : ['nome', 'email', 'situacao', 'organizacao'];
            const data = Object.fromEntries(
                Object.entries(body).filter(([key]) => allowed.includes(key))
            );
            if (
                data.nome !== undefined &&
                (typeof data.nome !== 'string' || !data.nome.trim() || data.nome.length > 100)
            )
                fail(400, 'Nome inválido.');
            for (const [column, limit] of [
                ['nome_social', 100],
                ['telefone', 20],
                ['matricula', 30],
                ['setor', 100],
                ['organizacao', 120]
            ])
                if (
                    data[column] !== undefined &&
                    data[column] !== null &&
                    (typeof data[column] !== 'string' || data[column].length > limit)
                )
                    fail(400, 'Texto inválido em ' + column + '.');
            if (
                data.email !== undefined &&
                (typeof data.email !== 'string' ||
                    data.email.length > 150 ||
                    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email))
            )
                fail(400, 'E-mail inválido.');
            if (
                data.situacao !== undefined &&
                !['ativo', 'pendente', 'bloqueado'].includes(data.situacao)
            )
                fail(400, 'Situação inválida.');
            if (!institutional && data.situacao === 'pendente')
                fail(400, 'Situação inválida para comunidade externa.');
            if (data.is_admin !== undefined && typeof data.is_admin !== 'boolean')
                fail(400, 'Administração deve ser verdadeiro ou falso.');
            if (
                data.tipo_usuario !== undefined &&
                !['discente', 'docente', 'servidor'].includes(data.tipo_usuario)
            )
                fail(400, 'Vínculo inválido.');
            if (
                data.email !== undefined &&
                data.email.trim().toLowerCase() !== person.email.trim().toLowerCase()
            )
                fail(
                    409,
                    'A troca do e-mail de acesso exige senha atual e confirmação pelo próprio usuário.'
                );
            delete data.email;
            const targetRole = data.tipo_usuario || person.tipo_usuario;
            if (institutional && targetRole === 'docente' && person.tipo_usuario !== 'docente')
                fail(
                    409,
                    'A atribuição de Professor exige aprovação pela aba Requisitos. Não altere o vínculo diretamente.'
                );
            const targetEmail = data.email || person.email;
            if (
                institutional &&
                ['docente', 'servidor'].includes(targetRole) &&
                ((data.tipo_usuario && data.tipo_usuario !== person.tipo_usuario) ||
                    (data.email && data.email !== person.email))
            ) {
                const ownerException = targetEmail === 'syncdevifpa@gmail.com';
                if (
                    !ownerException &&
                    (!require('../config/institution').isInstitutionalEmail(targetEmail) ||
                        body.institutional_confirmation !== true)
                )
                    fail(
                        400,
                        'Confirme administrativamente a posse do e-mail institucional e o cargo antes de atribuir esse vínculo.'
                    );
            }
            for (const column of ['id_curso', 'periodo'])
                if (
                    data[column] !== undefined &&
                    data[column] !== null &&
                    (!Number.isInteger(data[column]) || data[column] <= 0)
                )
                    fail(400, 'Valor acadêmico inválido.');
            if (data.periodo > 127) fail(400, 'Período inválido.');
            for (const key of ['nome_social', 'telefone', 'matricula']) {
                if (typeof data[key] === 'string') {
                    if (/[\x00-\x1f\x7f]/.test(data[key]))
                        fail(400, 'Texto inválido em ' + key + '.');
                    data[key] = data[key].trim() || null;
                }
            }
            if (data.id_curso) {
                const [courses] = await connection.execute(
                    'SELECT id_curso FROM cursos WHERE id_curso = ? AND ativo = TRUE',
                    [data.id_curso]
                );
                if (!courses.length) fail(400, 'Selecione um curso ativo válido.');
            }
            const newFields = ['nome_social', 'telefone', 'matricula'].filter(
                (key) =>
                    Object.hasOwn(data, key) &&
                    String(data[key] ?? '') !== String(person[key] ?? '')
            );
            if (newFields.length) {
                const [audit] = await connection.execute(
                    "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'cadastro_auditoria'"
                );
                if (!audit.length)
                    fail(
                        503,
                        'A equipe precisa habilitar a auditoria cadastral no banco antes de alterar matrícula, telefone ou nome social.'
                    );
                await connection.execute(
                    'INSERT INTO cadastro_auditoria(id_admin,id_usuario,campos) VALUES (?,?,?)',
                    [actor, id, JSON.stringify(Object.keys(data))]
                );
            }
            const fields = Object.keys(data);
            if (!fields.length) fail(400, 'Nenhum campo para salvar.');
            await connection.execute(
                `UPDATE ${table} SET ${fields.map((key) => key + ' = ?').join(', ')} WHERE ${primary} = ?`,
                [...Object.values(data), id]
            );
            await connection.execute(`DELETE FROM tokens WHERE ${primary} = ?`, [id]);
        }
        await connection.commit();
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}
async function registrations(project, person, body, deletion = false) {
    if (!project) {
        const [rows] = await db.execute(
            'SELECT i.id_projeto, i.id_usuario, i.status, p.titulo AS projeto, u.nome AS pessoa FROM projeto_inscricoes i JOIN projetos p ON p.id_projeto = i.id_projeto JOIN usuarios u ON u.id_usuario = i.id_usuario ORDER BY i.id_projeto, i.id_usuario'
        );
        return rows;
    }
    if (deletion) {
        const [result] = await db.execute(
            'DELETE FROM projeto_inscricoes WHERE id_projeto = ? AND id_usuario = ?',
            [project, person]
        );
        if (!result.affectedRows) fail(404, 'Inscrição não encontrada.');
        return;
    }
    if (!['inscrito', 'aprovado', 'recusado', 'cancelado'].includes(body.status))
        fail(400, 'Situação de inscrição inválida.');
    // Mantém o histórico da inscrição ao alterar sua situação.
    const [result] = await db.execute(
        'INSERT INTO projeto_inscricoes (id_projeto, id_usuario, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?',
        [project, person, body.status, body.status]
    );
    return { message: 'Inscrição salva.' };
}
module.exports = { resources, catalog, list, save, remove, people, changePerson, registrations };
