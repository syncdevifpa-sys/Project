const express = require("express");
const dotenv = require("dotenv");
dotenv.config();

const avisosRoutes = require("./src/routes/avisos.routes");
const authRoutes = require("./src/routes/auth.routes");

const app = express();
const PORT = process.env.PORT || 3001;

// CORS middleware
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    if (req.method === "OPTIONS") {
        return res.sendStatus(200);
    }
    next();
});

// API -> JSON
app.use(express.json());

// Rota principal
app.get("/api", (req, res) => {
    res.json({
        message: "API Arcádia funcionando!"
    });
});

// Rotas da aplicação
app.use("/api/avisos", avisosRoutes);
app.use("/api/auth", authRoutes);

// Inicia o Server
app.listen(PORT, () => {
    console.log(`API rodando em http://localhost:${PORT}`);
});