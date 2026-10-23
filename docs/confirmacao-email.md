> SQLs incrementais citados neste documento foram preservados como histórico. Para instalação ou atualização atual, consulte `backend/db/README.md`; não reaplique arquivos antigos sem diagnóstico.

# Envio seguro e confirmação de e-mail

Esta implementação usa SMTP para enviar links do Arcádia. Não habilita “Entrar com Google” e não confere cargo, matrícula ou administração ao confirmar um endereço.

## Ativação em banco existente

### Situação local conferida em 17/10/2026

O código de confirmação, reenvio e troca de endereço está presente. Na consulta somente de esquema do MySQL local, nenhuma das quatro tabelas de segurança estava criada. SMTP_USER, SMTP_PASS e APP_URL não estavam configurados; o segredo das cotas não tinha o tamanho mínimo e a confirmação estava desligada. Nenhuma mensagem foi enviada. Esta verificação não consultou Aiven nem variáveis da Vercel.

Para colocar em funcionamento no computador:

1. No cliente MySQL, selecione o banco local usado pelo backend e aplique, nesta ordem, `backend/db/history/pre-1.1.25/add-security-rate-limits.sql` e `backend/db/history/pre-1.1.25/add-email-verification.sql`. Preserve um backup. Não importe o esquema completo sobre o banco existente.
2. Acrescente os campos de `backend/email.env.example` ao **backend/.env existente**, preservando banco e JWT_SECRET. Preencha SMTP_USER com a conta remetente e SMTP_PASS com a senha de aplicativo do Gmail, criada após habilitar a verificação em duas etapas. Digite a credencial somente no arquivo privado; não a envie por conversa nem a coloque no Git.
3. Gere um segredo separado de pelo menos 32 bytes para RATE_LIMIT_SECRET. Por exemplo, execute localmente `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` e copie o resultado para o arquivo privado. Não altere JWT_SECRET para resolver essa pendência.
4. Use APP_URL=http://localhost:3001 para abrir o portal servido pelo backend local. Se usar outro endereço de frontend, ajuste APP_URL para esse endereço confiável; o link precisa abrir a página de confirmação que acessa a mesma API. Produção exige HTTPS.
5. Execute `npm run email:check -- --schema-local`. O comando mostra somente presença/validade e nomes das tabelas; não imprime credenciais e não envia mensagens. Quando as configurações e tabelas estiverem prontas, altere EMAIL_VERIFICATION_ENABLED para true e reinicie o backend com `npm start`.
6. Com uma conta de teste sob seu controle, crie um cadastro, abra o link recebido e clique em Confirmar e-mail. Só então teste o login, o reenvio e a troca de endereço. O diagnóstico não comprova entrega Gmail; essa etapa precisa ser feita pelo responsável com a configuração real.

O calendário local também estava com o enum antigo, sem ferias/aniversario. Para gravar essas categorias, revise e aplique separadamente `backend/db/history/pre-1.1.25/add-calendar-categories.sql`; isso não é uma migração de e-mail.

1. Preserve um backup e confira o banco selecionado. Não execute `backend/schema.sql` em banco existente: ele é o esquema para uma instalação nova.
2. Revise e aplique `backend/db/history/pre-1.1.25/add-security-rate-limits.sql` e `backend/db/history/pre-1.1.25/add-email-verification.sql`. São migrações idempotentes; criam tabelas de infraestrutura e não marcam contas existentes como verificadas, não mudam papéis e não encerram sessões. DDL no MySQL faz commit implícito.
3. Configure as variáveis privadas do backend conforme `.env.example`: `APP_URL`, `SMTP_SERVICE`, `SMTP_USER`, `SMTP_PASS` e `RATE_LIMIT_SECRET`. Use pelo menos 32 bytes aleatórios no segredo das cotas. O código aceita o JWT_SECRET como alternativa somente se ele já tiver esse tamanho. Não troque uma chave JWT existente silenciosamente: isso encerra sessões e requer rotação planejada.
4. Em produção, `APP_URL` deve ser a URL HTTPS confiável do site. Não é construída a partir do Host da requisição. O endereço `http://localhost:3001` do exemplo é apenas de desenvolvimento. Configure TLS validado para banco remoto e as permissões necessárias às quatro tabelas novas.
5. Somente depois dessas etapas, habilite `EMAIL_VERIFICATION_ENABLED=true` no ambiente de destino. Sem ativação, o cadastro novo falha fechado, mas contas antigas continuam no modo legado. Com a opção habilitada, ausência da tabela de estado causa indisponibilidade da autenticação em vez de liberar contas novas não verificadas.
6. Faça o teste real de entrega apenas com autorização e uma conta controlada pelo responsável. Esta implementação foi testada com transporte simulado; nenhuma configuração na Aiven/Vercel ou entrega Gmail real foi realizada nesta etapa.

