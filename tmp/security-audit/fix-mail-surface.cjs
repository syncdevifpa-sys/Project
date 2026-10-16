const fs=require('fs');const edit=(p,fn)=>fs.writeFileSync(p,fn(fs.readFileSync(p,'utf8')).replace(/\r\n/g,'\n'));
edit('backend/src/routes/auth.routes.js',s=>s.replace("const { sendWelcomeEmail } = require('../services/email.service');\n",'').replace(/\/\/ POST \/api\/auth\/send-welcome[\s\S]*?\/\/ POST \/api\/auth\/login/,`// Compatibilidade explícita: este endereço nunca mais dispara mensagens.
router.post('/send-welcome', (_req, res) => {
    res.status(410).json({ error: 'O envio público de boas-vindas foi desativado.' });
});

// POST /api/auth/login`));
edit('front/js/auth.js',s=>s.replace(/    \/\/ ------------------------- Envio de E-mail de Boas-vindas[\s\S]*?    \/\/ Google Identity Services/,`    // O navegador não envia e-mails nem simula autenticação de um provedor.
    async function sendWelcomeEmail() {
        return { success: false, reason: 'disabled' };
    }
    async function completeGoogleAuth() {
        alert('O acesso com o Google ainda não está disponível. Use e-mail e senha.');
    }

    // Google Identity Services`));
edit('front/auth-config.js',s=>s.replace(' * Os campos EmailJS opcionais atendem apenas às mensagens de boas-vindas.\n','').replace(/    \/\/ Configuração pública opcional do EmailJS[\s\S]*?    \/\/ Endereço público/, '    // Endereço público'));
for(const f of ['front/login.html','front/signup.html']) edit(f,s=>s.replace(/^.*<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@emailjs\/browser@4\/dist\/email\.min\.js"><\/script>.*\n/gm,'').replace(/^.*<script src="https:\/\/accounts\.google\.com\/gsi\/client" async defer><\/script>.*\n/gm,''));
// Inclui a tabela compartilhada também nas instalações novas; a migração incremental é separada.
edit('backend/schema.sql',s=>s.replace('-- 4. AVISOS (mural)',`-- Limites distribuídos: não contém e-mails, IPs ou tokens em texto puro.
CREATE TABLE seguranca_limites (
    chave CHAR(64) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
    janela BIGINT UNSIGNED NOT NULL,
    tentativas INT UNSIGNED NOT NULL DEFAULT 0,
    expira_em DATETIME NOT NULL,
    INDEX idx_limites_expiracao (expira_em)
) ENGINE=InnoDB;

-- 4. AVISOS (mural)`));
