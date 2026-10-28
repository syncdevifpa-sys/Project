# Recuperação R1 do comparador da migração 1.1.31

O `8s.csv` fornecido mostra `IF(estado='pendente',id_turma,NULL)` com a apresentação canônica de identificadores/charset e barras junto às aspas. O CSV **não prova** que as barras são bytes da expressão no banco: podem ter sido adicionadas pelo exportador. O diagnóstico com `HEX` distingue os casos.

## O que foi preservado

O manifesto, o SQL original `backend/db/migrations/1.1.31.sql`, o diagnóstico original `backend/db/checks/1.1.31.sql` e o checksum lógico foram preservados. A versão pode ter sido executada em outro ambiente; não se reescreve esse histórico. Checksum esperado da 1.1.31:

`65b9e91ba1ee9ae3025c3078ee3a8e61e278640c482d384a0f35d154bd0ad326`

`resume-generated-expression-r1.sql` contém a mesma migração, alterando **somente dois asserts** de expressão gerada. Não remove assert, coluna ou índice, não executa ALTER/DROP de tabelas e não faz atualização manual do registro de migração. A diferença foi conferida automaticamente linha a linha.

## Como retomar no Workbench

1. Na **mesma conexão e banco** onde ocorreu a falha, execute primeiro **somente** `backend/db/checks/1.1.31-generated-expression-diagnostic.sql`. Esse arquivo é integralmente de leitura.
2. Confira `COLUMN_TYPE=int`, `EXTRA=STORED GENERATED` e `expressao_compativel_r1=1`. A versão 1.1.30 precisa estar registrada com checksum `86a92153561f5572008da9e9d569b4878d98cbf1fc07cb807db580b23a449ef1`. Se houver registro 1.1.31, seu checksum deve ser o indicado acima. Se qualquer item divergir, **pare e envie os resultados**; não altere colunas, não elimine índices e não insira/atualize o registro de migração para contornar o erro.
3. Somente com os resultados compatíveis e o backup disponível, abra **`backend/db/workbench/1.1.31/resume-generated-expression-r1.sql` atualizado** e execute o arquivo completo, com interrupção no primeiro erro. Não rode apenas `CALL _arc131_apply()`: o procedimento armazenado antigo precisa ser recriado com o comparador corrigido. O arquivo faz isso explicitamente antes do CALL.
4. O arquivo valida a estrutura já criada e completa o que faltou após o SIGNAL. DDL MySQL pode ter sido aplicado parcialmente, mesmo sem registro 1.1.31. Se a versão já estiver registrada com checksum correto, após validar a estrutura o procedimento sai sem repetir adoção/backfill.
5. Confira o SELECT final de versão/checksum e execute `backend/db/checks/1.1.31.sql`. Resultado vazio não confirma aplicação. Havendo erro, pare no erro; não marque a versão como aplicada manualmente.

## Comparador

A recuperação usa correspondência da expressão inteira, com regras específicas para `id_curso_ativo` e `turma_pendente`. Aceita identificadores com/sem backticks, diferenças de caixa em nomes/funções, espaços externos ao literal, parênteses redundantes balanceados e o introducer conhecido `_utf8mb4`. Para o literal **exato** `pendente`, aceita as duas aspas normais ou a serialização pareada `\'pendente\'`; nenhuma outra barra é removida.

O literal não é convertido para minúsculas nem tem espaços/parênteses apagados. Condição `!=`, literal diferente, retorno diferente, operadores extras e inversão dos ramos são recusados. O padrão é transmitido por hexadecimal convertido para utf8mb4, sem depender do escape de strings da sessão (`NO_BACKSLASH_ESCAPES`). O parâmetro `c` mantém o literal sensível à caixa conforme [REGEXP_LIKE no MySQL 8.4](https://dev.mysql.com/doc/refman/8.4/en/regexp.html).

Geração offline: `node tools/db/build-academic-access.cjs`. O comando agora verifica os originais e gera a recuperação separada, sem sobrescrevê-los. Os testes verificam representações aceitas, contraexemplos semânticos e que apenas os dois asserts foram substituídos. Não foi executado SQL pelo agente; o resultado nativo do comparador ainda deve ser confirmado na etapa 1.

## Estado após a retomada — 27/10/2026

O responsável confirmou a conclusão e enviou quatro CSVs do diagnóstico. Eles identificam `defaultdb`, MySQL `8.4.11`, `expressao_compativel_r1=1`, a coluna `turma_pendente` como `int STORED GENERATED`, o índice único esperado e as versões 1.1.30/1.1.31 com os checksums correspondentes. A 1.1.31 aparece verificada em `2026-10-27 00:24:47` (valor do banco; fuso não informado). Não reaplicar nesta base. O agente conferiu os arquivos, sem executar SQL ou conectar ao banco real. Este roteiro continua destinado à recuperação de outras bases que ainda estejam interrompidas.
