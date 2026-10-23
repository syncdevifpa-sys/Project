# Auditoria de segurança — Arcádia

**Data:** 16/10/2026, America/Fortaleza.  
**Conclusão:** **não considero o estado atual pronto para produção com dados reais.** Há controles importantes implementados, mas permanecem quatro achados de prioridade alta, uma exposição de conteúdo não aprovado e lacunas no ciclo de credenciais. Não foi encontrada evidência suficiente para declarar uma falha crítica de execução remota ou de acesso administrativo sem autenticação. Isso não constitui certificação de ausência dessas falhas.

## Atualização de remediação — envio e confirmação de e-mail

Esta seção atualiza o estado; os achados abaixo preservam a evidência da auditoria original.

- **A01 corrigido no código:** rota pública retorna 410 sem transporte; fallback EmailJS e autenticação Google fictícia removidos. Somente links transacionais de finalidade controlada são enviados, a um endereço simples validado, em texto puro. Não há HTML de cadastro interpolado nem alegação de conta verificada por um provedor.
- **A02 corrigido no código:** Nodemailer 10.1.2 fixado nos dois manifests/locks; auditorias npm posteriores retornaram zero avisos de produção nas duas árvores. A composição real da biblioteca foi exercitada em memória, sem SMTP.
- **A03 parcialmente corrigido:** cotas distribuídas por endereço/IP, token e orçamento global protegem cadastro, reenvio, troca de e-mail, recuperação e reset. Não há fallback liberador quando o banco/segredo falta. Login e PDF ainda precisam de seus próprios limites; não considerar A03 encerrado.
- **A04 corrigido no fluxo implementado:** perfil e administração não substituem o e-mail diretamente; o titular informa a senha atual e confirma o novo endereço. Transações reservam e verificam unicidade entre os dois tipos de conta. A confirmação revoga sessões e recuperações antigas. Novos cadastros ficam pendentes; contas antigas continuam legadas, sem confirmação presumida.
- **M02 corrigido no código:** troca de senha usa transação, checa novamente o hash atual, limita a 72 bytes e invalida links de recuperação e confirmação. O reset também invalida links de e-mail. A criação de sessão revalida endereço, hash e papel depois de obter a trava compartilhada, quando o fluxo está ativado.
- **Ativação pendente:** executar duas migrações revisadas, configurar SMTP/URL HTTPS/segredo das cotas e habilitar EMAIL_VERIFICATION_ENABLED no ambiente de destino. Nada foi executado na Aiven/Vercel, nenhuma mensagem real foi enviada e não houve push/deploy. A tabela de estado não pode ser apagada como manutenção.
- **Permanecem pendentes:** M01 (projetos não aprovados), restante de A03, M03/M04, mensagens de enumeração, política dos inscritos, comprovação de vínculo e validação do ambiente real. A conclusão geral de segurança continua sem aprovação para produção até essas verificações.

Veja [o guia de configuração e migração](../confirmacao-email.md) e as evidências de testes em tmp/security-audit. O relatório original não representa um ensaio do ambiente publicado.

## Escopo e método

