// A confirmação só é ativada explicitamente; espaços e maiúsculas não alteram o valor.
function verificationEnabled() {
    return String(process.env.EMAIL_VERIFICATION_ENABLED || '').trim().toLowerCase() === 'true';
}
module.exports = { verificationEnabled };
