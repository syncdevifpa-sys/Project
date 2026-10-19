// Dados simulados exigem ativação explícita e nunca são usados na Vercel/produção.
function developmentFallbackEnabled() {
    return (
        process.env.NODE_ENV === 'development' &&
        process.env.ARCADIA_DEV_MEMORY === 'true' &&
        !process.env.VERCEL &&
        !process.env.NODE_TEST_CONTEXT &&
        !process.execArgv.includes('--test')
    );
}
module.exports = { developmentFallbackEnabled };
