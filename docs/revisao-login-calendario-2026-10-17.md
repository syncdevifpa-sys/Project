# Revisão de login, confirmação e calendário — 17/10/2026

## Falhas reproduzidas e corrigidas

- Requisições públicas de login consultavam localStorage antes de acessar a API. O bloqueio do armazenamento gerava erro local apresentado como falha de conexão. Agora requisições públicas não consultam o token; leitura bloqueada é tratada.
- Uma resposta 401 de requisição antiga apagava o token de um login posterior. Agora o encerramento exige que o token atual seja o mesmo usado pela requisição.
- Falha ao salvar o token depois dos dados do usuário deixava sessão parcial. Agora há limpeza e mensagem específica sobre armazenamento, sem redirecionar como se o login estivesse concluído.

Os dois primeiros casos falharam nos testes antes da correção. Os testes exercitam os arquivos reais do cliente em ambiente simulado, sem conta ou e-mail real.

## Confirmação na Vercel

A mensagem de serviço desabilitado provém da leitura de EMAIL_VERIFICATION_ENABLED no servidor. APP_URL apenas compõe links. A alteração dessa configuração depende do painel privado e de nova implantação no ambiente correspondente. O código continua exigindo ativação explícita. SMTP e banco reais não foram modificados ou usados para cadastrar, confirmar ou enviar mensagens nesta revisão.

## PDF

Foi usado o arquivo original Resoluo_n_1591.2025_-_Calendrio_2026_campus_Belm.pdf. A inspeção visual das páginas 3 e 4 confirma a continuação de outubro e dezembro nas mesmas colunas, com novembro na página anterior. O leitor atual já preserva esse contexto; não foi identificado novo defeito de datas com esse arquivo nesta revisão. Foram reforçadas as verificações dos dez eventos de novembro, incluindo períodos de 3–6, 3–19 e 9–14.

O teste HTTP usa o PDF original e percorre upload, prévia, confirmação, gravação simulada e deduplicação; preserva títulos e datas, inclusive Réveillon em 31/12. Isso não comprova execução ou esquema do banco na Vercel. Também foi feita extração local do arquivo Calendário Acadêmico Superior 2026.pdf: 94 candidatos; sua identificação automática não reconhece campus/referência, exigindo conferência da fonte. Não foi usado como substituto do PDF IFPA Belém.

## Validação e limites

A suíte completa passou com 214 testes, sem falhas ou testes ignorados, usando os PDFs de 2025 e 2026. O build estático passou. Após reforçar os casos de novembro, os testes específicos passaram novamente. A primeira execução restrita falhou por bloqueio de conexões locais; a execução com conexões de teste liberadas passou.

Não houve validação com credenciais reais, envio SMTP, migração remota ou promoção para produção. A revisão cobre os caminhos citados; não conclui a auditoria de segurança geral do portal. A entrega deve permanecer na branch codex/fix-auth-calendar e no Preview.
