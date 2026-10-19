const bcrypt = require('bcrypt');
const { developmentFallbackEnabled } = require('./development-mode.service');
const fs = require('fs');
const path = require('path');

// Hash bcrypt de 'senha123'
const DEFAULT_PASSWORD_HASH = '$2b$10$DbB0EUw5VXWNa2m7IGY9FuqhS3dn/bJfc9vf.gQLvc7eFSMKf8Fx.';
const DEV_DATA_FILE = path.join(__dirname, '..', '.dev-store.json');

const defaultUsers = [
    {
        id_usuario: 1,
        nome: 'Aluno Exemplo',
        email: 'aluno@ifpa.edu.br',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'discente',
        id_curso: 1,
        is_admin: 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    },
    {
        id_usuario: 2,
        nome: 'Prof. Carlos Silva',
        email: 'professor@ifpa.edu.br',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'docente',
        id_curso: null,
        is_admin: 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    },
    {
        id_usuario: 3,
        nome: 'Maria Servidora',
        email: 'servidor@ifpa.edu.br',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'servidor',
        id_curso: null,
        is_admin: 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    },
    {
        id_usuario: 4,
        nome: 'Admin Arcádia',
        email: 'admin@ifpa.edu.br',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'docente',
        id_curso: null,
        is_admin: 1,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    },
    {
        id_usuario: 5,
        nome: 'Renzo Aura',
        email: 'renzoaura@gmail.com',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'discente',
        id_curso: 1,
        is_admin: 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    },
    {
        id_usuario: 6,
        nome: 'Renzo IFPA',
        email: 'renzo@ifpa.edu.br',
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: 'discente',
        id_curso: 1,
        is_admin: 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    }
];

const defaultExternalUsers = [
    {
        id_externo: 1,
        nome: 'Visitante Comunidade',
        email: 'externo@gmail.com',
        senha: DEFAULT_PASSWORD_HASH,
        organizacao: 'Comunidade Externa',
        situacao: 'ativo',
        criado_em: new Date().toISOString()
    }
];

const defaultNotices = [
    {
        id_aviso: 1,
        tipo_publicacao: 'edital',
        capa: null,
        id_usuario: 4,
        titulo: 'Edital 01/2026 — Bolsas de Iniciação Científica (PIBIC)',
        resumo: 'Inscrições abertas para concessão de bolsas de pesquisa para discentes do campus Belém.',
        descricao: 'O Diretor-Geral do Campus Belém do IFPA torna pública a abertura de inscrições para o processo de seleção de projetos de pesquisa aplicada e concessão de bolsas de Iniciação Científica.\n\nRequisitos:\n- Estar regularmente matriculado em curso técnico ou de graduação.\n- Não possuir vínculo empregatício.\n- Dedicar 20 horas semanais ao plano de atividades.',
        categoria: 'editais',
        publico_alvo: 'todos',
        situacao: 'publicado',
        urgente: 1,
        fixado: 1,
        referencia: 'DPI/PROPPG 01/2026',
        data_prazo: '2026-11-30',
        data_evento: null,
        vagas: 25,
        detalhes: 'Inscrições pelo portal Arcádia até as 23h59 do prazo regimental.',
        data_publicacao: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    },
    {
        id_aviso: 2,
        tipo_publicacao: 'edital',
        capa: null,
        id_usuario: 4,
        titulo: 'Edital de Auxílio Permanência 2026.1',
        resumo: 'Programa de assistência estudantil para alunos em vulnerabilidade socioeconômica.',
        descricao: 'A Diretoria de Políticas Estudantis informa o cronograma de entrega da documentação comprobatória para o auxílio alimentação e transporte.',
        categoria: 'assistencia',
        publico_alvo: 'alunos',
        situacao: 'publicado',
        urgente: 0,
        fixado: 1,
        referencia: 'DAEST 04/2026',
        data_prazo: '2026-11-15',
        data_evento: null,
        vagas: 100,
        detalhes: 'Anexar comprovante de renda no formato PDF.',
        data_publicacao: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    },
    {
        id_aviso: 3,
        tipo_publicacao: 'noticia',
        capa: null,
        id_usuario: 2,
        titulo: 'Semana Nacional de Ciência e Tecnologia (SNCT 2026)',
        resumo: 'Apresentação de trabalhos, palestras e minicursos no auditório central.',
        descricao: 'Participe da SNCT 2026 no Campus Belém! Submissão de resumos expandidos até o final do mês.',
        categoria: 'eventos',
        publico_alvo: 'todos',
        situacao: 'publicado',
        urgente: 0,
        fixado: 0,
        referencia: 'SNCT-2026',
        data_prazo: '2026-11-20',
        data_evento: '2026-11-25',
        vagas: null,
        detalhes: 'Certificados emitidos pela PROEX.',
        data_publicacao: new Date().toISOString(),
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    }
];

