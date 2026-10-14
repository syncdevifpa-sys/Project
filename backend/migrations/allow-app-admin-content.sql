-- Migração específica para schema já importado: preserva dados e altera somente dois triggers.
-- DDL faz commit implícito no MySQL. Revise e mantenha backup das definições existentes.
DROP TRIGGER IF EXISTS trg_avisos_autor;
DROP TRIGGER IF EXISTS trg_projetos_aprovacao;
DELIMITER $$
CREATE TRIGGER trg_avisos_autor BEFORE INSERT ON avisos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    DECLARE v_admin BOOLEAN;
    SELECT tipo_usuario, is_admin INTO v_tipo, v_admin FROM usuarios
    WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL OR (v_tipo = 'discente' AND NOT v_admin) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Apenas docentes, servidores e administradores ativos podem publicar avisos.';
    END IF;
END$$
CREATE TRIGGER trg_projetos_aprovacao BEFORE INSERT ON projetos FOR EACH ROW
BEGIN
    DECLARE v_tipo VARCHAR(20);
    DECLARE v_admin BOOLEAN;
    SELECT tipo_usuario, is_admin INTO v_tipo, v_admin FROM usuarios
    WHERE id_usuario = NEW.id_usuario AND situacao = 'ativo';
    IF v_tipo IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Usuário inválido ou inativo para submeter projetos.';
    ELSEIF v_tipo = 'discente' AND NOT v_admin THEN
        SET NEW.aprovacao = 'pendente';
        SET NEW.aprovado_por = NULL;
    ELSE
        SET NEW.aprovacao = 'aprovado';
    END IF;
END$$
DELIMITER ;