Para Gmail, use uma credencial de aplicativo no ambiente privado, quando disponível para a conta. O Google exige verificação em duas etapas para esse recurso e algumas contas institucionais não o oferecem. Não coloque a credencial em código, navegador, commit ou conversa. [Orientação oficial do Google](https://support.google.com/accounts/answer/185833?hl=pt-BR).

Antes da ativação, confira se já existem colisões históricas entre as duas tabelas. A consulta abaixo retorna apenas a quantidade de endereços duplicados; não foi executada nesta etapa:

```sql
SELECT COUNT(*) AS enderecos_com_colisao
FROM (
    SELECT email_normalizado
    FROM (
        SELECT LOWER(TRIM(email)) AS email_normalizado FROM usuarios
        UNION ALL
        SELECT LOWER(TRIM(email)) AS email_normalizado FROM publico_externo
    ) AS identidades
    GROUP BY email_normalizado
    HAVING COUNT(*) > 1
) AS colisoes;
```

Se houver colisões, revise as identidades antes da ativação, sem atribuir automaticamente um endereço a outra pessoa. A implementação impede novas colisões pelo aplicativo; não resolve conflitos antigos por suposição.

## Regras do fluxo

O formulário só encaminha à confirmação quando recebe status 201, identificador da conta e o estado explícito de confirmação. Erros de validação, curso, migração ou cota anterior à criação permanecem no cadastro, sem afirmar que uma conta foi criada. Após a criação, a navegação é imediata para verify-email.html, com o endereço preenchido por sessionStorage desta aba, sem dados na URL. Se o envio falhar depois do commit, a página de confirmação informa que a conta já existe, pendente, e permite solicitar outro link após corrigir o serviço de envio. “Reenviar” não cria cadastro nem exige confirmação prévia para criar uma conta.

- Cada cadastro novo cria a conta e seu estado não confirmado na mesma transação. Um erro nessa etapa faz rollback. O envio acontece após o commit; se falhar, a conta permanece pendente e pode receber outro link. `verificationSent` é somente um resultado de envio e nunca significa endereço confirmado.
- O token usa 32 bytes aleatórios, tem hash SHA-256 persistido, finalidade, identidade e endereço vinculados, validade de 30 minutos e consumo único transacional. Não aparece em respostas JSON ou logs. O prazo é calculado pelo banco.
- O link usa o fragmento de `verify-email.html`. A página remove o fragmento da URL e só faz POST após o clique em “Confirmar e-mail”. Abrir o GET ou um scanner acessar o endereço não consome o token.
- Reenviar substitui links anteriores; inválidos, expirados e já usados não confirmam a conta. A resposta pública de reenvio é genérica, inclusive para endereços sem conta ou já confirmados.
- As contas antigas continuam acessíveis, identificadas como **legado não verificado** até o titular confirmar um link. Nenhum endereço existente, incluindo administração, foi presumido verificado. Confirmar o endereço atual não revoga as sessões desse legado.
- A edição comum de perfil não troca mais o e-mail. “Alterar e-mail de acesso” exige senha atual, reserva o novo endereço e envia um link. O endereço de login/recuperação continua sendo o anterior até a confirmação. A confirmação do novo endereço invalida sessões e recuperações antigas, exigindo novo login.
- A reserva e a confirmação verificam unicidade entre `usuarios`, `publico_externo` e solicitações pendentes. Uma trava compartilhada serializa essas operações entre instâncias. Login, mudanças de credenciais e administração usam a mesma ordem de trava quando o fluxo está habilitado, evitando criar sessões com endereço, senha ou papel que mudaram durante a autenticação.
- Alterar ou recuperar a senha invalida links pendentes de e-mail; eles não sobrevivem a uma mudança de credenciais. A exclusão da conta limpa os registros de confirmação correspondentes.

## Limites compartilhados

Para diagnóstico local, `EMAIL_VERIFICATION_ADDRESS_LIMIT_BYPASS_UNTIL` pode conter uma data ISO futura: até esse instante, apenas a cota por endereço de cadastro/reenvio/troca deixa de ser aplicada. Exige banco e cliente em loopback, ambiente fora de produção e ausência de VERCEL. As cotas por IP, de entrega global, recuperação e consumo de tokens permanecem. Após carregar a configuração, a expiração ocorre automaticamente, sem apagar contadores. Remova a variável e reinicie para encerrar antes do prazo. Essa opção não corrige credenciais SMTP rejeitadas.

Os contadores ficam em MySQL, com transação e trava por chave. São identificados por HMAC; não guardam e-mails, IPs ou tokens em texto puro. Ausência da tabela, segredo insuficiente ou falha no armazenamento recusa o fluxo protegido. Não há contador em memória apresentado como proteção de todas as instâncias.

| Fluxo                                | Limites                                                                   |
| ------------------------------------ | ------------------------------------------------------------------------- |
| Solicitar recuperação                | 3 por endereço/hora e 10 por IP/15 minutos                                |
| Cadastro, reenvio ou troca de e-mail | 3 por endereço/hora e 10 por IP/15 minutos                                |
| Confirmar um link                    | 30 tentativas por IP/15 minutos                                           |
| Redefinir senha por token            | 5 por token/15 minutos, 20 por IP/15 minutos e 200 globais/15 minutos     |
| Entregas SMTP transacionais          | 50 por hora e 200 por dia, compartilhadas entre recuperação e confirmação |

As janelas são fixas; podem permitir o limite de cada janela perto de uma transição. O código usa `req.ip`, sem confiar diretamente em um X-Forwarded-For fornecido pelo cliente. É necessário validar a política de proxy da implantação: um proxy/NAT compartilhado pode tornar os limites mais restritos. Ajustes devem preservar o limite por endereço e o orçamento global.

A limpeza periódica pode remover linhas expiradas de `seguranca_limites` e tokens usados/expirados de `email_tokens`, em lotes. **Não apague ou trunque `email_estado` como manutenção:** ele distingue contas novas das contas legadas. Nenhuma tarefa agendada ou serviço pago foi criado.

## Superfície de envio

`POST /api/auth/send-welcome` retorna 410 e nunca abre transporte. O fallback EmailJS foi removido. O navegador não cria sessão Google fictícia nem dispara mensagem de “conta verificada”. Por enquanto não há mensagem de boas-vindas independente.

O serviço aceita um destinatário simples e único, rejeita objetos, listas, nomes MIME, HTML, controles e entradas excessivas. Os templates de confirmação e recuperação usam texto simples, provedor/remetente controlados pelo servidor e links com token hexadecimal; não interpolam HTML de cadastro. O transporte exige TLS validado, um destinatário e bloqueia acesso a arquivos e URLs para compor a mensagem. Erros SMTP não são publicados.

Nodemailer foi fixado em 10.1.2 nos dois manifests/locks, compatível com Node 24. As duas consultas npm audit após a atualização retornaram zero avisos de produção naquele momento. O teste de integração usa a composição real da biblioteca em memória, sem conexão SMTP. [Opções de segurança do Nodemailer](https://nodemailer.com/smtp).

## Limites desta entrega

As migrações estão preparadas, mas não aplicadas a bancos reais. Configurações SMTP, chave de cotas e ativação na Vercel dependem do ambiente privado do responsável. A validação concorrente foi feita com modelo transacional simulado, não com um ensaio de carga no MySQL real. Entrega SMTP e políticas reais do provedor precisam de um teste autorizado de implantação.

A conclusão geral da auditoria continua pendente: limites de login/PDF, exposição de projetos pendentes, cabeçalhos, configuração criptográfica de produção e demais políticas devem ser acompanhados no relatório. E-mail confirmado prova acesso à caixa de entrada; não valida vínculo institucional.

### Configuração do Preview

As variáveis de Production não são herdadas automaticamente pelo Preview. Defina `EMAIL_VERIFICATION_ENABLED=true`, SMTP, banco e segredo de cotas também no ambiente Preview. Use o endereço do Preview em `APP_URL` para manter os links no teste. Refaça o deploy após salvar as variáveis. O código não ativa a confirmação se a variável estiver ausente.

### Aviso de confirmação desabilitada na Vercel

O aviso é emitido quando `EMAIL_VERIFICATION_ENABLED` não resulta em `true` no servidor. `APP_URL` define o endereço dos links; não ativa o serviço. Em Settings → Environment Variables do projeto Vercel, configure `EMAIL_VERIFICATION_ENABLED=true` no ambiente correspondente: Production para o domínio oficial, Preview para a implantação da branch. Salve e gere um novo deploy; uma implantação já criada continua usando sua configuração anterior. Configuração do arquivo `.env` local não substitui a configuração da Vercel.

Antes de ativar, confira as migrações e demais variáveis descritas acima. Não publique credenciais ou links de confirmação em logs ou capturas. A ativação não prova entrega SMTP; essa etapa depende de teste autorizado no ambiente real.
