const avisosModel = require("../models/avisos.model");

async function listarAvisos(req, res) {
    try {
        const avisos = await avisosModel.listarAvisos();

        res.json(avisos);
    } catch (erro) {
        console.error("Erro ao buscar avisos:", erro);

        res.status(500).json({
            erro: "Erro ao buscar avisos."
        });
    }
}

module.exports = {
    listarAvisos
};