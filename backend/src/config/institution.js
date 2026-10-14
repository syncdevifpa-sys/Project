// Identifica somente o domínio; não comprova posse do e-mail nem cargo no campus.
function institutionalDomain() {
    return (process.env.INSTITUTIONAL_EMAIL_DOMAIN || 'ifpa.edu.br').trim().toLowerCase();
}
function isInstitutionalEmail(email) {
    if (typeof email !== 'string') return false;
    const parts = email.trim().toLowerCase().split('@');
    return parts.length === 2 && /^[^\s@]+$/.test(parts[0]) && parts[1] === institutionalDomain();
}
module.exports = { institutionalDomain, isInstitutionalEmail };
