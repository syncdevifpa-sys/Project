/* Contrato legado do backend sobre pg. Não abre conexões ao importar este módulo.
 * SQL e valores permanecem separados. DDL e múltiplas instruções não são aceitos.
 */
const { compile } = require('./postgres-dialect');
const { tokens } = require('./sql-lexer');
const defaultCatalog = require('./postgres-catalog.json');

function translateError(error, command) {
    if (!/^\d[A-Z0-9]{4}$/.test(error.code || '')) return error;
    const codes = {
        '23505':'ER_DUP_ENTRY', '42P01':'ER_NO_SUCH_TABLE', '42703':'ER_BAD_FIELD_ERROR',
        '22001':'ER_DATA_TOO_LONG', '22P02':'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD',
        '22007':'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD', '23502':'ER_BAD_NULL_ERROR',
        '23514':'ER_CHECK_CONSTRAINT_VIOLATED', '40001':'ER_LOCK_DEADLOCK',
        '40P01':'ER_LOCK_DEADLOCK', '55P03':'ER_LOCK_WAIT_TIMEOUT'
    };
    const result = new Error('Falha no banco PostgreSQL' + (error.constraint ? ' ('+error.constraint+')' : '') + '.');
    result.code = error.code === '23503' ? (command === 'DELETE' ? 'ER_ROW_IS_REFERENCED_2' : 'ER_NO_REFERENCED_ROW_2') : (codes[error.code] || error.code);
    result.postgresCode = error.code;
    result.constraint = error.constraint;
    // Não propagar detail, SQL completo ou parâmetros para logs/respostas HTTP.
    result.sqlMessage = error.column ? 'Coluna: '+error.column : result.message;
    return result;
}

