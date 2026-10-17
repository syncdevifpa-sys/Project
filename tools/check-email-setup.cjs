/* Diagnóstico sem revelar credenciais, enviar mensagens ou alterar o banco. */
const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const root = path.resolve(__dirname, '..');
for (const file of ['backend/.env', '.env']) {
    const target = path.join(root, file);
    if (fs.existsSync(target)) dotenv.config({ path: target, quiet: true });
}
const mail = require('../backend/src/services/email.service');
const present = (key) => Boolean(process.env[key]?.trim());
const checks = {
    SMTP_USER: present('SMTP_USER'),
    SMTP_PASS: present('SMTP_PASS'),
    APP_URL: present('APP_URL'),
    SMTP_valido: mail.recoveryConfigured(),
    segredo_cotas_32_bytes:
        Buffer.byteLength(process.env.RATE_LIMIT_SECRET || process.env.JWT_SECRET || '') >= 32
};
(async () => {
    if (process.argv.includes('--schema-local')) {
        if (!['localhost', '127.0.0.1', '::1'].includes(process.env.DB_HOST)) {
            checks.schema_local = false;
            console.log(
                'Consulta de esquema não executada: este comando aceita somente banco local.'
            );
        } else {
            const db = require('../backend/src/config/database');
            try {
                const [rows] = await db.execute(
                    "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME IN ('seguranca_limites','seguranca_email_lock','email_estado','email_tokens')"
                );
                const names = new Set(rows.map((row) => row.name));
                for (const name of [
                    'seguranca_limites',
                    'seguranca_email_lock',
                    'email_estado',
                    'email_tokens'
                ])
                    checks[name] = names.has(name);
            } catch {
                checks.schema_local = false;
            } finally {
                await db.end();
            }
        }
    }
    for (const [name, ok] of Object.entries(checks))
        console.log((ok ? 'OK      ' : 'PENDENTE') + ' ' + name);
    console.log(
        'Confirmação: ' +
            (process.env.EMAIL_VERIFICATION_ENABLED === 'true' ? 'ativada' : 'desligada')
    );
    console.log('Este diagnóstico não comprova autenticação SMTP nem entrega na caixa de entrada.');
    if (Object.values(checks).some((ok) => !ok)) process.exitCode = 1;
})();
