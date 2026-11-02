// Conteúdo fixo do portal. O link é construído pelo serviço com APP_URL validada.
const escapeHTML = (value) =>
    String(value).replace(
        /[&<>"']/g,
        (character) =>
            ({
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#39;'
            })[character]
    );

function linkHTML(url, verification) {
    const href = escapeHTML(url.href);
    const heading = verification ? 'Confirme seu e-mail' : 'Redefina sua senha';
    const action = verification ? 'Confirmar e-mail' : 'Redefinir senha';
    const intro = verification
        ? 'Recebemos uma solicitação de confirmação deste endereço no Arcádia. Use o botão para abrir a página segura e concluir a confirmação.'
        : 'Recebemos uma solicitação para redefinir sua senha no Arcádia. Use o botão para abrir a página segura e escolher uma nova senha.';
    const instruction = verification
        ? 'Na página, clique em <strong>Confirmar e-mail</strong>.'
        : 'Na página, escolha e confirme sua nova senha. Abrir este link não altera sua senha automaticamente.';
    const warning = verification
        ? 'Se você não solicitou esta confirmação, ignore a mensagem. Confirmar o endereço não comprova vínculo institucional nem concede permissões de professor ou administrador.'
        : 'Se você não solicitou a alteração, ignore esta mensagem. Sua senha atual continua válida até concluir a redefinição.';
    return `<!doctype html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${heading} — Arcádia</title></head>
<body style="margin:0;padding:0;background-color:#f2f6f3;color:#182820;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;background-color:#f2f6f3;">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background-color:#ffffff;border:1px solid #d8e3db;border-radius:20px;">
<tr><td style="padding:28px 24px 12px;font-size:16px;font-weight:bold;color:#1b4332;">Portal Arcádia</td></tr>
<tr><td style="padding:0 24px 12px;"><h1 style="margin:0;font-size:24px;line-height:32px;color:#182820;">${heading}</h1></td></tr>
<tr><td style="padding:0 24px 20px;font-size:16px;line-height:25px;">${intro}</td></tr>
<tr><td align="center" style="padding:0 24px 20px;">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td align="center" bgcolor="#1b4332" style="background-color:#1b4332;border-radius:12px;">
<a href="${href}" style="display:inline-block;padding:14px 24px;min-height:22px;border:1px solid #1b4332;border-radius:12px;background-color:#1b4332;color:#ffffff;font-size:16px;font-weight:bold;line-height:22px;text-align:center;text-decoration:none;">${action}</a>
</td></tr></table>
</td></tr>
<tr><td style="padding:0 24px 16px;font-size:14px;line-height:22px;">${instruction} O link expira em <strong>30 minutos</strong> e só pode ser utilizado uma vez.</td></tr>
<tr><td style="padding:0 24px 20px;font-size:14px;line-height:22px;">Se o botão não abrir, use <a href="${href}" style="color:#1b4332;text-decoration:underline;">${verification ? 'Abrir confirmação' : 'Abrir redefinição'}</a>.</td></tr>
<tr><td style="padding:20px 24px 28px;border-top:1px solid #d8e3db;font-size:13px;line-height:21px;color:#46584c;">${warning}</td></tr>
</table>
</td></tr></table>
</body></html>`;
}

module.exports = {
    confirmationHTML: (url) => linkHTML(url, true),
    resetPasswordHTML: (url) => linkHTML(url, false)
};
