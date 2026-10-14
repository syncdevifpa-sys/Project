-- Execute somente na conexão Aiven e no schema do aplicativo já selecionado.
-- Conta ausente, externa ou inativa não é criada, convertida ou ativada por este arquivo.
-- Autorização específica: este e-mail recebe vínculo Servidor e administração do aplicativo.
-- Preserva senha, matrícula, curso, período, outras contas e permissões do servidor MySQL.
-- Curso/período são opcionais no esquema e não impedem o vínculo Servidor; não apague histórico.
-- Se a tentativa anterior falhou, execute ROLLBACK na conexão antes de repetir este arquivo.
-- Mantém SQL_SAFE_UPDATES habilitado; utiliza a chave primária e um limite adicional de uma linha.
SET @arcadia_owner_id = NULL;
START TRANSACTION;
SELECT id_usuario INTO @arcadia_owner_id
FROM usuarios
WHERE email = 'syncdevifpa@gmail.com'
  AND CAST(email AS BINARY) = CAST('syncdevifpa@gmail.com' AS BINARY)
  AND situacao = 'ativo'
FOR UPDATE;
SELECT 'antes' AS etapa, id_usuario, email, tipo_usuario, situacao, is_admin, matricula, id_curso, periodo
FROM usuarios WHERE id_usuario = @arcadia_owner_id
  AND CAST(email AS BINARY) = CAST('syncdevifpa@gmail.com' AS BINARY);
UPDATE usuarios SET tipo_usuario = 'servidor', is_admin = TRUE
WHERE id_usuario = @arcadia_owner_id
  AND CAST(email AS BINARY) = CAST('syncdevifpa@gmail.com' AS BINARY)
  AND situacao = 'ativo'
LIMIT 1;
SELECT ROW_COUNT() AS linhas_alteradas;
SELECT 'depois' AS etapa, id_usuario, email, tipo_usuario, situacao, is_admin, matricula, id_curso, periodo
FROM usuarios WHERE id_usuario = @arcadia_owner_id
  AND CAST(email AS BINARY) = CAST('syncdevifpa@gmail.com' AS BINARY);
COMMIT;
