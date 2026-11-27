-- Regras de autoria, titularidade e invalidação preservadas em PL/pgSQL.
CREATE FUNCTION arcadia_autor_aviso() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo text; adm smallint;
BEGIN
 SELECT tipo_usuario,is_admin INTO tipo,adm FROM usuarios WHERE id_usuario=NEW.id_usuario AND situacao='ativo';
 IF tipo IS NULL OR (tipo='discente' AND adm=0) THEN RAISE EXCEPTION 'Apenas docentes, servidores e administradores ativos podem publicar avisos.' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_avisos_autor BEFORE INSERT ON avisos FOR EACH ROW EXECUTE FUNCTION arcadia_autor_aviso();
CREATE FUNCTION arcadia_aprovar_projeto() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE tipo text; adm smallint;
BEGIN
 SELECT tipo_usuario,is_admin INTO tipo,adm FROM usuarios WHERE id_usuario=NEW.id_usuario AND situacao='ativo';
 IF tipo IS NULL THEN RAISE EXCEPTION 'Usuário inválido ou inativo para submeter projetos.' USING ERRCODE='P0001';
 ELSIF tipo='discente' AND adm=0 THEN NEW.aprovacao='pendente';NEW.aprovado_por=NULL;
 ELSE NEW.aprovacao='aprovado'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_projetos_aprovacao BEFORE INSERT ON projetos FOR EACH ROW EXECUTE FUNCTION arcadia_aprovar_projeto();
CREATE FUNCTION arcadia_titular_unico() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.id_usuario IS NULL)=(NEW.id_externo IS NULL) THEN RAISE EXCEPTION 'Informe id_usuario OU id_externo (apenas um).' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_tokens_dono BEFORE INSERT OR UPDATE ON tokens FOR EACH ROW EXECUTE FUNCTION arcadia_titular_unico();
CREATE TRIGGER trg_recuperacao_dono BEFORE INSERT OR UPDATE ON recuperacao_senha FOR EACH ROW EXECUTE FUNCTION arcadia_titular_unico();
CREATE FUNCTION arcadia_turma_nome() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 NEW.nome=regexp_replace(trim(NEW.nome),'[[:space:]]+',' ','g');
 NEW.nome_chave=lower(NEW.nome);
 RETURN NEW;
END $$;
CREATE TRIGGER trg_turma_nome BEFORE INSERT OR UPDATE ON academico_turmas FOR EACH ROW EXECUTE FUNCTION arcadia_turma_nome();
CREATE FUNCTION arcadia_tarefa_lembretes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF (NEW.status='concluida' AND OLD.status<>'concluida') OR NEW.data_entrega IS DISTINCT FROM OLD.data_entrega THEN
 UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_tarefa=NEW.id_tarefa;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER tarefa_invalida_lembretes AFTER UPDATE ON tarefas FOR EACH ROW EXECUTE FUNCTION arcadia_tarefa_lembretes();
CREATE FUNCTION arcadia_evento_lembretes() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_TABLE_NAME='agenda_externa' THEN
   UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_evento_externo=OLD.id_evento;
 ELSE
   UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_evento=OLD.id_evento;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER trg_calendario_lembrete_update AFTER UPDATE ON calendario FOR EACH ROW EXECUTE FUNCTION arcadia_evento_lembretes();
CREATE TRIGGER trg_calendario_lembrete_delete BEFORE DELETE ON calendario FOR EACH ROW EXECUTE FUNCTION arcadia_evento_lembretes();
CREATE TRIGGER trg_agenda_externa_lembrete_update AFTER UPDATE ON agenda_externa FOR EACH ROW EXECUTE FUNCTION arcadia_evento_lembretes();
CREATE TRIGGER trg_agenda_externa_lembrete_delete BEFORE DELETE ON agenda_externa FOR EACH ROW EXECUTE FUNCTION arcadia_evento_lembretes();
