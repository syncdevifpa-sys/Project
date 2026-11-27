const crypto = require('node:crypto');
// Fontes SQL/JSON são texto UTF-8. LF e CRLF devem produzir o mesmo manifesto.
function hashText(input) {
    return crypto.createHash('sha256').update(input.toString('utf8').replace(/\r\n/g, '\n')).digest('hex');
}
module.exports = { hashText };