function createBackend(pool, { catalog = defaultCatalog } = {}) {
    async function metadata(client, sql, values) {
        const list=tokens(sql), text=list.map(t=>t.text).join(' ');
        const show=/^SHOW COLUMNS FROM (\w+)(?: LIKE '([^']+)')?\s*;?$/i.exec(text);
        const columnsQuery=/^SELECT COLUMN_TYPE , IS_NULLABLE FROM information_schema \. COLUMNS WHERE TABLE_SCHEMA = DATABASE \( \) AND TABLE_NAME = '([^']+)' AND COLUMN_NAME = '([^']+)'$/i.exec(text);
        if (show || columnsQuery) {
            const table=(show||columnsQuery)[1], pattern=(show||columnsQuery)[2];
            const result=await client.query(`SELECT column_name,is_nullable,column_default FROM information_schema.columns
                WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,[table]);
            if (!result.rows.length) throw Object.assign(new Error('Tabela ausente.'),{code:'42P01'});
            const rows=result.rows.filter(row=>!pattern||row.column_name===pattern).map(row=>{
                const spec=catalog[table]?.columns.find(column=>column.name===row.column_name);
                if (!spec) throw new Error('Atualize o catálogo PostgreSQL antes de usar esta coluna.');
                const value=spec.default;
                const defaultValue=value==null?null:/^'(.*)'$/s.test(value)?value.slice(1,-1).replaceAll("''", "'"):/^-?\d+$/.test(value)?Number(value):value;
                return {Field:row.column_name,Type:spec.type,Null:row.is_nullable,Default:defaultValue,
                    Key:catalog[table].primary.includes(row.column_name)?'PRI':'',Extra:spec.identity?'auto_increment':'',
                    COLUMN_TYPE:spec.type,IS_NULLABLE:row.is_nullable};
            });
            return { rows, command:'SELECT' };
        }
        if (/information_schema\s*\.\s*KEY_COLUMN_USAGE/i.test(text)) {
            if(values.length!==2)throw new Error('Consulta de referências não suportada.');
            return client.query(`SELECT source.relname AS "TABLE_NAME", a.attname AS "COLUMN_NAME"
                FROM pg_constraint c JOIN pg_class source ON source.oid=c.conrelid
                JOIN pg_namespace sn ON sn.oid=source.relnamespace
                JOIN pg_class target ON target.oid=c.confrelid
                JOIN pg_namespace tn ON tn.oid=target.relnamespace
                JOIN LATERAL unnest(c.conkey,c.confkey) AS keys(source_key,target_key) ON true
                JOIN pg_attribute a ON a.attrelid=source.oid AND a.attnum=keys.source_key
                JOIN pg_attribute b ON b.attrelid=target.oid AND b.attnum=keys.target_key
                WHERE c.contype='f' AND sn.nspname='public' AND tn.nspname='public'
                AND target.relname=$1 AND b.attname=$2`,values);
        }
        if (/^SELECT TABLE_NAME FROM information_schema \. TABLES WHERE TABLE_SCHEMA = DATABASE \( \) AND TABLE_NAME = 'cadastro_auditoria'$/i.test(text))
            return client.query(`SELECT table_name AS "TABLE_NAME" FROM information_schema.tables WHERE table_schema='public' AND table_name='cadastro_auditoria'`);
        return null;
    }
    function facade(client, reserved = false) {
        let inTransaction=false, released=false, savepointNumber=0;
        async function execute(sql,values=[]) {
            if(released)throw new Error('Conexão já liberada.');
            const command=tokens(sql)[0]?.text.toUpperCase();
            if(!['SELECT','INSERT','UPDATE','DELETE','SHOW'].includes(command))throw new Error('Somente consultas e DML são permitidos no backend. Use migrações para DDL.');
            const savepoint=inTransaction?'arcadia_statement_'+(++savepointNumber):null;
            if(savepoint)await client.query('SAVEPOINT '+savepoint);
            try {
                const meta=await metadata(client,sql,values);
                const compiled=meta?null:compile(sql,values,catalog);
                const result=meta||await client.query(compiled.text,compiled.values);
                if(savepoint)await client.query('RELEASE SAVEPOINT '+savepoint);
                if(command==='SELECT'||command==='SHOW')return [result.rows,result.fields||[]];
                const affectedRows=result.rowCount??result.affectedRows??result.rows.length;
                const identity=compiled?.table&&catalog[compiled.table]?.identity;
                return [{affectedRows,changedRows:affectedRows,insertId:identity&&result.rows[0]?result.rows[0][identity]:0},result.fields||[]];
            } catch(error) {
                if(savepoint) {
                    try { await client.query('ROLLBACK TO SAVEPOINT '+savepoint); await client.query('RELEASE SAVEPOINT '+savepoint); }
                    catch(rollbackError) { error=rollbackError; }
                }
                throw translateError(error,command);
            }
        }
        return {
            dialect:'postgres', execute, query:execute,
            async schemaReady() {
                const {rows}=await client.query("SELECT table_name,column_name,is_generated FROM information_schema.columns WHERE table_schema='public'");
                const present=new Map(rows.map(row=>[row.table_name+'.'+row.column_name,row]));
                if(Object.entries(catalog).some(([table,spec])=>spec.columns.some(column=>!present.has(table+'.'+column.name))))return false;
                if(['academico_vinculos_turma.id_curso_ativo','academico_pedidos_ingresso.turma_pendente'].some(key=>present.get(key)?.is_generated!=='ALWAYS'))return false;
                const constraints=await client.query("SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND conname IN ('uq_vinculo_curso_ativo','uq_pedido_pendente')");
                return constraints.rows.length===2;
            },
            async beginTransaction() {
                if(!reserved||inTransaction||released)throw new Error('Transação exige uma conexão reservada e livre.');
                await client.query('BEGIN'); inTransaction=true;
            },
            async commit(){if(!inTransaction)throw new Error('Transação não iniciada.');await client.query('COMMIT');inTransaction=false;},
            async rollback(){if(inTransaction){await client.query('ROLLBACK');inTransaction=false;}},
            release(){
                if(!reserved||released)return;
                released=true;
                if(inTransaction)return client.query('ROLLBACK').then(()=>client.release(),error=>client.release(error));
                client.release();
            }
        };
    }
    const database=facade(pool);
    database.getConnection=async()=>facade(await pool.connect(),true);
    database.end=()=>pool.end();
    return database;
}
module.exports={createBackend,translateError};
