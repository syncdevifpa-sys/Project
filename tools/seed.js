/**
 * Arcádia IFPA — Script de População do Banco de Dados (Seed)
 * ==========================================================
 * Popula o banco com cursos, usuários de teste, editais, eventos e tarefas.
 */

const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '../backend/.env') });
dotenv.config();

const bcrypt = require('bcrypt');
const db = require('../backend/src/config/database');

async function runSeed() {
    console.log('🌱 Iniciando seed do banco de dados Arcádia...\n');

    try {
        // 1. Cursos
        console.log('📚 Inserindo cursos...');
        const cursos = [
            ['Tecnologia em Análise e Desenvolvimento de Sistemas', 'Graduação', 6],
            ['Engenharia de Controle e Automação', 'Graduação', 10],
            ['Técnico em Informática Integrado', 'Técnico', 8],
            ['Técnico em Mecânica Integrado', 'Técnico', 8],
            ['Licenciatura em Física', 'Graduação', 8]
        ];
        for (const [nome, nivel, duracao] of cursos) {
            await db.execute(
                `INSERT INTO cursos (nome, nivel, duracao_semestres) 
                 VALUES (?, ?, ?) 
                 ON DUPLICATE KEY UPDATE nivel = VALUES(nivel), duracao_semestres = VALUES(duracao_semestres)`,
                [nome, nivel, duracao]
            );
        }

        // 2. Usuários de Demonstração
        console.log('👤 Inserindo usuários de teste (senha: senha123)...');
        const senhaHash = await bcrypt.hash('senha123', 10);
        const usuarios = [
            ['Aluno Exemplo', 'aluno@ifpa.edu.br', senhaHash, 'discente', 1, 0],
            ['Prof. Carlos Silva', 'professor@ifpa.edu.br', senhaHash, 'docente', null, 0],
            ['Maria Servidora', 'servidor@ifpa.edu.br', senhaHash, 'servidor', null, 0],
            ['Admin Arcádia', 'admin@ifpa.edu.br', senhaHash, 'docente', null, 1]
        ];

        for (const [nome, email, senha, tipo, id_curso, is_admin] of usuarios) {
            await db.execute(
                `INSERT INTO usuarios (nome, email, senha, tipo_usuario, id_curso, is_admin, situacao) 
                 VALUES (?, ?, ?, ?, ?, ?, 'ativo') 
                 ON DUPLICATE KEY UPDATE nome = VALUES(nome), tipo_usuario = VALUES(tipo_usuario), is_admin = VALUES(is_admin)`,
                [nome, email, senha, tipo, id_curso, is_admin]
            );
        }

        // 3. Editais / Avisos
        console.log('📢 Inserindo editais e avisos...');
        const avisos = [
            ['Bolsas de Iniciação Científica (PIBIC)', 'Seleção de alunos para projetos de pesquisa do campus, com bolsa mensal.', 'matricula', 'todos', 'publicado', 1, 1],
            ['Auxílio Permanência 2026/2', 'Inscrições abertas para estudantes em situação de vulnerabilidade socioeconômica.', 'assistencia', 'discente', 'publicado', 0, 1],
            ['Semana de Ciência e Tecnologia (SNCT)', 'Apresentação de trabalhos, minicursos e palestras abertas à comunidade.', 'eventos', 'todos', 'publicado', 0, 0],
            ['Renovação de Matrícula para o Semestre 2026/2', 'Prazo final para confirmação de disciplinas pelo portal acadêmico.', 'matricula', 'discente', 'publicado', 1, 0]
        ];

        for (const [titulo, resumo, categoria, publico, situacao, urgente, fixado] of avisos) {
            await db.execute(
                `INSERT INTO avisos (titulo, resumo, descricao, categoria, publico_alvo, situacao, urgente, fixado, id_criador) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1) 
                 ON DUPLICATE KEY UPDATE resumo = VALUES(resumo), situacao = VALUES(situacao)`,
                [titulo, resumo, resumo, categoria, publico, situacao, urgente, fixado]
            );
        }

        // 4. Calendário
        console.log('📅 Inserindo eventos no calendário...');
        const eventos = [
            ['Início do Período Letivo 2026/2', '2026-08-10', 'Início das aulas para todos os cursos.', 'academico', 'Auditório Central'],
            ['Prazo Limite para Trancamento de Matrícula', '2026-09-30', 'Data final para solicitação de trancamento junto à CRA.', 'prazo', 'CRA'],
            ['Mostra de Projetos de Extensão', '2026-10-25', 'Exposição dos projetos desenvolvidos pela comunidade.', 'evento', 'Hall de Entrada']
        ];

        for (const [titulo, data, desc, cat, local] of eventos) {
            await db.execute(
                `INSERT INTO calendario_academico (titulo, data_evento, descricao, categoria, local) 
                 VALUES (?, ?, ?, ?, ?) 
                 ON DUPLICATE KEY UPDATE descricao = VALUES(descricao)`,
                [titulo, data, desc, cat, local]
            );
        }

        console.log('\n✅ Seed finalizado com sucesso!');
        console.log('Contas de teste criadas:');
        console.log('  - Aluno: aluno@ifpa.edu.br / senha123');
        console.log('  - Professor: professor@ifpa.edu.br / senha123');
        console.log('  - Servidor: servidor@ifpa.edu.br / senha123');
        console.log('  - Admin: admin@ifpa.edu.br / senha123');
        process.exit(0);

    } catch (err) {
        if (err.code === 'ECONNREFUSED' || (typeof err.message === 'string' && err.message.includes('ECONNREFUSED'))) {
            console.log('\n⚠️  Não foi possível conectar ao MySQL local (conexão recusada).');
            console.log('Para rodar o seed com o banco ativo:');
            console.log('  1. Inicie o MySQL local ou execute: docker compose up -d');
            console.log('  2. Em seguida, execute: npm run seed\n');
            process.exit(0);
        }
        console.error('❌ Erro durante o seed:', err);
        process.exit(1);
    }
}

runSeed();
