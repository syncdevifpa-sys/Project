/**
 * Arcadia IFPA - Email Service (Backend)
 * =====================================
 * Sends welcome emails and notifications via Nodemailer (Gmail / SMTP / Resend).
 */

const nodemailer = require('nodemailer');

function createTransporter() {
    // If environment variables for SMTP are provided
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
        return nodemailer.createTransport({
            service: process.env.SMTP_SERVICE || 'gmail',
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS // Gmail App Password (16 characters)
            }
        });
    }

    // Default test/fallback ethereal transporter
    return null;
}

/**
 * Send welcome email to newly registered or logged in user
 * @param {string} toEmail - User's destination email
 * @param {string} userName - User's name
 * @param {string} provider - 'Google' or 'Arcadia'
 */
async function sendWelcomeEmail(toEmail, userName = 'Usuário', provider = 'Google') {
    const transporter = createTransporter();

    const subject = `🎉 Boas-vindas à Arcadia IFPA, ${userName}!`;
    const htmlContent = `
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0b1a13; color: #f0fdf4; margin: 0; padding: 24px; }
        .card { max-width: 520px; margin: 0 auto; background-color: #151d18; border-radius: 16px; border: 1px solid #28382f; padding: 32px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
        .brand { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
        .brand-title { font-size: 22px; font-weight: 700; color: #52b788; letter-spacing: -0.5px; }
        .brand-sub { font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #95d5b2; }
        .title { font-size: 20px; font-weight: 600; color: #ffffff; margin-top: 0; }
        .desc { font-size: 14px; line-height: 1.6; color: #b7e4c7; }
        .badge { display: inline-block; background-color: rgba(82, 183, 136, 0.15); border: 1px solid #52b788; color: #52b788; border-radius: 8px; padding: 6px 12px; font-size: 13px; font-weight: 600; margin: 16px 0; }
        .btn { display: inline-block; background-color: #2d6a4f; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 16px; }
        .footer { margin-top: 32px; font-size: 12px; color: #74c69d; border-top: 1px solid #28382f; padding-top: 16px; text-align: center; }
      </style>
    </head>
    <body>
      <div class="card">
        <div class="brand">
          <div>
            <div class="brand-title">Arcadia</div>
            <div class="brand-sub">IFPA Campus Belém</div>
          </div>
        </div>
        <h1 class="title">Sua conta está pronta!</h1>
        <p class="desc">Olá, <strong>${userName}</strong>!</p>
        <p class="desc">Sua conta foi vinculada a <strong>${provider}</strong> com o e-mail <strong>${toEmail}</strong>.</p>
        <div class="badge">✓ Conta verificada com ${provider}</div>
        <p class="desc">Acesse os avisos, o calendário acadêmico e os recursos da comunidade do seu campus.</p>
        <div class="footer">
          Portal Arcadia · IFPA Campus Belém · Projeto acadêmico de Desenvolvimento de Sistemas
        </div>
      </div>
    </body>
    </html>
    `;

    if (!transporter) {
        console.log(`[Email Service Simulation] Welcome email simulated for ${toEmail}:`);
        console.log(`Subject: ${subject}`);
        console.log(`To configure real sending via Gmail: set SMTP_USER and SMTP_PASS in backend/.env`);
        return { success: true, simulated: true };
    }

    try {
        const info = await transporter.sendMail({
            from: `"Arcadia IFPA" <${process.env.SMTP_USER}>`,
            to: toEmail,
            subject: subject,
            html: htmlContent
        });
        console.log('[Email Service] Welcome email delivered:', info.messageId);
        return { success: true, messageId: info.messageId };
    } catch (err) {
        console.error('[Email Service] Error sending email:', err);
        throw err;
    }
}

module.exports = {
    sendWelcomeEmail
};