Auditoria do checkout local, incluindo alterações ainda não commitadas sobre `f23013c`. Foram inspecionadas as 18 famílias de rotas, seus controles de acesso, serviços e modelos associados, frontend, configuração Express/Vercel, esquema SQL, upload de imagens/PDF, dependências da raiz e do backend, arquivos de exclusão e indicadores de segredos no Git. As referências utilizadas foram [OWASP ASVS 5.0.0](https://github.com/OWASP/ASVS/tree/v5.0.0/5.0) e [OWASP Top 10:2025](https://top10.owasp.org/2025/0x00_2025-Introduction/). O Top 10 é uma classificação de riscos; não substitui uma verificação completa de todos os requisitos ASVS.

As reproduções usam apenas dados fictícios e servidor em `127.0.0.1`, com banco e transporte de e-mail substituídos por mocks. Não houve teste ofensivo no site publicado, conexão com Aiven, envio por Gmail/SMTP, alteração de aplicação, correção automática de pacotes, migração, push ou deploy. Os únicos arquivos criados nesta auditoria são este relatório e evidências em `tmp/security-audit/`.

Os **170 testes existentes passaram, sem falhas ou testes ignorados**, com os dois PDFs de referência disponíveis. Os testes adicionais da auditoria confirmaram comportamentos inseguros que a suíte atual não rejeita. Aprovação da suíte não significa conformidade de segurança.

## Resumo de prioridades

| ID  | Gravidade                       | Achado                                                                      | Evidência                                                                                   |
| --- | ------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| A01 | Alta                            | Envio de boas-vindas aberto a qualquer solicitante e destinatário           | HTTP local sem login aceitou dois destinatários arbitrários; envio real bloqueado pelo mock |
| A02 | Alta                            | Nodemailer vulnerável nas duas árvores de dependências                      | `npm audit` oficial: um pacote de gravidade alta em cada árvore, mesma dependência          |
| A03 | Alta                            | Ausência de limitação de tentativas e de consumo por conta/IP               | Inspeção de rotas e configuração; não foi executado ataque de carga                         |
| A04 | Alta                            | Mudança do e-mail de acesso/recuperação sem autenticação recente            | HTTP local aceitou alteração com apenas a sessão existente                                  |
| M01 | Média                           | Detalhe público revela projetos pendentes/recusados                         | GET anônimo retornou projeto fictício pendente                                              |
| M02 | Média                           | Troca de senha não invalida links anteriores de recuperação e não é atômica | Fluxo do controller comparado ao consumo transacional da recuperação                        |
| M03 | Média                           | Defesa do navegador não está configurada no código de deploy                | Cabeçalhos ausentes na resposta local; configuração real da borda não verificada            |
| M04 | Média, condicionada ao ambiente | Chave JWT e TLS do banco não têm configuração segura obrigatória            | Configuração local insuficiente; valores de produção desconhecidos                          |
| B01 | Baixa                           | Login permite distinguir contas existentes                                  | Dois HTTP 401 com mensagens diferentes                                                      |
| B02 | Baixa, endurecimento preventivo | Rotas legadas e auxiliares têm validação e observabilidade incompletas      | Inspeção; não equivale a uma injeção SQL/XSS remota comprovada                              |

As gravidades são prioridades qualitativas para este projeto, não pontuações CVSS calculadas. A01/A02 dependem da ativação de SMTP para os caminhos de envio; a configuração SMTP local examinada está indisponível. A04 pressupõe uma sessão comprometida ou deixada acessível: não permite alterar a conta sem qualquer autenticação.

## Achados de prioridade alta

### A01 — Rota pública pode ser usada para abuso do remetente e do conteúdo de e-mail

**Local:** [auth.routes.js:38](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/auth.routes.js:38>), [email.service.js:34](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/email.service.js:34>), [email.service.js:65](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/email.service.js:65>) e [email.service.js:89](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/email.service.js:89>).

`POST /api/auth/send-welcome` não exige sessão, cadastro recém-concluído, prova de posse do endereço, destinatário único ou limite de frequência. O teste passou um array de dois endereços fictícios e recebeu HTTP 200; a função de envio recebeu o array. A rota verifica apenas se `email` é verdadeiro.

O serviço também insere `nome`, `provider` e destinatário diretamente no HTML. Com SMTP habilitado, terceiros podem disparar mensagens do remetente do projeto e incluir conteúdo HTML arbitrário no corpo. O texto afirma que a conta foi verificada pelo provedor, embora essa rota não faça essa verificação. Há risco de spam, phishing, consumo da cota e bloqueio do remetente. A resposta de erro ainda devolve `err.message` em `details`, potencialmente expondo detalhes do SMTP.

**Correção recomendada:** disparar boas-vindas internamente após um cadastro/verificação válido; não aceitar destinatário/provedor arbitrários do navegador; validar um endereço único, limitar frequência e volume, escapar campos de texto, remover a afirmação de verificação sem comprovação e retornar erros genéricos. Não foi enviado e-mail real para demonstrar o problema.

### A02 — Dependência de e-mail com vulnerabilidades conhecidas

**Local:** [package.json](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/package.json>), [package-lock.json](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/package-lock.json>), [backend/package.json](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/package.json>) e [backend/package-lock.json](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/package-lock.json>).

Os dois locks fixam **Nodemailer 6.10.1**. A consulta online ao registro oficial com `npm audit --omit=dev --ignore-scripts --json` retornou **um pacote vulnerável de gravidade alta em cada árvore**, com 15 avisos associados à mesma dependência. Isso não significa 30 vulnerabilidades independentes.

Entre os avisos dos mantenedores estão [exaustão por recursão no analisador de endereços](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-rcmh-qjqh-p98v) e [complexidade quadrática no analisador](https://github.com/nodemailer/nodemailer/security/advisories/GHSA-2x7j-588g-ccc2). A01 expõe entrada de destinatário diretamente a esse componente quando SMTP está disponível, tornando os avisos de processamento de endereços particularmente relevantes. Não foram executados payloads de exaustão.

Outros avisos exigem opções como `raw`, `jsonTransport`, OAuth2 ou parâmetros de transporte que não são fornecidos pelo usuário nos fluxos examinados; não se afirma que todos são exploráveis nesta aplicação. O comando de auditoria sugere uma atualização principal: atualizar exige revisar compatibilidade, os dois manifests/locks e repetir os testes, não apenas executar correção forçada.

**Correção recomendada:** migrar para versão sem os avisos aplicáveis, validar compatibilidade SMTP e repetir a auditoria dos dois locks em CI. Nenhum pacote foi atualizado nesta tarefa.

### A03 — Falta controle de tentativas, frequência e concorrência

**Local:** [backend/server.js:38](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/server.js:38>), [auth.routes.js:58](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/auth.routes.js:58>), [externalUsers.routes.js](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/externalUsers.routes.js>), [passwordRecovery.routes.js](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/passwordRecovery.routes.js>) e [calendarImport.routes.js:6](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/calendarImport.routes.js:6>).

Não há middleware/armazenamento de rate limiting, atraso progressivo ou limite por conta/IP nos logins, cadastros, recuperação, redefinição e boas-vindas. A recuperação é pública e a redefinição calcula bcrypt antes de descobrir que um token de formato válido não existe. Importações têm limites por arquivo, mas não uma cota de solicitações simultâneas por usuário.

Os cenários são tentativa de senhas conhecidas/vazadas, criação automatizada de contas, bombardeio de e-mails e esgotamento de CPU/conexões. O limite JSON de 2 MB não resolve frequência. Uma proteção configurada exclusivamente no WAF da Vercel pode reduzir o risco, mas não foi demonstrada e não consta do projeto.

**Correção recomendada:** controles distribuídos por conta e IP, atraso progressivo, limites de recuperação/SMTP e concorrência do PDF, respostas de excesso e monitoramento. Em funções serverless, um contador apenas em memória não limita todas as instâncias. Avaliar MFA para administração. Referência: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).

### A04 — E-mail de autenticação pode ser alterado sem confirmar a identidade novamente

**Local:** [profile.controller.js:17](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/profile.controller.js:17>), [users.controller.js:107](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/users.controller.js:107>) e [users.model.js:177](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/users.model.js:177>).

Uma sessão válida consegue alterar o e-mail usado no login e na recuperação, sem senha atual, desafio recente ou comprovação do novo endereço. O teste local recebeu HTTP 200 e observou a alteração no mock. Uma sessão roubada ou deixada aberta pode ser convertida em controle duradouro usando recuperação no endereço do atacante, se o serviço de recuperação estiver habilitado.

A validação de unicidade entre `usuarios` e `publico_externo` acontece no cadastro, mas não na edição pessoal. Como as restrições UNIQUE são separadas por tabela, a edição pode criar colisões entre identidades; o login e a recuperação procuram a conta institucional primeiro. A rota legada também não aplica a mesma validação de formato da rota de perfil.

**Correção recomendada:** autenticação recente para mudar e-mail, confirmação do novo endereço, aviso ao anterior, unicidade global entre tipos de conta, invalidação de recuperações anteriores e revogação/rotação de sessões conforme política. A mudança deve ser transacional. Referência: [processo de mudança do endereço registrado na OWASP](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html#changing-a-users-registered-email-address).

## Achados de prioridade média

### M01 — Projeto não aprovado pode ser lido pelo identificador público

**Local:** [projects.routes.js:38](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/projects.routes.js:38>), [projects.controller.js:19](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/projects.controller.js:19>) e [projects.model.js:31](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/projects.model.js:31>).

A listagem pública filtra `aprovacao = 'aprovado'`, mas o detalhe público procura apenas `id_projeto`. Um GET anônimo retornou um registro fictício pendente. A mesma consulta não exclui recusados. IDs previsíveis permitem procurar descrições e outros campos que ainda não foram liberados na listagem.

**Correção recomendada:** permitir publicamente apenas aprovados; disponibilizar os demais somente para autor/admin ou papel expressamente autorizado, aplicando a política no backend também no detalhe. Retornar 404 quando não for possível revelar a existência do registro. Referência: [OWASP Broken Access Control](https://top10.owasp.org/2025/A01_2025-Broken_Access_Control/).

### M02 — Ciclo de troca de senha incompleto

**Local:** [profile.controller.js:66](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/profile.controller.js:66>) e [passwordRecovery.model.js:108](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/passwordRecovery.model.js:108>).

O reset por link usa transação, trava e invalida outros links e sessões. A troca pela senha atual faz duas operações independentes: altera o hash e depois remove outras sessões. Uma falha entre elas pode deixar senha alterada e sessões antigas ativas, mesmo retornando erro. O fluxo também não inutiliza links de recuperação emitidos antes da troca; um link capturado continua válido até expirar e pode redefinir a senha novamente.

Além disso, cadastro e recuperação limitam a senha a 72 bytes, mas a troca só verifica oito caracteres mínimos. O teste local confirmou que bcrypt considera iguais senhas longas com os mesmos 72 bytes iniciais. Isso não quebra bcrypt; indica que a aplicação aceita um segredo cujo sufixo não é utilizado.

**Correção recomendada:** transação única para hash, invalidação de recuperações e revogação; aplicar os mesmos limites por bytes em todos os fluxos; definir rotação da sessão atual e políticas de senhas comprometidas. Referência: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).

### M03 — Cabeçalhos de defesa e proteção explícita do cache não estão definidos

**Local:** [backend/server.js:38](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/server.js:38>), [backend/server.js:99](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/server.js:99>) e [vercel.json](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/vercel.json>).

Na resposta local não há CSP, proteção de enquadramento (`frame-ancestors`/X-Frame-Options), `X-Content-Type-Options`, política explícita de Referer, HSTS ou `Cache-Control`. Express se identifica por `X-Powered-By`. O projeto não configura esses cabeçalhos na Vercel. Não se conclui que todos estejam ausentes no endereço publicado: o provedor pode acrescentar HSTS/HTTPS ou outras políticas.

Faltam defesa adicional contra execução de scripts indevidos, clickjacking e armazenamento de respostas sensíveis. Não foi demonstrado vazamento por cache compartilhado; autenticação Bearer e comportamento da borda precisam ser considerados antes dessa afirmação.

**Correção recomendada:** verificar cabeçalhos reais e redirecionamento HTTPS no domínio de produção; implementar CSP compatível com os scripts embutidos, `frame-ancestors`, `nosniff`, Referrer-Policy e `no-store` nas respostas de login/perfil/sessões/recuperação. Definir HSTS na terminação HTTPS e remover identificação desnecessária. Referência: [segurança em produção do Express](https://expressjs.com/en/advanced/best-practice-security/).

### M04 — Configuração criptográfica/transporte não é obrigatoriamente segura

**Local:** [database.js:10](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/config/database.js:10>), [database.js:20](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/config/database.js:20>), [auth.middleware.js:25](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/middlewares/auth.middleware.js:25>) e `backend/.env` local, ignorado pelo Git.

Sem `DB_SSL=true`, o pool não solicita TLS. Quando TLS é habilitado, a configuração corretamente usa `rejectUnauthorized: true`, com CA opcional. O arquivo local examinado não habilita TLS e a chave JWT configurada tem menos de 32 bytes. Nenhum valor de credencial é reproduzido aqui. Não foi estabelecida conexão para verificar transporte ou permissões efetivos, e esses dados locais não provam a configuração da Vercel/Aiven.

Não existe validação de inicialização que exija segredo JWT forte ou TLS em produção. O pool tem limite de dez conexões por instância, porém fila ilimitada (`queueLimit: 0`), sem orçamento global de conexões entre instâncias demonstrado.

**Correção recomendada:** exigir chave aleatória forte de pelo menos 32 bytes para HS256 e rotação planejada; falhar na inicialização se faltar configuração obrigatória; exigir TLS validado para banco remoto em produção; definir fila e limites de espera/concorrência. Validar privilégios mínimos MySQL, rede, backups e restauração no ambiente real. **Este é um risco de configuração local/condicional, não uma comprovação de tráfego de produção sem TLS.**

## Achados de prioridade baixa e endurecimento

### B01 — Enumeração por mensagens de login

**Local:** [auth.controller.js:19](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/auth.controller.js:19>), [auth.controller.js:34](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/auth.controller.js:34>) e [externalUsers.controller.js:82](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/externalUsers.controller.js:82>).

Uma conta institucional existente com senha errada recebe “Senha incorreta”; um endereço não cadastrado passa pelo login externo e recebe outra mensagem. Contas bloqueadas também têm status/mensagem próprios antes de verificar senha. O teste confirmou dois 401 distinguíveis. Isso ajuda a montar listas de contas para ataques de senha, agravados por A03.

**Recomendação:** respostas genéricas equivalentes e processamento/timing coerente, mantendo o motivo detalhado apenas em registros protegidos. A recuperação já possui resposta genérica, embora a espera por SMTP para contas existentes possa permitir diferenças de tempo; não foi feita medição estatística de enumeração por tempo.

### B02 — Validadores, saídas HTML e trilha de auditoria precisam de uniformização

**Locais e limites observados:**

- [portal.js:197](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/front/js/portal.js:197>) interpola mensagens em `innerHTML`. Um teste com marcação HTML inofensiva confirmou que ela é inserida sem escape. As mensagens dinâmicas examinadas não estabeleceram uma cadeia remota de XSS; não se afirma que exista XSS remoto reproduzido. Usar `textContent` para texto evita que um futuro erro refletido se torne execução de script. Há ainda interpolação do cache local de conta Google em [auth.js:444](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/front/js/auth.js:444>); o botão Google está desabilitado e não há autenticação Google válida no backend.
- O JWT fica em [api.js:15](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/front/js/api.js:15>) no `localStorage`, acessível a JavaScript. Isso amplia o impacto de um XSS, mas não cria sozinho um bypass de autenticação. Avaliar sessão em cookie `HttpOnly; Secure; SameSite`/BFF ou token em memória. Uma migração para cookie precisa acrescentar proteção CSRF adequada; simplesmente trocar o armazenamento não resolve todos os riscos. Referência: [OWASP HTML5 Security](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html).
- O processamento legado de documentos, em [documents.controller.js:119](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/controllers/documents.controller.js:119>) e [documents.model.js:120](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/documents.model.js:120>), não aplica o mesmo contrato de validação dos formulários compartilhados. `arquivo` e campos de processamento devem ter validação de URL/datas/tipo no servidor. O renderer principal verifica HTTP/HTTPS antes de criar o link, portanto não foi demonstrada execução de `javascript:` por esse caminho.
- A administração não possui trilha estruturada de quem alterou papéis, dados, exclusões e aprovações. Há logs de console e erros brutos em controllers; mensagens SQL/SMTP podem conter dados pessoais ou detalhes internos. Recomenda-se redigir/sanitizar logs, limitar acesso/retenção e registrar eventos de segurança com responsável e resultado, sem senhas/tokens.

## Políticas e controles que ainda precisam de decisão ou validação

1. **Inscrições em projetos:** [projects.routes.js:46](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/projects.routes.js:46>) permite que qualquer docente/servidor consulte inscritos de qualquer projeto; [projects.model.js:241](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/projects.model.js:241>) devolve nomes e e-mails. O teste confirmou esse acesso de um docente não proprietário. Se o acesso global for intencional, documentar e justificar a finalidade; se somente coordenador/admin pode ver esses dados, falta checagem de propriedade e minimização dos contatos. Não classifiquei como IDOR comprovado sem essa definição de negócio.
2. **Posse de e-mail e vínculo de aluno:** cadastro público de professor/servidor é corretamente negado, mesmo com domínio institucional. Entretanto, aluno e externo podem cadastrar endereços sem confirmação de posse; contas nascem ativas no esquema. Há acesso ao público `discente` sem prova de vínculo. Se avisos desse público forem reservados a alunos reais, exigir verificação administrativa/SSO além da confirmação de endereço. Verificar e-mail não comprova cargo ou matrícula.
3. **CORS/CSRF:** `Access-Control-Allow-Origin: *` é amplo e pode ser limitado às origens necessárias. Não há autenticação automática por cookie: o navegador envia Bearer explicitamente. Por isso, ausência de token CSRF e CORS amplo não são prova de CSRF autenticado neste desenho. A01 continua abusável independentemente de cookies.
4. **Arquivos:** o servidor confere prefixo e tamanho de imagens, mas não decodifica integralmente nem limita dimensões/descompressão no backend. O limite de 25 megapixels do editor é apenas cliente e pode ser contornado. PDF tem limites reais importantes, porém falta cota de concorrência e isolamento/orçamento rígido de memória demonstrados. Não foram executados arquivos-bomba. Adotar decodificação/regravação segura de imagens e isolamento do processamento conforme risco. Referência: [OWASP File Upload](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html).
5. **Produção:** não foram verificados WAF, domínio/certificados, variáveis Vercel, tamanho/rotação real do JWT, HTTPS/HSTS efetivos, grants MySQL, restrições de rede Aiven, backups, restauração, retenção e alertas, entrega Gmail, configuração de consentimento ou políticas organizacionais. Não foi realizada avaliação de conformidade legal.

## Controles já comprovados no código/testes

| Área                       | Evidência e avaliação                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Senhas                     | Cadastro usa bcrypt com custo 10; reset limita 72 bytes. Não há armazenamento de senha em texto puro no fluxo de contas. Permanecem M02 e ausência de bloqueio de senhas comprometidas/MFA administrativo.                                                                                                                                                                                                                                                                                                                                              |
| Sessões JWT                | Assinatura e expiração verificadas, hash SHA-256 do token no banco, vínculo à identidade e sessão ativa; contas bloqueadas falham. `is_admin` é recarregado do banco. [auth.middleware.js:25](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/middlewares/auth.middleware.js:25>) e [externalAuth.middleware.js:25](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/middlewares/externalAuth.middleware.js:25>).                                                                                |
| Separação de identidades   | Externo não é aceito como institucional, mesmo com claims de admin. Manipular o estado da interface não cria uma sessão válida no servidor. Tokens de prévia do PDF têm finalidade/audience e autor verificados.                                                                                                                                                                                                                                                                                                                                        |
| Revogação                  | Logout e exclusão de sessões usam identidade autenticada; mudanças administrativas de papel/situação apagam sessões. As consultas exigem conta ativa. [sessions.model.js:73](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/models/sessions.model.js:73>) e [admin.service.js:401](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/admin.service.js:401>).                                                                                                                            |
| Autor/admin                | Avisos têm leitura por público e edição/exclusão transacional por autor/admin; o serviço compartilhado verifica autor/admin e impede aluno de aprovar projeto. Tarefas/lembretes/sessões têm predicado do usuário nas consultas. Documentos restringem leitura por dono/staff/admin e cancelamento ao dono no estado inicial. Há a exceção M01 e a política de inscritos a esclarecer.                                                                                                                                                                  |
| Administração/autoexclusão | Rotas admin exigem autenticação e privilégio atual. Último administrador protegido com trava; autoexclusão exige senha e EXCLUIR, verifica ligações e usa a própria identidade. [admin.routes.js:4](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/admin.routes.js:4>) e [admin.service.js:257](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/admin.service.js:257>).                                                                                                        |
| SQL                        | Parâmetros de dados usam placeholders; nomes dinâmicos de tabelas/campos vêm de catálogos/allowlists controlados. Não foi identificada concatenação direta de valor de requisição em SQL executado nos caminhos revisados. Isso não é prova matemática de ausência de injeção.                                                                                                                                                                                                                                                                          |
| Recuperação                | Token aleatório de 32 bytes, só hash persistido, expiração de 30 minutos, resposta genérica, consumo atômico de uso único e revogação. Link enviado só por e-mail, em fragmento; URL da aplicação precisa de HTTPS fora de desenvolvimento. M02 cobre o fluxo diferente de troca pela senha atual.                                                                                                                                                                                                                                                      |
| Perfil e privacidade       | Projeção pública exclui login/telefone/foto por padrão e respeita opt-in por campo. Legado sem tabela permanece privado; IDs de outro usuário não são aceitos no endpoint de compartilhamento. Nome/apresentação continuam públicos por desenho. [profile-sharing.service.js:101](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/profile-sharing.service.js:101>).                                                                                                                                                |
| DOM e links                | Cards de pessoas, corpo de avisos e links de conteúdo usam texto/escape e HTTP/HTTPS; capas aceitam data URL raster restrita e backend valida prefixos. Não foi encontrada XSS remota confirmada; B02 identifica um sink inseguro que deve ser eliminado.                                                                                                                                                                                                                                                                                               |
| PDF                        | Autorização antes da leitura bruta; até 4 MB, 30 páginas, 500 mil caracteres, 200 mil operações por página; avaliação de código desabilitada, prazo de processamento/limpeza; revisão e confirmação pública antes do commit, transação e deduplicação. [calendarImport.routes.js:6](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/routes/calendarImport.routes.js:6>) e [calendar-pdf.service.js:359](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/backend/src/services/calendar-pdf.service.js:359>). |
| Segredos e distribuição    | Arquivos `.env` são ignorados; não foram encontrados arquivos `.env`/chaves privadas rastreados atualmente nem esses nomes no histórico local disponível. A varredura por padrões identificou apenas segredos fictícios de testes/prévia. O build copia só `front/` para distribuição. Não foi feita análise exaustiva de todos os blobs históricos, caches externos, logs remotos ou credenciais no provedor.                                                                                                                                          |
| Dependências               | Locks e `npm ci` existem; audit atual não reportou outros pacotes vulneráveis de produção nas árvores examinadas. Isso não garante ausência de falhas não catalogadas ou de dependências opcionais no ambiente publicado.                                                                                                                                                                                                                                                                                                                               |

## Evidências e preservação

- [Reproduções HTTP locais](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/local-probes.json>).
- [Verificações de HTML auxiliar e limite do bcrypt](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/unit-probes.json>).
- [Auditoria npm da raiz](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/root-npm-audit.json>) e [do backend](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/backend-npm-audit.json>).
- [Resultado completo dos 170 testes](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/tests.txt>).
- [Resumo de varredura sem valores de segredos](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/secrets-summary.json>).
- [Comparação de integridade](<C:/Users/lucia/Documents/DevPrograms/Projeto Academico/Project/tmp/security-audit/source-integrity.json>): 238 arquivos comparados, nenhum alterado pela auditoria até a verificação. Scripts de reprodução estão na mesma pasta temporária e bloqueiam consultas reais/envio SMTP; não são código da aplicação.

## Condição para liberar produção

Resolver A01–A04 e M01–M02; validar as políticas de inscritos e de vínculo de aluno; demonstrar configurações seguras de produção, cabeçalhos, rate limiting e TLS; acrescentar testes negativos dos cenários reproduzidos e repetir a auditoria de dependências. Os controles existentes são uma base útil, mas **os resultados atuais não sustentam aprovação de segurança para produção nem afirmação de que todos os requisitos estão atendidos**.
