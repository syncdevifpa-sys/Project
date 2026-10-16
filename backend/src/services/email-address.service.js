// Subconjunto conservador: um endereço simples, nunca uma lista ou cabeçalho MIME.
function emailAddress(value) {
    if (typeof value !== 'string' || value.length > 254 || /[\u0000-\u001f\u007f]/u.test(value))
        throw Object.assign(new Error('Informe um único endereço de e-mail válido.'), { status: 400 });
    const email = value.trim();
    const parts = email.split('@');
    const atom = /^[a-z0-9!#$%&'*+/=?^_`{|}~-]+$/i;
    const labels = parts[1]?.split('.') || [];
    if (
        parts.length !== 2 || !parts[0] || parts[0].length > 64 ||
        !parts[0].split('.').every(part => atom.test(part)) || labels.length < 2 ||
        !labels.every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label)) ||
        !/^[a-z]/i.test(labels.at(-1))
    ) throw Object.assign(new Error('Informe um único endereço de e-mail válido.'), { status: 400 });
    return parts[0] + '@' + parts[1].toLowerCase();
}
module.exports = { emailAddress };
