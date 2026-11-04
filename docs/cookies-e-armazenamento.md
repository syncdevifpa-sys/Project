# Cookies e armazenamento — inventário técnico

Revisão do código em 3 de novembro de 2026. Este inventário descreve o que a aplicação implementa; não declara uma auditoria completa dos fornecedores no navegador de produção.

| Recurso | Uso encontrado |
| --- | --- |
| Cookies HTTP próprios | Não foram encontradas gravações por `document.cookie`, `res.cookie` ou cabeçalhos `Set-Cookie` no código da aplicação. |
| `localStorage` | Token de acesso e dados da sessão; tema, acessibilidade, cores, modos de visualização e recolhimento do menu; confirmação do aviso de armazenamento. |
| `sessionStorage` | Etapas de cadastro e confirmação de e-mail, retorno dos documentos legais, estado da navegação da aba e marcação de entrada no login/painel. |
| `CacheStorage` | O service worker pode conservar arquivos estáticos em navegadores que já o instalaram. Não há registro automático no código atual. A API e a consulta de conexão ficam fora desse cache. |
| Google Identity Services | Integração de autenticação. O Google documenta cookies técnicos como `g_state`, usado para lembrar a saída e evitar entrada automática indesejada. Sua presença depende do navegador e da configuração. |
| Vercel Preview | Pode incluir a barra de ferramentas e a autenticação próprias da hospedagem. Elas não são implementadas pelos botões do aviso do Arcádia. |

Não foram encontrados instrumentos de publicidade ou análise de audiência no código da aplicação. Os antigos botões de aceitar/rejeitar opcionais apenas guardavam a preferência; nenhum rastreador era ativado por eles. O aviso agora explica o uso e oferece **Usar somente o necessário**, além dos links para os detalhes. Isso não altera o acesso à conta nem ativa novos recursos.

Sessão e preferências continuam nas tecnologias que já utilizavam. Não foram adicionados cookies HTTP desnecessários nem houve mudança do formato de autenticação. As tabelas e os dados do banco não foram alterados.

Referência do provedor: [entrada e saída automáticas do Google Identity Services](https://developers.google.com/identity/gsi/web/guides/automatic-sign-in-sign-out).
