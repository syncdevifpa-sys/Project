console.log("1 - arquivo started");

const db = require("./src/config/database");

console.log("2 - database loaded");

async function testDatabase() {
    try {
        console.log("3 - trying to connect...");

        const [result] = await db.query("SELECT 1");

        console.log("4 - MySQL connection working!");
        console.log(result);
    } catch (error) {
        console.log("5 - MySQL connection error:");
        console.error(error);
    }
}

testDatabase();