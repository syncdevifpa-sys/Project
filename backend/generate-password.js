const bcrypt = require("bcrypt");

async function generatePassword() {
    const password = "123456";

    const hash = await bcrypt.hash(password, 10);

    console.log("Password hash:");
    console.log(hash);
}

generatePassword();