let users = [...defaultUsers];
let externalUsers = [...defaultExternalUsers];
let notices = [...defaultNotices];

// Carregar dados salvos em disco (se existirem)
function loadFromDisk() {
    try {
        if (developmentFallbackEnabled() && fs.existsSync(DEV_DATA_FILE)) {
            const raw = fs.readFileSync(DEV_DATA_FILE, 'utf8');
            const data = JSON.parse(raw);
            if (Array.isArray(data.users)) {
                // Mesclar preservando novos usuários
                const map = new Map(defaultUsers.map(u => [u.id_usuario, u]));
                data.users.forEach(u => map.set(u.id_usuario, u));
                users = Array.from(map.values());
            }
            if (Array.isArray(data.externalUsers)) {
                const map = new Map(defaultExternalUsers.map(u => [u.id_externo, u]));
                data.externalUsers.forEach(u => map.set(u.id_externo, u));
                externalUsers = Array.from(map.values());
            }
            if (Array.isArray(data.notices)) {
                const map = new Map(defaultNotices.map(n => [n.id_aviso, n]));
                data.notices.forEach(n => map.set(n.id_aviso, n));
                notices = Array.from(map.values());
            }
        }
    } catch {}
}

function saveToDisk() {
    if (!developmentFallbackEnabled()) return;
    try {
        fs.writeFileSync(
            DEV_DATA_FILE,
            JSON.stringify({ users, externalUsers, notices }, null, 2),
            'utf8'
        );
    } catch {}
}

loadFromDisk();

function findUserByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return users.find((u) => u.email.toLowerCase() === clean) || null;
}

function findUserById(id) {
    const numId = Number(id);
    return users.find((u) => u.id_usuario === numId) || null;
}

function listUsers() {
    return users.filter((u) => u.situacao === 'ativo');
}

function createUser(userData) {
    const cleanEmail = String(userData.email).trim().toLowerCase();
    const existing = findUserByEmail(cleanEmail);
    if (existing) {
        const error = new Error('Este e-mail já está cadastrado.');
        error.code = 'ER_DUP_ENTRY';
        error.status = 409;
        throw error;
    }

    const nextId = users.length > 0 ? Math.max(...users.map((u) => u.id_usuario)) + 1 : 1;
    const newUser = {
        id_usuario: nextId,
        nome: userData.nome,
        nome_social: userData.nome_social || null,
        email: cleanEmail,
        telefone: userData.telefone || null,
        senha: userData.senha,
        tipo_usuario: userData.tipo_usuario || 'discente',
        matricula: userData.matricula || null,
        id_curso: userData.id_curso || null,
        foto: userData.foto || '',
        preferencias: userData.preferencias || {},
        is_admin: userData.is_admin ? 1 : 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    };
    users.push(newUser);
    saveToDisk();
    return { insertId: nextId, verificationSent: true };
}

