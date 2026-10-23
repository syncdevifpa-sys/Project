# Execução assistida no Workbench

Estes arquivos alteram o banco ou registram versões. Consultas exclusivamente de diagnóstico ficam em `../checks/`.

| Caminho | Finalidade |
| --- | --- |
| `1.1.25/adopt.sql` | Confere uma base já atualizada e registra 1.1.25 somente se compatível |
| `1.1.26/01-structure.sql` | Evolui a estrutura de lembretes, sem criar gatilhos ou registrar a versão |
| `1.1.26/02-triggers.sql` | Cria os quatro gatilhos com sintaxe simples, somente se estiverem ausentes |
| `1.1.26/03-finalize.sql` | Confere a estrutura e os gatilhos e registra 1.1.26 |

O usuário confirmou a conclusão da 1.1.26 no `defaultdb` nesta sessão. **Não reaplique os passos nesse banco.** Esse relato não comprova SMTP, cron ou funcionamento do código publicado.

Para outro banco, confira backup, versão, estrutura e registros antes de escolher uma migração. Os passos assistidos foram preparados para `defaultdb`/MySQL 8.4; não apontam automaticamente para uma conexão. Trabalhe sem escritas/envios concorrentes e pare no primeiro erro. DDL faz commit implícito.

Regere com `npm run db:workbench:build`. Não edite os arquivos gerados isoladamente. O manifesto/checksum das versões não mudou com a reorganização.
