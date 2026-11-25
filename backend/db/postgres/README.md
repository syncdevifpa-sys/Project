# Banco PostgreSQL novo — instalação consolidada

Arquivo para executar: **instalacao-completa.sql**. Os demais SQLs desta pasta são componentes de referência; não precisam ser executados depois dele.

## Como usar

1. Crie um banco PostgreSQL separado e vazio. Não escolha o banco MySQL atual nem uma base com dados.
2. Conecte-se usando o editor SQL do provedor, pgAdmin ou DBeaver.
3. Abra `instalacao-completa.sql` e execute o arquivo inteiro na mesma conexão. Ele já contém BEGIN/COMMIT; use a execução de script que pare no primeiro erro.
4. Confira as tabelas, o catálogo e `arcadia_postgres_baselines`.

O usuário do banco precisa poder criar tabelas, funções, gatilhos e a extensão `citext`. Se faltar permissão, solicite ao provedor ou ao administrador; não ignore o erro.

## O que está incluído

- Estrutura-base do portal e alterações das migrações 1.1.25 a 1.1.31, consolidadas na definição final.
- As 11 alterações SQL da pasta `backend/db/pending`, incluindo etapas e duração de cursos, auditoria, correção de nomes, autoria e públicos de documentos, Google, capas e fixação de projetos, nomes longos de disciplinas e arquivamento de tarefas/atividades.
- 52 tabelas do portal, três visualizações, índices, chaves estrangeiras, restrições e gatilhos convertidos.
- 48 cursos de referência, suas durações disponíveis, links úteis, registros únicos de controle e 1.450 disciplinas do catálogo SIGAA.
- Um registro separado da consolidação em `arcadia_postgres_baselines`, com hashes das fontes em `manifest.json`.

Os nomes completos das disciplinas são preservados. O maior nome importado tem 117 caracteres; os campos de nome do catálogo e de ofertas aceitam até 150.

Não são criados usuários de exemplo, contas de administrador, senhas, notícias ou documentos pessoais. Nenhuma informação do banco atual é transferida automaticamente. As migrações MySQL antigas não são marcadas como executadas no PostgreSQL: o controle da instalação nova é próprio.

## Validação realizada em 16/11/2026

O arquivo foi executado por inteiro no PostgreSQL embarcado PGlite, com `citext`. Foram conferidos contagens, colunas das migrações, nomes longos, durações, rejeição de reaplicação sobre dados e rollback quando a carga falha. Ainda não foi executado em um servidor PostgreSQL remoto nem foi testado com o backend completo.

**O site continua no MySQL.** Criar este banco não torna o código publicado compatível com PostgreSQL. Falta adaptar e testar o backend, migrar os dados reais e planejar a troca da conexão.

## Regenerar localmente

Execute na raiz do projeto:

    node tools/db/build-postgres-install.cjs

O gerador interrompe quando encontra uma nova alteração pendente que ainda não foi revisada. `manifest.json` identifica as fontes incluídas e seus hashes. Não edite os arquivos gerados para simular cobertura de migrações.
