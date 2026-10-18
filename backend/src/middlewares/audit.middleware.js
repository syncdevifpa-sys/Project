/**
 * Arcádia IFPA — Middleware de Auditoria e Segurança
 * ==================================================
 * Registra acessos a rotas administrativas e ações críticas de escrita.
 */

const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, '../../../audit.log');

function auditLog(actionName) {
    return (req, res, next) => {
        const start = Date.now();
        const user = req.user ? `${req.user.email} (ID: ${req.user.id_usuario}, ${req.user.tipo_usuario})` : 'Anônimo';
        const ip = req.ip || req.connection?.remoteAddress || '127.0.0.1';

        res.on('finish', () => {
            const duration = Date.now() - start;
            const logEntry = `[${new Date().toISOString()}] ACTION="${actionName || req.method + ' ' + req.baseUrl + req.path}" USER="${user}" IP="${ip}" STATUS=${res.statusCode} DURATION=${duration}ms\n`;
            
            try {
                fs.appendFileSync(logFile, logEntry);
            } catch {
                // Silencioso em caso de permissão de escrita
            }
        });

        next();
    };
}

module.exports = { auditLog };
