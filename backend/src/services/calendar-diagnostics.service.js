// Nunca registre PDF, caminhos, mensagem bruta, credenciais ou tokens.
const stages = new Set([
    'authorization',
    'metadata',
    'pdf-read',
    'preview-sign',
    'preview',
    'pdf-runtime',
    'pdf-assets',
    'pdf-init'
]);
const codes = new Set([
    'MODULE_NOT_FOUND',
    'ERR_MODULE_NOT_FOUND',
    'ERR_DLOPEN_FAILED',
    'ENOENT',
    'ECONNREFUSED',
    'ETIMEDOUT',
    'ER_NO_SUCH_TABLE',
    'ER_BAD_FIELD_ERROR'
]);
const names = new Set(['Error', 'TypeError', 'ReferenceError', 'RangeError', 'SyntaxError']);
async function atStage(stage, action) {
    try {
        return await action();
    } catch (error) {
        if (error && typeof error === 'object' && !error.calendarStage) error.calendarStage = stage;
        throw error;
    }
}
function report(error, stage) {
    console.error('[calendar-import]', {
        stage: stages.has(error?.calendarStage) ? error.calendarStage : stage,
        code: codes.has(error?.code) ? error.code : 'UNEXPECTED_ERROR',
        type: names.has(error?.name) ? error.name : 'Error'
    });
}
module.exports = { atStage, report };
