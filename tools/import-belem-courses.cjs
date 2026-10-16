// Inclusão explícita apenas em conexão local. Sem UPDATE, DELETE ou troca de IDs.
const fs = require('node:fs'),
    path = require('node:path'),
    dotenv = require('dotenv'),
    mysql = require('mysql2/promise');
const catalog = require('../backend/catalog/belem-courses-2026.json'),
    { plan, sql } = require('./lib/course-catalog.cjs');
async function main() {
    const apply = process.argv.includes('--apply-local');
    if (process.argv.includes('--write-sql')) {
        fs.writeFileSync(
            path.resolve(__dirname, '../backend/admin/import-belem-courses.sql'),
            sql(catalog)
        );
        const schemaPath = path.resolve(__dirname, '../backend/schema.sql');
        const values = catalog.courses
            .map((c) => "('" + c.nome.replace(/'/g, "''") + "', '" + c.nivel + "')")
            .join(',\n');
        const seed =
            '-- Oferta de Belém comprovada em 2026; fontes em catalog/belem-courses-2026.json.\nINSERT INTO cursos (nome, nivel) VALUES\n' +
            values +
            ';';
        const schema = fs
            .readFileSync(schemaPath, 'utf8')
            .replace(/^-- Oferta de Belém[^\n]*\r?\n/gm, '')
            .replace(
                /INSERT INTO cursos \(nome, nivel\) VALUES[\s\S]*?;\r?\n(?:-- Acrescente[^\n]*\n)?/,
                seed + '\n'
            );
        fs.writeFileSync(schemaPath, schema);
        console.log('Migração revisável e seed para bancos novos gerados.');
        return;
    }
    const env = {
        ...dotenv.parse(fs.readFileSync(path.resolve(__dirname, '../backend/.env'))),
        ...process.env
    };
    if (apply && !/^(localhost|127\.0\.0\.1|::1)$/i.test(env.DB_HOST || ''))
        throw new Error('Inclusão automática permitida apenas na conexão local confirmada.');
    const connection = await mysql.createConnection({
        host: env.DB_HOST,
        user: env.DB_USER,
        password: env.DB_PASSWORD,
        database: env.DB_NAME,
        port: Number(env.DB_PORT || 3306),
        connectTimeout: 5000,
        ...(env.DB_SSL === 'true'
            ? { ssl: { rejectUnauthorized: true, ...(env.DB_SSL_CA ? { ca: env.DB_SSL_CA } : {}) } }
            : {})
    });
    try {
        if (apply) await connection.beginTransaction();
        const [existing] = await connection.execute(
            'SELECT id_curso, nome, nivel, ativo FROM cursos ORDER BY id_curso' +
                (apply ? ' FOR UPDATE' : '')
        );
        const changes = plan(existing, catalog);
        if (apply && existing.length !== 2 && changes.missing.length)
            throw new Error(
                'A condição de somente dois cursos mudou. Revise a lista antes de incluir.'
            );
        if (apply) {
            for (const course of changes.missing)
                await connection.execute(
                    'INSERT INTO cursos (nome,nivel,ativo) VALUES (?,?,TRUE)',
                    [course.nome, course.nivel]
                );
            await connection.commit();
        }
        console.log(
            JSON.stringify({
                scope: apply ? 'local' : 'consulta à conexão configurada',
                applied: apply,
                before: existing.length,
                included: apply ? changes.missing.length : 0,
                missingCount: changes.missing.length,
                ...(!apply ? { missing: changes.missing.map((c) => c.nome) } : {}),
                conflicts: changes.conflicts,
                after: existing.length + (apply ? changes.missing.length : 0),
                preservedIds: existing.map((c) => c.id_curso)
            })
        );
    } catch (error) {
        if (apply) await connection.rollback();
        throw error;
    } finally {
        await connection.end();
    }
}
main().catch((error) => {
    console.error(error.code || error.message);
    process.exitCode = 1;
});
