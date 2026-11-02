/* Somente mensagens transacionais iniciadas pelo servidor. Não há relay de boas-vindas. */
const nodemailer = require('nodemailer');
const { emailAddress } = require('./email-address.service');
const { confirmationHTML, resetPasswordHTML } = require('./email-templates.service');

function recoveryConfigured() {
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS || !process.env.APP_URL) return false;
    try {
        emailAddress(process.env.SMTP_USER);
        const service = process.env.SMTP_SERVICE || 'gmail';
        if (!/^[a-z0-9.-]{1,60}$/i.test(service)) return false;
        const url = new URL(process.env.APP_URL);
        const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
        return (
            !url.username &&
            !url.password &&
            (url.protocol === 'https:' ||
                (!process.env.VERCEL &&
                    process.env.NODE_ENV !== 'production' &&
                    local &&
                    url.protocol === 'http:'))
        );
    } catch {
        return false;
    }
}

async function sendLink(toEmail, token, verification = false) {
    // Valida antes de construir transporte ou entregar dados ao analisador de endereços.
    const recipient = emailAddress(toEmail);
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token))
        throw new Error('INVALID_RECOVERY_TOKEN');
    if (!recoveryConfigured()) throw new Error('PASSWORD_RECOVERY_NOT_CONFIGURED');
    const sender = emailAddress(process.env.SMTP_USER);
    const url = new URL(
        verification ? '/verify-email.html' : '/reset-password.html',
        process.env.APP_URL
    );
    url.hash = new URLSearchParams({ token }).toString();
    let transporter;
    try {
        transporter = nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || 'gmail',
            connectionTimeout: 10000,
            greetingTimeout: 10000,
            socketTimeout: 15000,
            requireTLS: true,
            tls: { rejectUnauthorized: true },
            disableFileAccess: true,
            disableUrlAccess: true,
            maxRecipients: 1,
            logger: false,
            debug: false,
            auth: { user: sender, pass: process.env.SMTP_PASS }
        });
        // O HTML de confirmação é fixo; somente a URL validada e escapada é interpolada.
        const result = await transporter.sendMail({
            from: { name: 'Arcádia IFPA', address: sender },
            to: recipient,
            envelope: { from: sender, to: [recipient] },
            subject: verification
                ? 'Confirme seu e-mail — Arcádia'
                : 'Redefinição de senha — Arcádia',
            text: verification
                ? `Para confirmar a posse deste e-mail na Arcádia, abra ${url.href}\nNa página, clique em Confirmar e-mail. O link expira em 30 minutos. Isso não confirma vínculo institucional. Se não solicitou, ignore esta mensagem.`
                : `Para redefinir sua senha, abra ${url.href}\nO link expira em 30 minutos. Se não solicitou a alteração, ignore esta mensagem.`,
            html: verification ? confirmationHTML(url) : resetPasswordHTML(url),
            disableFileAccess: true,
            disableUrlAccess: true
        });
        if (!result.accepted || result.accepted.length !== 1)
            throw new Error('PASSWORD_RECOVERY_DELIVERY_FAILED');
    } catch (error) {
        // Diagnóstico privado: nunca registra destinatário, senha ou conteúdo do link.
        const codes = ['EAUTH', 'ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'EENVELOPE', 'EMESSAGE'];
        console.error('[email] Falha de envio', {
            code: codes.includes(error.code) ? error.code : 'DELIVERY_FAILED',
            responseCode: Number.isInteger(error.responseCode) ? error.responseCode : null
        });
        // Não propaga mensagens do provedor, destinatário, conteúdo nem credenciais.
        throw new Error('PASSWORD_RECOVERY_DELIVERY_FAILED');
    } finally {
        try {
            transporter?.close?.();
        } catch {
            /* A falha de limpeza não divulga detalhes SMTP. */
        }
    }
}
const sendPasswordRecovery = (email, token) => sendLink(email, token);
const sendEmailVerification = (email, token) => sendLink(email, token, true);
async function sendReminder(toEmail, reminder) {
    if (!recoveryConfigured()) throw new Error('REMINDER_EMAIL_NOT_CONFIGURED');
    const recipient = emailAddress(toEmail),
        sender = emailAddress(process.env.SMTP_USER);
    if (
        !Number.isSafeInteger(reminder.id) ||
        !Number.isSafeInteger(reminder.versao) ||
        typeof reminder.titulo !== 'string' ||
        reminder.titulo.length > 150
    )
        throw new Error('INVALID_REMINDER');
    const transport = nodemailer.createTransport({
        service: process.env.SMTP_SERVICE || 'gmail',
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        requireTLS: true,
        tls: { rejectUnauthorized: true },
        disableFileAccess: true,
        disableUrlAccess: true,
        maxRecipients: 1,
        logger: false,
        debug: false,
        auth: { user: sender, pass: process.env.SMTP_PASS }
    });
    let deadline;
    try {
        const link = new URL(
            reminder.calendar ? '/calendar.html' : '/tasks.html',
            process.env.APP_URL
        );
        const result = await Promise.race([
            transport.sendMail({
                from: { name: 'Arcádia IFPA', address: sender },
                to: recipient,
                envelope: { from: sender, to: [recipient] },
                subject: 'Seu lembrete — Arcádia',
                messageId: `<arcadia-reminder-${reminder.id}-${reminder.versao}@${new URL(process.env.APP_URL).hostname}>`,
                text: `Lembrete: ${reminder.titulo}\n\nAbra seus lembretes: ${link.href}\nVocê autorizou estes avisos. Para desativar, abra Meus lembretes e notificações no Calendário ou em Tarefas.`,
                disableFileAccess: true,
                disableUrlAccess: true
            }),
            new Promise((_, reject) => {
                deadline = setTimeout(() => {
                    try {
                        transport.close?.();
                    } catch {}
                    reject(new Error('REMINDER_SMTP_TIMEOUT'));
                }, 15000);
            })
        ]);
        if (result.accepted?.length !== 1) throw new Error('DELIVERY_FAILED');
    } catch {
        throw new Error('REMINDER_DELIVERY_FAILED');
    } finally {
        clearTimeout(deadline);
        try {
            transport.close?.();
        } catch {}
    }
}
module.exports = { recoveryConfigured, sendPasswordRecovery, sendEmailVerification, sendReminder };
