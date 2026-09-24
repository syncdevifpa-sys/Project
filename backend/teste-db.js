console.log("1 - arquivo iniciou");

const db = require("./src/config/database");

console.log("2 - database carregado");

async function testarBanco() {
    try {
        console.log("3 - tentando conectar...");

        const [resultado] = await db.query("SELECT 1");

        console.log("4 - Conexão com MySQL funcionando!");
        console.log(resultado);
    } catch (erro) {
        console.error("5 - Erro ao conectar com MySQL:");
        console.error(erro);
    }
}

testarBanco();