function updateUser(userId, userData) {
    const numId = Number(userId);
    const user = users.find((u) => u.id_usuario === numId);
    if (!user) return { affectedRows: 0 };
    Object.assign(user, userData);
    user.atualizado_em = new Date().toISOString();
    saveToDisk();
    return { affectedRows: 1 };
}

function ensureUser(userData) {
    if (!userData || !userData.id_usuario) return null;
    const numId = Number(userData.id_usuario);
    let user = users.find((u) => u.id_usuario === numId);
    if (user) return user;
    if (userData.email) {
        user = findUserByEmail(userData.email);
        if (user) return user;
    }
    const cleanEmail = userData.email
        ? String(userData.email).trim().toLowerCase()
        : `user${numId}@ifpa.edu.br`;
    const newUser = {
        id_usuario: numId,
        nome: userData.nome || cleanEmail.split('@')[0],
        nome_social: null,
        email: cleanEmail,
        telefone: null,
        senha: DEFAULT_PASSWORD_HASH,
        tipo_usuario: userData.tipo_usuario || 'discente',
        matricula: null,
        id_curso: 1,
        foto: '',
        preferencias: {},
        is_admin: userData.is_admin ? 1 : 0,
        situacao: 'ativo',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    };
    users.push(newUser);
    saveToDisk();
    return newUser;
}

function updatePassword(userId, passwordHash) {
    const numId = Number(userId);
    const user = users.find((u) => u.id_usuario === numId);
    if (!user) return false;
    user.senha = passwordHash;
    saveToDisk();
    return true;
}

function findExternalByEmail(email) {
    if (!email) return null;
    const clean = String(email).trim().toLowerCase();
    return externalUsers.find((u) => u.email.toLowerCase() === clean) || null;
}

function findExternalById(id) {
    const numId = Number(id);
    return externalUsers.find((u) => u.id_externo === numId) || null;
}

function createExternalUser(userData) {
    const cleanEmail = String(userData.email).trim().toLowerCase();
    const existing = findExternalByEmail(cleanEmail);
    if (existing) {
        const error = new Error('Este e-mail já está cadastrado.');
        error.code = 'ER_DUP_ENTRY';
        error.status = 409;
        throw error;
    }

    const nextId = externalUsers.length > 0 ? Math.max(...externalUsers.map((u) => u.id_externo)) + 1 : 1;
    const newExt = {
        id_externo: nextId,
        nome: userData.nome,
        email: cleanEmail,
        telefone: userData.telefone || null,
        senha: userData.senha,
        organizacao: userData.organizacao || null,
        situacao: 'ativo',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    };
    externalUsers.push(newExt);
    saveToDisk();
    return { insertId: nextId, verificationSent: true };
}

function ensureExternalUser(userData) {
    if (!userData || !userData.id_externo) return null;
    const numId = Number(userData.id_externo);
    let user = externalUsers.find((u) => u.id_externo === numId);
    if (user) return user;
    if (userData.email) {
        user = findExternalByEmail(userData.email);
        if (user) return user;
    }
    const cleanEmail = userData.email
        ? String(userData.email).trim().toLowerCase()
        : `externo${numId}@gmail.com`;
    const newExt = {
        id_externo: numId,
        nome: userData.nome || cleanEmail.split('@')[0],
        email: cleanEmail,
        telefone: null,
        senha: DEFAULT_PASSWORD_HASH,
        organizacao: 'Comunidade Externa',
        situacao: 'ativo',
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    };
    externalUsers.push(newExt);
    saveToDisk();
    return newExt;
}

function listNotices() {
    return [...notices];
}

function findNoticeById(id) {
    const numId = Number(id);
    return notices.find((n) => n.id_aviso === numId) || null;
}

module.exports = {
    findUserByEmail,
    findUserById,
    listUsers,
    createUser,
    updateUser,
    ensureUser,
    updatePassword,
    findExternalByEmail,
    findExternalById,
    createExternalUser,
    ensureExternalUser,
    listNotices,
    findNoticeById,
    users,
    externalUsers,
    notices
};
