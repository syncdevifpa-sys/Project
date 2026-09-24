const express = require("express");

const avisosRoutes = require("./src/routes/avisos.routes");

const app = express();

const PORT = 3001;

//API -> JSON
app.use(express.json());

//Rota principal
app.get("/api", (req, res) => {
    res.json({
        message: "API Arcádia funcionando!"
    });
});

//Rotas de Avisos
app.use("/api/avisos", avisosRoutes);

//Inicia o Server
app.listen(PORT, () => {
    console.log('API rodando em http://localhost:${PORT}');

});