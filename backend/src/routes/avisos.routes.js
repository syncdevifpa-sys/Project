const express = require("express");

const router = express.Router();

const { listarAvisos } = require("../controllers/avisos.controller");

//Rota para listar avisos
router.get("/", listarAvisos);

module.exports = router;