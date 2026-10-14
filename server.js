// Entrada reconhecida pelo adaptador Express da Vercel.
const express = require('express');
const app = express();
app.use(require('./backend/server'));
module.exports = app;
