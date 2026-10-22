// Executado por agendador do servidor, nunca pelo navegador. Não inicia o site.
if (!process.env.VERCEL) require('dotenv').config();
const db = require('../backend/src/config/database');
const { createDispatcher } = require('../backend/src/services/reminder-dispatch.service');
createDispatcher().run().then((result) => {
    console.log(JSON.stringify(result));
}).catch(() => {
    console.error('Não foi possível processar lembretes. Confira migração e configuração do servidor.');
    process.exitCode = 1;
}).finally(() => db.end());
