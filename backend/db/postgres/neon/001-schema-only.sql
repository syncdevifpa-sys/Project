-- Somente na branch dev/arcadia-postgres-migration / arcadiabd, nunca em production.
BEGIN;
DO $$ BEGIN
 IF current_database() <> 'arcadiabd' THEN RAISE EXCEPTION 'Banco incorreto'; END IF;
 IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relkind IN ('r','p','v','m','f')) THEN
  RAISE EXCEPTION 'Destino deve estar vazio; nenhuma estrutura existente será substituída';
 END IF;
END $$;
--
-- PostgreSQL database dump
--


-- Dumped from database version 18.7
-- Dumped by pg_dump version 18.7

-- Started on 2026-11-22 23:05:40

SET statement_timeout = 0;

SET lock_timeout = 0;

SET idle_in_transaction_session_timeout = 0;

SET transaction_timeout = 0;

SET client_encoding = 'UTF8';

SET standard_conforming_strings = on;

SELECT pg_catalog.set_config('search_path', '', false);

SET check_function_bodies = false;

SET xmloption = content;

SET client_min_messages = warning;

SET row_security = off;


--
-- TOC entry 2 (class 3079 OID 18076)
-- Name: citext; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS citext WITH SCHEMA public;



--
-- TOC entry 6004 (class 0 OID 0)
-- Dependencies: 2
-- Name: EXTENSION citext; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION citext IS 'data type for case-insensitive character strings';



--
-- TOC entry 330 (class 1255 OID 19697)
-- Name: arcadia_aprovar_projeto(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_aprovar_projeto() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE tipo text; adm smallint;
BEGIN
 SELECT tipo_usuario,is_admin INTO tipo,adm FROM usuarios WHERE id_usuario=NEW.id_usuario AND situacao='ativo';
 IF tipo IS NULL THEN RAISE EXCEPTION 'Usuário inválido ou inativo para submeter projetos.' USING ERRCODE='P0001';
 ELSIF tipo='discente' AND adm=0 THEN NEW.aprovacao='pendente';NEW.aprovado_por=NULL;
 ELSE NEW.aprovacao='aprovado'; END IF;
 RETURN NEW;
END $$;



--
-- TOC entry 320 (class 1255 OID 19695)
-- Name: arcadia_autor_aviso(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_autor_aviso() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
DECLARE tipo text; adm smallint;
BEGIN
 SELECT tipo_usuario,is_admin INTO tipo,adm FROM usuarios WHERE id_usuario=NEW.id_usuario AND situacao='ativo';
 IF tipo IS NULL OR (tipo='discente' AND adm=0) THEN RAISE EXCEPTION 'Apenas docentes, servidores e administradores ativos podem publicar avisos.' USING ERRCODE='P0001'; END IF;
 RETURN NEW;
END $$;



--
-- TOC entry 349 (class 1255 OID 19706)
-- Name: arcadia_evento_lembretes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_evento_lembretes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF TG_TABLE_NAME='agenda_externa' THEN
   UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_evento_externo=OLD.id_evento;
 ELSE
   UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_evento=OLD.id_evento;
 END IF;
 IF TG_OP='DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;



--
-- TOC entry 316 (class 1255 OID 19704)
-- Name: arcadia_tarefa_lembretes(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_tarefa_lembretes() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF (NEW.status='concluida' AND OLD.status<>'concluida') OR NEW.data_entrega IS DISTINCT FROM OLD.data_entrega THEN
 UPDATE lembretes SET ativo=0,enviar_email=0,versao=versao+1 WHERE id_tarefa=NEW.id_tarefa;
 END IF;
 RETURN NEW;
END $$;



--
-- TOC entry 351 (class 1255 OID 19699)
-- Name: arcadia_titular_unico(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_titular_unico() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 IF (NEW.id_usuario IS NULL)=(NEW.id_externo IS NULL) THEN RAISE EXCEPTION 'Informe id_usuario OU id_externo (apenas um).' USING ERRCODE='23514'; END IF;
 RETURN NEW;
END $$;



--
-- TOC entry 332 (class 1255 OID 19680)
-- Name: arcadia_touch(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_touch() RETURNS trigger
    LANGUAGE plpgsql
    AS $$ BEGIN NEW.atualizado_em=LOCALTIMESTAMP; RETURN NEW; END $$;



--
-- TOC entry 324 (class 1255 OID 19702)
-- Name: arcadia_turma_nome(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.arcadia_turma_nome() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
 NEW.nome=regexp_replace(trim(NEW.nome),'[[:space:]]+',' ','g');
 NEW.nome_chave=lower(NEW.nome);
 RETURN NEW;
END $$;



SET default_tablespace = '';


SET default_table_access_method = heap;


--
-- TOC entry 297 (class 1259 OID 19139)
-- Name: academico_catalogo_disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_catalogo_disciplinas (
    id_catalogo integer NOT NULL,
    nome public.citext NOT NULL,
    nome_chave public.citext NOT NULL,
    legado smallint DEFAULT 0 NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    versao bigint DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_catalogo_disciplinas_ativo_check CHECK ((ativo = ANY (ARRAY[0, 1]))),
    CONSTRAINT academico_catalogo_disciplinas_legado_check CHECK ((legado = ANY (ARRAY[0, 1]))),
    CONSTRAINT academico_catalogo_disciplinas_nome_chave_check CHECK ((char_length((nome_chave)::text) <= 160)),
    CONSTRAINT academico_catalogo_disciplinas_nome_check CHECK ((char_length((nome)::text) <= 150)),
    CONSTRAINT academico_catalogo_disciplinas_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 296 (class 1259 OID 19138)
-- Name: academico_catalogo_disciplinas_id_catalogo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_catalogo_disciplinas ALTER COLUMN id_catalogo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_catalogo_disciplinas_id_catalogo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 269 (class 1259 OID 18819)
-- Name: academico_convites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_convites (
    id_convite integer NOT NULL,
    id_disciplina integer NOT NULL,
    email public.citext NOT NULL,
    estado text DEFAULT 'pendente'::text NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_convites_email_check CHECK ((char_length((email)::text) <= 150)),
    CONSTRAINT academico_convites_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aceito'::text, 'recusado'::text, 'cancelado'::text])))
);



--
-- TOC entry 268 (class 1259 OID 18818)
-- Name: academico_convites_id_convite_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_convites ALTER COLUMN id_convite ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_convites_id_convite_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 266 (class 1259 OID 18780)
-- Name: academico_disciplinas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_disciplinas (
    regime_letivo text DEFAULT 'legado'::text NOT NULL,
    semestre smallint DEFAULT 0 NOT NULL,
    atribuicao_ativa smallint DEFAULT 1 NOT NULL,
    arquivada_em timestamp without time zone,
    id_disciplina integer NOT NULL,
    id_turma integer NOT NULL,
    id_professor integer NOT NULL,
    nome public.citext NOT NULL,
    ano_letivo integer NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_disciplinas_ano_letivo_check CHECK ((ano_letivo >= 0)),
    CONSTRAINT academico_disciplinas_nome_check CHECK ((char_length((nome)::text) <= 150)),
    CONSTRAINT academico_disciplinas_regime_letivo_check CHECK ((regime_letivo = ANY (ARRAY['legado'::text, 'anual'::text, 'semestral'::text]))),
    CONSTRAINT academico_disciplinas_semestre_check CHECK ((semestre >= 0)),
    CONSTRAINT chk_oferta_semestre CHECK ((((regime_letivo = 'semestral'::text) AND (semestre = ANY (ARRAY[1, 2]))) OR ((regime_letivo = ANY (ARRAY['legado'::text, 'anual'::text])) AND (semestre = 0))))
);



--
-- TOC entry 265 (class 1259 OID 18779)
-- Name: academico_disciplinas_id_disciplina_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_disciplinas ALTER COLUMN id_disciplina ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_disciplinas_id_disciplina_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 303 (class 1259 OID 19214)
-- Name: academico_gestao_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_gestao_historico (
    id_registro bigint NOT NULL,
    tipo text NOT NULL,
    id_alvo integer NOT NULL,
    acao public.citext NOT NULL,
    id_autor integer,
    nome_autor public.citext NOT NULL,
    motivo public.citext,
    detalhes jsonb,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_gestao_historico_acao_check CHECK ((char_length((acao)::text) <= 40)),
    CONSTRAINT academico_gestao_historico_motivo_check CHECK ((char_length((motivo)::text) <= 500)),
    CONSTRAINT academico_gestao_historico_nome_autor_check CHECK ((char_length((nome_autor)::text) <= 200)),
    CONSTRAINT academico_gestao_historico_tipo_check CHECK ((tipo = ANY (ARRAY['turma'::text, 'oferta'::text, 'catalogo'::text, 'ingresso'::text, 'vinculo'::text])))
);



--
-- TOC entry 302 (class 1259 OID 19213)
-- Name: academico_gestao_historico_id_registro_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_gestao_historico ALTER COLUMN id_registro ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_gestao_historico_id_registro_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 289 (class 1259 OID 19054)
-- Name: academico_horario_excecoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_horario_excecoes (
    id_horario integer NOT NULL,
    data date NOT NULL,
    cancelada smallint DEFAULT 1 NOT NULL,
    motivo public.citext,
    id_autor integer,
    versao bigint DEFAULT 0 NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_horario_excecoes_cancelada_check CHECK ((cancelada = ANY (ARRAY[0, 1]))),
    CONSTRAINT academico_horario_excecoes_motivo_check CHECK ((char_length((motivo)::text) <= 300)),
    CONSTRAINT academico_horario_excecoes_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 288 (class 1259 OID 19029)
-- Name: academico_horarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_horarios (
    id_horario integer NOT NULL,
    id_disciplina integer NOT NULL,
    dia_semana smallint NOT NULL,
    hora_inicio time without time zone NOT NULL,
    hora_fim time without time zone NOT NULL,
    vigencia_inicio date NOT NULL,
    vigencia_fim date NOT NULL,
    sala public.citext,
    id_autor integer,
    ativo smallint DEFAULT 1 NOT NULL,
    versao bigint DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_horarios_ativo_check CHECK ((ativo = ANY (ARRAY[0, 1]))),
    CONSTRAINT academico_horarios_check CHECK ((((dia_semana >= 1) AND (dia_semana <= 7)) AND (hora_inicio < hora_fim) AND (vigencia_inicio <= vigencia_fim))),
    CONSTRAINT academico_horarios_dia_semana_check CHECK ((dia_semana >= 0)),
    CONSTRAINT academico_horarios_sala_check CHECK ((char_length((sala)::text) <= 100)),
    CONSTRAINT academico_horarios_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 287 (class 1259 OID 19028)
-- Name: academico_horarios_id_horario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_horarios ALTER COLUMN id_horario ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_horarios_id_horario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 267 (class 1259 OID 18807)
-- Name: academico_matriculas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_matriculas (
    ativa smallint DEFAULT 1 NOT NULL,
    encerrado_em timestamp without time zone,
    id_disciplina integer NOT NULL,
    id_aluno integer NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 298 (class 1259 OID 19164)
-- Name: academico_oferta_catalogo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_oferta_catalogo (
    id_disciplina integer NOT NULL,
    id_catalogo integer NOT NULL
);



--
-- TOC entry 301 (class 1259 OID 19191)
-- Name: academico_pedidos_ingresso; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_pedidos_ingresso (
    id_pedido integer NOT NULL,
    id_turma integer NOT NULL,
    id_aluno integer NOT NULL,
    estado text DEFAULT 'pendente'::text NOT NULL,
    turma_pendente integer GENERATED ALWAYS AS (
CASE
    WHEN (estado = 'pendente'::text) THEN id_turma
    ELSE NULL::integer
END) STORED,
    versao bigint DEFAULT 0 NOT NULL,
    id_decisor integer,
    motivo public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    decidido_em timestamp without time zone,
    CONSTRAINT academico_pedidos_ingresso_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text, 'cancelado'::text]))),
    CONSTRAINT academico_pedidos_ingresso_motivo_check CHECK ((char_length((motivo)::text) <= 500)),
    CONSTRAINT academico_pedidos_ingresso_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 300 (class 1259 OID 19190)
-- Name: academico_pedidos_ingresso_id_pedido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_pedidos_ingresso ALTER COLUMN id_pedido ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_pedidos_ingresso_id_pedido_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 271 (class 1259 OID 18839)
-- Name: academico_publicacoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_publicacoes (
    id_autor integer,
    id_publicacao integer NOT NULL,
    id_disciplina integer NOT NULL,
    tipo text NOT NULL,
    titulo public.citext NOT NULL,
    descricao public.citext,
    id_item integer,
    url public.citext,
    inicio timestamp without time zone,
    fim timestamp without time zone,
    situacao text DEFAULT 'ativo'::text NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    tipo_atividade public.citext,
    CONSTRAINT academico_publicacoes_descricao_check CHECK ((char_length((descricao)::text) <= 3000)),
    CONSTRAINT academico_publicacoes_situacao_check CHECK ((situacao = ANY (ARRAY['ativo'::text, 'cancelado'::text]))),
    CONSTRAINT academico_publicacoes_tipo_atividade_check CHECK ((char_length((tipo_atividade)::text) <= 30)),
    CONSTRAINT academico_publicacoes_tipo_check CHECK ((tipo = ANY (ARRAY['aviso'::text, 'material'::text, 'projeto'::text, 'agenda'::text]))),
    CONSTRAINT academico_publicacoes_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT academico_publicacoes_url_check CHECK ((char_length((url)::text) <= 2000))
);



--
-- TOC entry 270 (class 1259 OID 18838)
-- Name: academico_publicacoes_id_publicacao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_publicacoes ALTER COLUMN id_publicacao ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_publicacoes_id_publicacao_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 276 (class 1259 OID 18921)
-- Name: academico_saidas_professor; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_saidas_professor (
    id_saida integer NOT NULL,
    id_disciplina integer NOT NULL,
    id_professor integer,
    encerrado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 275 (class 1259 OID 18920)
-- Name: academico_saidas_professor_id_saida_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_saidas_professor ALTER COLUMN id_saida ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_saidas_professor_id_saida_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 286 (class 1259 OID 19012)
-- Name: academico_salas_historico; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_salas_historico (
    id_alteracao integer NOT NULL,
    id_turma integer,
    id_autor integer,
    nome_autor public.citext NOT NULL,
    sala_anterior public.citext,
    sala_nova public.citext,
    versao_anterior bigint NOT NULL,
    alterado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_salas_historico_nome_autor_check CHECK ((char_length((nome_autor)::text) <= 100)),
    CONSTRAINT academico_salas_historico_sala_anterior_check CHECK ((char_length((sala_anterior)::text) <= 100)),
    CONSTRAINT academico_salas_historico_sala_nova_check CHECK ((char_length((sala_nova)::text) <= 100)),
    CONSTRAINT academico_salas_historico_versao_anterior_check CHECK ((versao_anterior >= 0))
);



--
-- TOC entry 285 (class 1259 OID 19011)
-- Name: academico_salas_historico_id_alteracao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_salas_historico ALTER COLUMN id_alteracao ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_salas_historico_id_alteracao_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 264 (class 1259 OID 18747)
-- Name: academico_turmas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_turmas (
    descricao public.citext,
    sala_oficial public.citext,
    versao_sala bigint DEFAULT 0 NOT NULL,
    id_representante integer,
    id_vice1 integer,
    id_vice2 integer,
    whatsapp_representante public.citext,
    consentimento_whatsapp_em timestamp without time zone,
    nome_chave character varying(100) DEFAULT ''::character varying NOT NULL,
    arquivada_em timestamp without time zone,
    id_turma integer NOT NULL,
    id_curso integer NOT NULL,
    nome public.citext NOT NULL,
    ano_ingresso integer NOT NULL,
    turno text NOT NULL,
    campus public.citext NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT academico_turmas_ano_ingresso_check CHECK ((ano_ingresso >= 0)),
    CONSTRAINT academico_turmas_campus_check CHECK ((char_length((campus)::text) <= 100)),
    CONSTRAINT academico_turmas_descricao_check CHECK ((char_length((descricao)::text) <= 1000)),
    CONSTRAINT academico_turmas_nome_chave_check CHECK ((char_length((nome_chave)::text) <= 100)),
    CONSTRAINT academico_turmas_nome_check CHECK ((char_length((nome)::text) <= 100)),
    CONSTRAINT academico_turmas_sala_oficial_check CHECK ((char_length((sala_oficial)::text) <= 100)),
    CONSTRAINT academico_turmas_turno_check CHECK ((turno = ANY (ARRAY['manha'::text, 'tarde'::text, 'noite'::text, 'integral'::text]))),
    CONSTRAINT academico_turmas_versao_sala_check CHECK ((versao_sala >= 0)),
    CONSTRAINT academico_turmas_whatsapp_representante_check CHECK ((char_length((whatsapp_representante)::text) <= 20))
);



--
-- TOC entry 263 (class 1259 OID 18746)
-- Name: academico_turmas_id_turma_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.academico_turmas ALTER COLUMN id_turma ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.academico_turmas_id_turma_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 299 (class 1259 OID 19171)
-- Name: academico_vinculos_turma; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.academico_vinculos_turma (
    id_turma integer NOT NULL,
    id_aluno integer NOT NULL,
    id_curso integer NOT NULL,
    ativa smallint DEFAULT 1 NOT NULL,
    id_curso_ativo integer GENERATED ALWAYS AS (
CASE
    WHEN (COALESCE((ativa)::integer, 0) <> 0) THEN id_curso
    ELSE NULL::integer
END) STORED,
    versao bigint DEFAULT 0 NOT NULL,
    ingresso_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    saida_em timestamp without time zone,
    CONSTRAINT academico_vinculos_turma_ativa_check CHECK ((ativa = ANY (ARRAY[0, 1]))),
    CONSTRAINT academico_vinculos_turma_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 251 (class 1259 OID 18600)
-- Name: agenda_externa; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_externa (
    id_evento integer NOT NULL,
    id_externo integer NOT NULL,
    titulo public.citext NOT NULL,
    descricao text,
    categoria public.citext DEFAULT 'evento'::public.citext NOT NULL,
    data_evento date NOT NULL,
    data_fim date,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    local public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT agenda_externa_categoria_check CHECK ((char_length((categoria)::text) <= 40)),
    CONSTRAINT agenda_externa_local_check CHECK ((char_length((local)::text) <= 150)),
    CONSTRAINT agenda_externa_titulo_check CHECK ((char_length((titulo)::text) <= 150))
);



--
-- TOC entry 250 (class 1259 OID 18599)
-- Name: agenda_externa_id_evento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.agenda_externa ALTER COLUMN id_evento ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.agenda_externa_id_evento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 282 (class 1259 OID 18987)
-- Name: agenda_vinculos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_vinculos (
    id_evento_externo integer NOT NULL,
    id_evento integer NOT NULL
);



--
-- TOC entry 308 (class 1259 OID 19726)
-- Name: arcadia_postgres_baselines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arcadia_postgres_baselines (
    versao text NOT NULL,
    checksum character(64) NOT NULL,
    fontes jsonb NOT NULL,
    instalado_em timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 290 (class 1259 OID 19072)
-- Name: arcadia_schema_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.arcadia_schema_migrations (
    versao public.citext NOT NULL,
    checksum public.citext NOT NULL,
    verificado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT arcadia_schema_migrations_checksum_check CHECK ((char_length((checksum)::text) <= 64)),
    CONSTRAINT arcadia_schema_migrations_versao_check CHECK ((char_length((versao)::text) <= 32))
);



--
-- TOC entry 239 (class 1259 OID 18414)
-- Name: avisos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avisos (
    id_aviso integer NOT NULL,
    id_usuario integer,
    tipo_publicacao text DEFAULT 'aviso'::text NOT NULL,
    capa text,
    titulo public.citext NOT NULL,
    resumo text NOT NULL,
    descricao text,
    categoria text DEFAULT 'matricula'::text NOT NULL,
    publico_alvo text DEFAULT 'todos'::text NOT NULL,
    situacao text DEFAULT 'publicado'::text NOT NULL,
    urgente smallint DEFAULT 0 NOT NULL,
    fixado smallint DEFAULT 0 NOT NULL,
    referencia public.citext,
    data_prazo date,
    data_evento date,
    vagas bigint,
    detalhes jsonb,
    data_publicacao timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT avisos_categoria_check CHECK ((categoria = ANY (ARRAY['matricula'::text, 'edital'::text, 'evento'::text, 'cancelamento'::text, 'calendario'::text]))),
    CONSTRAINT avisos_fixado_check CHECK ((fixado = ANY (ARRAY[0, 1]))),
    CONSTRAINT avisos_publico_alvo_check CHECK ((string_to_array(publico_alvo, ','::text) <@ ARRAY['todos'::text, 'discente'::text, 'docente'::text, 'servidor'::text, 'externo'::text])),
    CONSTRAINT avisos_referencia_check CHECK ((char_length((referencia)::text) <= 50)),
    CONSTRAINT avisos_situacao_check CHECK ((situacao = ANY (ARRAY['rascunho'::text, 'publicado'::text, 'arquivado'::text]))),
    CONSTRAINT avisos_tipo_publicacao_check CHECK ((tipo_publicacao = ANY (ARRAY['aviso'::text, 'noticia'::text]))),
    CONSTRAINT avisos_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT avisos_urgente_check CHECK ((urgente = ANY (ARRAY[0, 1]))),
    CONSTRAINT avisos_vagas_check CHECK ((vagas >= 0))
);



--
-- TOC entry 238 (class 1259 OID 18413)
-- Name: avisos_id_aviso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.avisos ALTER COLUMN id_aviso ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.avisos_id_aviso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 240 (class 1259 OID 18450)
-- Name: avisos_lidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.avisos_lidos (
    id_aviso integer NOT NULL,
    id_usuario integer NOT NULL,
    lido_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 292 (class 1259 OID 19086)
-- Name: cadastro_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cadastro_auditoria (
    id_auditoria bigint NOT NULL,
    id_admin integer,
    id_usuario integer NOT NULL,
    campos jsonb NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT cadastro_auditoria_id_auditoria_check CHECK ((id_auditoria >= 0))
);



--
-- TOC entry 291 (class 1259 OID 19085)
-- Name: cadastro_auditoria_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cadastro_auditoria ALTER COLUMN id_auditoria ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cadastro_auditoria_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 246 (class 1259 OID 18513)
-- Name: calendario; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calendario (
    origem_calendario text DEFAULT 'ifpa'::text NOT NULL,
    id_evento integer NOT NULL,
    id_usuario integer,
    titulo public.citext NOT NULL,
    descricao text,
    categoria text DEFAULT 'evento'::text NOT NULL,
    oculto smallint DEFAULT 0 NOT NULL,
    visibilidade text DEFAULT 'publico'::text NOT NULL,
    periodo_letivo public.citext,
    data_evento date NOT NULL,
    data_fim date,
    hora_inicio time without time zone,
    hora_fim time without time zone,
    local public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT calendario_categoria_check CHECK ((categoria = ANY (ARRAY['matricula'::text, 'cancelamento'::text, 'evento'::text, 'edital'::text, 'feriado'::text, 'ferias'::text, 'aniversario'::text, 'atividades_campus'::text, 'sabado_letivo'::text, 'periodo_academico'::text, 'culminancia_bimestral'::text, 'recesso'::text, 'registro_academico'::text, 'ponto_facultativo'::text, 'avaliacao'::text, 'interrupcao_presencial'::text, 'ferias_docentes'::text]))),
    CONSTRAINT calendario_local_check CHECK ((char_length((local)::text) <= 150)),
    CONSTRAINT calendario_origem_calendario_check CHECK ((origem_calendario = ANY (ARRAY['agenda'::text, 'ifpa'::text]))),
    CONSTRAINT calendario_periodo_letivo_check CHECK ((char_length((periodo_letivo)::text) <= 60)),
    CONSTRAINT calendario_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT calendario_visibilidade_check CHECK ((visibilidade = ANY (ARRAY['publico'::text, 'pessoal'::text, 'institucional'::text, 'comunidade'::text])))
);



--
-- TOC entry 245 (class 1259 OID 18512)
-- Name: calendario_id_evento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.calendario ALTER COLUMN id_evento ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.calendario_id_evento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 294 (class 1259 OID 19100)
-- Name: conta_nome_pedidos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conta_nome_pedidos (
    id_pedido integer NOT NULL,
    tipo text NOT NULL,
    id_conta integer NOT NULL,
    nome_anterior public.citext NOT NULL,
    nome_solicitado public.citext NOT NULL,
    estado text DEFAULT 'pendente'::text NOT NULL,
    motivo public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    revisado_por integer,
    revisado_em timestamp without time zone,
    CONSTRAINT conta_nome_pedidos_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text]))),
    CONSTRAINT conta_nome_pedidos_motivo_check CHECK ((char_length((motivo)::text) <= 1000)),
    CONSTRAINT conta_nome_pedidos_nome_anterior_check CHECK ((char_length((nome_anterior)::text) <= 100)),
    CONSTRAINT conta_nome_pedidos_nome_solicitado_check CHECK ((char_length((nome_solicitado)::text) <= 100)),
    CONSTRAINT conta_nome_pedidos_tipo_check CHECK ((tipo = ANY (ARRAY['users'::text, 'external'::text])))
);



--
-- TOC entry 293 (class 1259 OID 19099)
-- Name: conta_nome_pedidos_id_pedido_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.conta_nome_pedidos ALTER COLUMN id_pedido ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.conta_nome_pedidos_id_pedido_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 281 (class 1259 OID 18974)
-- Name: conta_vinculos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.conta_vinculos (
    id_externo integer NOT NULL,
    id_usuario integer NOT NULL,
    id_requisito integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 221 (class 1259 OID 18182)
-- Name: cursos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cursos (
    id_curso integer NOT NULL,
    nome public.citext NOT NULL,
    nivel text DEFAULT 'tecnico'::text NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    regime_etapas text,
    total_etapas smallint,
    CONSTRAINT cursos_ativo_check CHECK ((ativo = ANY (ARRAY[0, 1]))),
    CONSTRAINT cursos_nivel_check CHECK ((nivel = ANY (ARRAY['tecnico'::text, 'graduacao'::text, 'pos_graduacao'::text]))),
    CONSTRAINT cursos_nome_check CHECK ((char_length((nome)::text) <= 120)),
    CONSTRAINT cursos_regime_etapas_check CHECK ((regime_etapas = ANY (ARRAY['semestral'::text, 'anual'::text]))),
    CONSTRAINT cursos_total_etapas_check CHECK ((total_etapas >= 0))
);



--
-- TOC entry 220 (class 1259 OID 18181)
-- Name: cursos_id_curso_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.cursos ALTER COLUMN id_curso ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.cursos_id_curso_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 273 (class 1259 OID 18863)
-- Name: docente_requisitos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.docente_requisitos (
    id_curso integer,
    etapa_atual smallint,
    curso_informado public.citext,
    origem_solicitacao text DEFAULT 'cadastro'::text NOT NULL,
    tipo_solicitado text DEFAULT 'docente'::text NOT NULL,
    id_requisito integer NOT NULL,
    id_externo integer,
    id_usuario integer,
    nome public.citext NOT NULL,
    email public.citext NOT NULL,
    matricula public.citext NOT NULL,
    nome_usuario public.citext NOT NULL,
    formacao public.citext NOT NULL,
    estado text DEFAULT 'pendente'::text NOT NULL,
    versao bigint DEFAULT 1 NOT NULL,
    justificativa public.citext,
    revisado_por integer,
    revisado_em timestamp without time zone,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT docente_requisitos_curso_informado_check CHECK ((char_length((curso_informado)::text) <= 150)),
    CONSTRAINT docente_requisitos_email_check CHECK ((char_length((email)::text) <= 150)),
    CONSTRAINT docente_requisitos_estado_check CHECK ((estado = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text]))),
    CONSTRAINT docente_requisitos_etapa_atual_check CHECK ((etapa_atual >= 0)),
    CONSTRAINT docente_requisitos_formacao_check CHECK ((char_length((formacao)::text) <= 300)),
    CONSTRAINT docente_requisitos_justificativa_check CHECK ((char_length((justificativa)::text) <= 1000)),
    CONSTRAINT docente_requisitos_matricula_check CHECK ((char_length((matricula)::text) <= 30)),
    CONSTRAINT docente_requisitos_nome_check CHECK ((char_length((nome)::text) <= 100)),
    CONSTRAINT docente_requisitos_nome_usuario_check CHECK ((char_length((nome_usuario)::text) <= 40)),
    CONSTRAINT docente_requisitos_origem_solicitacao_check CHECK ((origem_solicitacao = ANY (ARRAY['cadastro'::text, 'configuracoes'::text]))),
    CONSTRAINT docente_requisitos_tipo_solicitado_check CHECK ((tipo_solicitado = ANY (ARRAY['docente'::text, 'servidor'::text, 'discente'::text]))),
    CONSTRAINT docente_requisitos_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 272 (class 1259 OID 18862)
-- Name: docente_requisitos_id_requisito_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.docente_requisitos ALTER COLUMN id_requisito ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.docente_requisitos_id_requisito_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 260 (class 1259 OID 18728)
-- Name: documento_armazenamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_armazenamento (
    id smallint NOT NULL
);



--
-- TOC entry 259 (class 1259 OID 18693)
-- Name: documento_itens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_itens (
    id_item integer NOT NULL,
    id_usuario integer NOT NULL,
    id_pasta integer,
    titulo public.citext NOT NULL,
    descricao public.citext,
    autor_obra public.citext,
    visibilidade text DEFAULT 'privado'::text NOT NULL,
    revisao text DEFAULT 'nenhuma'::text NOT NULL,
    versao_revisao bigint DEFAULT 0 NOT NULL,
    motivo_revisao public.citext,
    enviado_em timestamp without time zone,
    revisado_em timestamp without time zone,
    revisado_por integer,
    tipo text NOT NULL,
    url public.citext,
    nome_arquivo public.citext,
    mime public.citext,
    tamanho bigint DEFAULT 0 NOT NULL,
    conteudo bytea,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT documento_itens_autor_obra_check CHECK ((char_length((autor_obra)::text) <= 500)),
    CONSTRAINT documento_itens_descricao_check CHECK ((char_length((descricao)::text) <= 3000)),
    CONSTRAINT documento_itens_mime_check CHECK ((char_length((mime)::text) <= 50)),
    CONSTRAINT documento_itens_motivo_revisao_check CHECK ((char_length((motivo_revisao)::text) <= 1000)),
    CONSTRAINT documento_itens_nome_arquivo_check CHECK ((char_length((nome_arquivo)::text) <= 150)),
    CONSTRAINT documento_itens_revisao_check CHECK ((revisao = ANY (ARRAY['nenhuma'::text, 'pendente'::text, 'aprovado'::text, 'recusado'::text]))),
    CONSTRAINT documento_itens_tamanho_check CHECK ((tamanho >= 0)),
    CONSTRAINT documento_itens_tipo_check CHECK ((tipo = ANY (ARRAY['link'::text, 'arquivo'::text]))),
    CONSTRAINT documento_itens_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT documento_itens_url_check CHECK ((char_length((url)::text) <= 2000)),
    CONSTRAINT documento_itens_versao_revisao_check CHECK ((versao_revisao >= 0)),
    CONSTRAINT documento_itens_visibilidade_check CHECK ((visibilidade = ANY (ARRAY['privado'::text, 'publico'::text, 'campus'::text, 'comunidade'::text])))
);



--
-- TOC entry 258 (class 1259 OID 18692)
-- Name: documento_itens_id_item_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documento_itens ALTER COLUMN id_item ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.documento_itens_id_item_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 257 (class 1259 OID 18675)
-- Name: documento_pastas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_pastas (
    id_pasta integer NOT NULL,
    id_usuario integer NOT NULL,
    nome public.citext NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT documento_pastas_nome_check CHECK ((char_length((nome)::text) <= 100))
);



--
-- TOC entry 256 (class 1259 OID 18674)
-- Name: documento_pastas_id_pasta_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documento_pastas ALTER COLUMN id_pasta ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.documento_pastas_id_pasta_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 262 (class 1259 OID 18735)
-- Name: documento_salvos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documento_salvos (
    id_salvo integer NOT NULL,
    id_usuario integer NOT NULL,
    id_item integer,
    id_pasta integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 261 (class 1259 OID 18734)
-- Name: documento_salvos_id_salvo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documento_salvos ALTER COLUMN id_salvo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.documento_salvos_id_salvo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 244 (class 1259 OID 18486)
-- Name: documentos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.documentos (
    id_documento integer NOT NULL,
    id_usuario integer NOT NULL,
    id_responsavel integer,
    titulo public.citext NOT NULL,
    motivo text,
    descricao text,
    protocolo public.citext,
    tipo text DEFAULT 'requerimento'::text NOT NULL,
    status text DEFAULT 'solicitado'::text NOT NULL,
    observacao public.citext,
    previsao date,
    data_emissao date,
    arquivo public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT documentos_arquivo_check CHECK ((char_length((arquivo)::text) <= 255)),
    CONSTRAINT documentos_observacao_check CHECK ((char_length((observacao)::text) <= 255)),
    CONSTRAINT documentos_protocolo_check CHECK ((char_length((protocolo)::text) <= 20)),
    CONSTRAINT documentos_status_check CHECK ((status = ANY (ARRAY['solicitado'::text, 'em_analise'::text, 'pendente'::text, 'pronto'::text]))),
    CONSTRAINT documentos_tipo_check CHECK ((tipo = ANY (ARRAY['pdf'::text, 'requerimento'::text, 'assinatura'::text]))),
    CONSTRAINT documentos_titulo_check CHECK ((char_length((titulo)::text) <= 150))
);



--
-- TOC entry 243 (class 1259 OID 18485)
-- Name: documentos_id_documento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.documentos ALTER COLUMN id_documento ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.documentos_id_documento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 235 (class 1259 OID 18375)
-- Name: email_estado; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_estado (
    tipo text NOT NULL,
    identidade integer NOT NULL,
    email public.citext NOT NULL,
    regime text NOT NULL,
    confirmado_em timestamp without time zone,
    CONSTRAINT email_estado_email_check CHECK ((char_length((email)::text) <= 150)),
    CONSTRAINT email_estado_regime_check CHECK ((regime = ANY (ARRAY['novo'::text, 'legado'::text]))),
    CONSTRAINT email_estado_tipo_check CHECK ((tipo = ANY (ARRAY['users'::text, 'external'::text])))
);



--
-- TOC entry 237 (class 1259 OID 18390)
-- Name: email_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_tokens (
    id_token_email bigint NOT NULL,
    tipo text NOT NULL,
    identidade integer NOT NULL,
    email_destino public.citext NOT NULL,
    email_anterior public.citext NOT NULL,
    finalidade text NOT NULL,
    token_hash character(64) NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    usado_em timestamp without time zone,
    CONSTRAINT email_tokens_email_anterior_check CHECK ((char_length((email_anterior)::text) <= 150)),
    CONSTRAINT email_tokens_email_destino_check CHECK ((char_length((email_destino)::text) <= 150)),
    CONSTRAINT email_tokens_finalidade_check CHECK ((finalidade = ANY (ARRAY['cadastro'::text, 'troca'::text]))),
    CONSTRAINT email_tokens_id_token_email_check CHECK ((id_token_email >= 0)),
    CONSTRAINT email_tokens_tipo_check CHECK ((tipo = ANY (ARRAY['users'::text, 'external'::text]))),
    CONSTRAINT email_tokens_token_hash_check CHECK ((char_length(token_hash) <= 64))
);



--
-- TOC entry 236 (class 1259 OID 18389)
-- Name: email_tokens_id_token_email_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.email_tokens ALTER COLUMN id_token_email ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.email_tokens_id_token_email_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 295 (class 1259 OID 19121)
-- Name: google_export_destinos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_export_destinos (
    titular_tipo text NOT NULL,
    titular_id integer NOT NULL,
    google_sub character varying(255) NOT NULL,
    calendar_id public.citext,
    tasklist_id public.citext,
    reserva public.citext,
    reserva_ate timestamp without time zone,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT google_export_destinos_calendar_id_check CHECK ((char_length((calendar_id)::text) <= 1024)),
    CONSTRAINT google_export_destinos_google_sub_check CHECK ((char_length((google_sub)::text) <= 255)),
    CONSTRAINT google_export_destinos_reserva_check CHECK ((char_length((reserva)::text) <= 48)),
    CONSTRAINT google_export_destinos_tasklist_id_check CHECK ((char_length((tasklist_id)::text) <= 1024)),
    CONSTRAINT google_export_destinos_titular_tipo_check CHECK ((titular_tipo = ANY (ARRAY['users'::text, 'external'::text])))
);



--
-- TOC entry 230 (class 1259 OID 18326)
-- Name: google_identidades; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.google_identidades (
    google_sub character varying(255) NOT NULL,
    id_usuario integer,
    id_externo integer,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_google_identidade CHECK (((id_usuario IS NOT NULL) <> (id_externo IS NOT NULL))),
    CONSTRAINT google_identidades_google_sub_check CHECK ((char_length((google_sub)::text) <= 255))
);



--
-- TOC entry 280 (class 1259 OID 18958)
-- Name: inscricoes_editais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inscricoes_editais (
    id_inscricao integer NOT NULL,
    id_aviso integer NOT NULL,
    id_usuario integer NOT NULL,
    status text DEFAULT 'inscrito'::text,
    motivo text,
    anexo_url public.citext,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT inscricoes_editais_anexo_url_check CHECK ((char_length((anexo_url)::text) <= 500)),
    CONSTRAINT inscricoes_editais_status_check CHECK ((status = ANY (ARRAY['inscrito'::text, 'em_analise'::text, 'deferido'::text, 'indeferido'::text, 'aprovado'::text])))
);



--
-- TOC entry 279 (class 1259 OID 18957)
-- Name: inscricoes_editais_id_inscricao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.inscricoes_editais ALTER COLUMN id_inscricao ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.inscricoes_editais_id_inscricao_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 278 (class 1259 OID 18939)
-- Name: lembrete_envios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lembrete_envios (
    id_lembrete integer NOT NULL,
    versao bigint NOT NULL,
    estado text DEFAULT 'reservado'::text NOT NULL,
    reservado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    finalizado_em timestamp without time zone,
    tentativas smallint DEFAULT 1 NOT NULL,
    proxima_tentativa_utc timestamp without time zone,
    CONSTRAINT lembrete_envios_estado_check CHECK ((estado = ANY (ARRAY['reservado'::text, 'enviado'::text, 'falhou'::text, 'cancelado'::text, 'aguardando'::text, 'enviando'::text]))),
    CONSTRAINT lembrete_envios_tentativas_check CHECK ((tentativas >= 0)),
    CONSTRAINT lembrete_envios_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 253 (class 1259 OID 18621)
-- Name: lembretes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lembretes (
    id_tarefa integer,
    agendado_utc timestamp without time zone,
    fuso_horario public.citext DEFAULT 'America/Fortaleza'::public.citext NOT NULL,
    enviar_email smallint DEFAULT 0 NOT NULL,
    versao bigint DEFAULT 1 NOT NULL,
    id_lembrete integer NOT NULL,
    id_usuario integer,
    id_evento integer,
    titulo public.citext NOT NULL,
    descricao text,
    tipo text DEFAULT 'prazo'::text NOT NULL,
    data_lembrete timestamp without time zone NOT NULL,
    ativo smallint DEFAULT 1 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    id_externo integer,
    id_evento_externo integer,
    contexto text DEFAULT 'avulso'::text NOT NULL,
    CONSTRAINT chk_lembrete_titular CHECK (((id_usuario IS NULL) <> (id_externo IS NULL))),
    CONSTRAINT lembretes_ativo_check CHECK ((ativo = ANY (ARRAY[0, 1]))),
    CONSTRAINT lembretes_contexto_check CHECK ((contexto = ANY (ARRAY['avulso'::text, 'tarefa'::text, 'calendario'::text, 'agenda_externa'::text]))),
    CONSTRAINT lembretes_enviar_email_check CHECK ((enviar_email = ANY (ARRAY[0, 1]))),
    CONSTRAINT lembretes_fuso_horario_check CHECK ((char_length((fuso_horario)::text) <= 64)),
    CONSTRAINT lembretes_tipo_check CHECK ((tipo = ANY (ARRAY['prazo'::text, 'evento'::text]))),
    CONSTRAINT lembretes_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT lembretes_versao_check CHECK ((versao >= 0))
);



--
-- TOC entry 252 (class 1259 OID 18620)
-- Name: lembretes_id_lembrete_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.lembretes ALTER COLUMN id_lembrete ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.lembretes_id_lembrete_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 255 (class 1259 OID 18654)
-- Name: links_uteis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.links_uteis (
    id_link integer NOT NULL,
    id_usuario integer,
    titulo public.citext NOT NULL,
    descricao public.citext,
    url public.citext NOT NULL,
    categoria public.citext DEFAULT 'Institucional'::public.citext NOT NULL,
    ordem integer DEFAULT 0 NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT links_uteis_categoria_check CHECK ((char_length((categoria)::text) <= 50)),
    CONSTRAINT links_uteis_descricao_check CHECK ((char_length((descricao)::text) <= 255)),
    CONSTRAINT links_uteis_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT links_uteis_url_check CHECK ((char_length((url)::text) <= 500))
);



--
-- TOC entry 254 (class 1259 OID 18653)
-- Name: links_uteis_id_link_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.links_uteis ALTER COLUMN id_link ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.links_uteis_id_link_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 227 (class 1259 OID 18273)
-- Name: perfil_compartilhamento; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.perfil_compartilhamento (
    id_compartilhamento integer NOT NULL,
    id_usuario integer,
    id_externo integer,
    contato_email public.citext DEFAULT ''::public.citext NOT NULL,
    contato_handle public.citext DEFAULT ''::public.citext NOT NULL,
    contato_telefone public.citext DEFAULT ''::public.citext NOT NULL,
    mostrar_email smallint DEFAULT 0 NOT NULL,
    mostrar_handle smallint DEFAULT 0 NOT NULL,
    mostrar_telefone smallint DEFAULT 0 NOT NULL,
    mostrar_foto smallint DEFAULT 0 NOT NULL,
    foto text,
    CONSTRAINT chk_compartilhamento_conta CHECK (((id_usuario IS NULL) <> (id_externo IS NULL))),
    CONSTRAINT perfil_compartilhamento_contato_email_check CHECK ((char_length((contato_email)::text) <= 150)),
    CONSTRAINT perfil_compartilhamento_contato_handle_check CHECK ((char_length((contato_handle)::text) <= 100)),
    CONSTRAINT perfil_compartilhamento_contato_telefone_check CHECK ((char_length((contato_telefone)::text) <= 30)),
    CONSTRAINT perfil_compartilhamento_mostrar_email_check CHECK ((mostrar_email = ANY (ARRAY[0, 1]))),
    CONSTRAINT perfil_compartilhamento_mostrar_foto_check CHECK ((mostrar_foto = ANY (ARRAY[0, 1]))),
    CONSTRAINT perfil_compartilhamento_mostrar_handle_check CHECK ((mostrar_handle = ANY (ARRAY[0, 1]))),
    CONSTRAINT perfil_compartilhamento_mostrar_telefone_check CHECK ((mostrar_telefone = ANY (ARRAY[0, 1])))
);



--
-- TOC entry 226 (class 1259 OID 18272)
-- Name: perfil_compartilhamento_id_compartilhamento_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.perfil_compartilhamento ALTER COLUMN id_compartilhamento ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.perfil_compartilhamento_id_compartilhamento_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 277 (class 1259 OID 18930)
-- Name: preferencias_notificacao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.preferencias_notificacao (
    id_usuario integer NOT NULL,
    email_lembretes smallint DEFAULT 0 NOT NULL,
    consentido_em timestamp without time zone,
    CONSTRAINT preferencias_notificacao_email_lembretes_check CHECK ((email_lembretes = ANY (ARRAY[0, 1])))
);



--
-- TOC entry 249 (class 1259 OID 18585)
-- Name: projeto_inscricoes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projeto_inscricoes (
    id_projeto integer NOT NULL,
    id_usuario integer NOT NULL,
    status text DEFAULT 'inscrito'::text NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projeto_inscricoes_status_check CHECK ((status = ANY (ARRAY['inscrito'::text, 'aprovado'::text, 'recusado'::text, 'cancelado'::text])))
);



--
-- TOC entry 274 (class 1259 OID 18906)
-- Name: projeto_inscricoes_externas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projeto_inscricoes_externas (
    id_projeto integer NOT NULL,
    id_externo integer NOT NULL,
    status text DEFAULT 'inscrito'::text NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projeto_inscricoes_externas_status_check CHECK ((status = ANY (ARRAY['inscrito'::text, 'aprovado'::text, 'recusado'::text, 'cancelado'::text])))
);



--
-- TOC entry 248 (class 1259 OID 18542)
-- Name: projetos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.projetos (
    fixado smallint DEFAULT 0 NOT NULL,
    visibilidade text DEFAULT 'privado'::text NOT NULL,
    permite_externos smallint DEFAULT 0 NOT NULL,
    id_projeto integer NOT NULL,
    id_usuario integer,
    titulo public.citext NOT NULL,
    descricao text NOT NULL,
    capa text,
    eixo text DEFAULT 'pesquisa'::text NOT NULL,
    responsavel_nome public.citext,
    rotulo_responsavel public.citext DEFAULT 'Coordenação'::public.citext NOT NULL,
    vagas bigint DEFAULT 0 NOT NULL,
    unidade_vaga public.citext DEFAULT 'vagas'::public.citext NOT NULL,
    link public.citext,
    situacao text DEFAULT 'ativo'::text NOT NULL,
    aprovacao text DEFAULT 'pendente'::text NOT NULL,
    aprovado_por integer,
    data_inicio date,
    data_fim date,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT projetos_aprovacao_check CHECK ((aprovacao = ANY (ARRAY['pendente'::text, 'aprovado'::text, 'recusado'::text]))),
    CONSTRAINT projetos_eixo_check CHECK ((eixo = ANY (ARRAY['pesquisa'::text, 'extensao'::text, 'ensino'::text, 'inovacao'::text]))),
    CONSTRAINT projetos_fixado_check CHECK ((fixado = ANY (ARRAY[0, 1]))),
    CONSTRAINT projetos_link_check CHECK ((char_length((link)::text) <= 500)),
    CONSTRAINT projetos_responsavel_nome_check CHECK ((char_length((responsavel_nome)::text) <= 100)),
    CONSTRAINT projetos_rotulo_responsavel_check CHECK ((char_length((rotulo_responsavel)::text) <= 20)),
    CONSTRAINT projetos_situacao_check CHECK ((situacao = ANY (ARRAY['ativo'::text, 'inscricoes'::text, 'em_selecao'::text, 'em_andamento'::text, 'encerrado'::text]))),
    CONSTRAINT projetos_titulo_check CHECK ((char_length((titulo)::text) <= 150)),
    CONSTRAINT projetos_unidade_vaga_check CHECK ((char_length((unidade_vaga)::text) <= 20)),
    CONSTRAINT projetos_vagas_check CHECK ((vagas >= 0)),
    CONSTRAINT projetos_visibilidade_check CHECK ((visibilidade = ANY (ARRAY['privado'::text, 'publico'::text])))
);



--
-- TOC entry 247 (class 1259 OID 18541)
-- Name: projetos_id_projeto_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.projetos ALTER COLUMN id_projeto ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.projetos_id_projeto_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 225 (class 1259 OID 18241)
-- Name: publico_externo; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.publico_externo (
    id_externo integer NOT NULL,
    nome public.citext NOT NULL,
    email public.citext NOT NULL,
    telefone public.citext,
    senha public.citext NOT NULL,
    organizacao public.citext,
    situacao text DEFAULT 'ativo'::text NOT NULL,
    ultimo_acesso timestamp without time zone,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    email_lembretes smallint DEFAULT 0 NOT NULL,
    consentimento_lembretes_em timestamp without time zone,
    intencao_cadastro text DEFAULT 'externo'::text NOT NULL,
    CONSTRAINT publico_externo_email_check CHECK ((char_length((email)::text) <= 150)),
    CONSTRAINT publico_externo_email_lembretes_check CHECK ((email_lembretes = ANY (ARRAY[0, 1]))),
    CONSTRAINT publico_externo_intencao_cadastro_check CHECK ((intencao_cadastro = ANY (ARRAY['externo'::text, 'docente'::text, 'servidor'::text, 'discente'::text]))),
    CONSTRAINT publico_externo_nome_check CHECK ((char_length((nome)::text) <= 100)),
    CONSTRAINT publico_externo_organizacao_check CHECK ((char_length((organizacao)::text) <= 120)),
    CONSTRAINT publico_externo_senha_check CHECK ((char_length((senha)::text) <= 255)),
    CONSTRAINT publico_externo_situacao_check CHECK ((situacao = ANY (ARRAY['ativo'::text, 'bloqueado'::text]))),
    CONSTRAINT publico_externo_telefone_check CHECK ((char_length((telefone)::text) <= 20))
);



--
-- TOC entry 224 (class 1259 OID 18240)
-- Name: publico_externo_id_externo_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.publico_externo ALTER COLUMN id_externo ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.publico_externo_id_externo_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 232 (class 1259 OID 18341)
-- Name: recuperacao_senha; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recuperacao_senha (
    id_recuperacao integer NOT NULL,
    id_usuario integer,
    id_externo integer,
    token_hash public.citext NOT NULL,
    expiracao timestamp without time zone NOT NULL,
    usado_em timestamp without time zone,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT recuperacao_senha_token_hash_check CHECK ((char_length((token_hash)::text) <= 64))
);



--
-- TOC entry 231 (class 1259 OID 18340)
-- Name: recuperacao_senha_id_recuperacao_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.recuperacao_senha ALTER COLUMN id_recuperacao ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.recuperacao_senha_id_recuperacao_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 234 (class 1259 OID 18369)
-- Name: seguranca_email_lock; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguranca_email_lock (
    chave smallint NOT NULL
);



--
-- TOC entry 233 (class 1259 OID 18356)
-- Name: seguranca_limites; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.seguranca_limites (
    chave character(64) NOT NULL,
    janela bigint NOT NULL,
    tentativas bigint DEFAULT 0 NOT NULL,
    expira_em timestamp without time zone NOT NULL,
    CONSTRAINT seguranca_limites_chave_check CHECK ((char_length(chave) <= 64)),
    CONSTRAINT seguranca_limites_janela_check CHECK ((janela >= 0)),
    CONSTRAINT seguranca_limites_tentativas_check CHECK ((tentativas >= 0))
);



--
-- TOC entry 304 (class 1259 OID 19232)
-- Name: tarefa_arquivos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarefa_arquivos (
    id_tarefa integer NOT NULL,
    arquivada_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);



--
-- TOC entry 242 (class 1259 OID 18460)
-- Name: tarefas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tarefas (
    id_tarefa integer NOT NULL,
    id_usuario integer,
    id_externo integer,
    titulo public.citext NOT NULL,
    categoria public.citext DEFAULT 'Acadêmico'::public.citext NOT NULL,
    responsavel public.citext,
    data_entrega date,
    prioridade text DEFAULT 'media'::text NOT NULL,
    status text DEFAULT 'aberta'::text NOT NULL,
    observacao text,
    concluida_em date,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_tarefa_titular CHECK (((id_usuario IS NULL) <> (id_externo IS NULL))),
    CONSTRAINT tarefas_categoria_check CHECK ((char_length((categoria)::text) <= 40)),
    CONSTRAINT tarefas_prioridade_check CHECK ((prioridade = ANY (ARRAY['baixa'::text, 'media'::text, 'alta'::text]))),
    CONSTRAINT tarefas_responsavel_check CHECK ((char_length((responsavel)::text) <= 100)),
    CONSTRAINT tarefas_status_check CHECK ((status = ANY (ARRAY['aberta'::text, 'em_andamento'::text, 'concluida'::text]))),
    CONSTRAINT tarefas_titulo_check CHECK ((char_length((titulo)::text) <= 150))
);



--
-- TOC entry 241 (class 1259 OID 18459)
-- Name: tarefas_id_tarefa_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tarefas ALTER COLUMN id_tarefa ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tarefas_id_tarefa_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 229 (class 1259 OID 18308)
-- Name: tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tokens (
    id_token integer NOT NULL,
    id_usuario integer,
    id_externo integer,
    token public.citext NOT NULL,
    dispositivo public.citext DEFAULT 'Navegador Web'::public.citext,
    ip public.citext,
    ultimo_acesso timestamp without time zone,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    expiracao timestamp without time zone NOT NULL,
    CONSTRAINT tokens_dispositivo_check CHECK ((char_length((dispositivo)::text) <= 150)),
    CONSTRAINT tokens_ip_check CHECK ((char_length((ip)::text) <= 45)),
    CONSTRAINT tokens_token_check CHECK ((char_length((token)::text) <= 255))
);



--
-- TOC entry 228 (class 1259 OID 18307)
-- Name: tokens_id_token_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.tokens ALTER COLUMN id_token ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.tokens_id_token_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 223 (class 1259 OID 18203)
-- Name: usuarios; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usuarios (
    id_externo_origem integer,
    id_usuario integer NOT NULL,
    nome public.citext NOT NULL,
    nome_social public.citext,
    email public.citext NOT NULL,
    telefone public.citext,
    senha public.citext NOT NULL,
    tipo_usuario text NOT NULL,
    matricula public.citext,
    id_curso integer,
    periodo smallint,
    setor public.citext,
    sobre text,
    foto text,
    preferencias jsonb,
    is_admin smallint DEFAULT 0 NOT NULL,
    situacao text DEFAULT 'ativo'::text NOT NULL,
    ultimo_acesso timestamp without time zone,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    atualizado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT usuarios_email_check CHECK ((char_length((email)::text) <= 150)),
    CONSTRAINT usuarios_is_admin_check CHECK ((is_admin = ANY (ARRAY[0, 1]))),
    CONSTRAINT usuarios_matricula_check CHECK ((char_length((matricula)::text) <= 30)),
    CONSTRAINT usuarios_nome_check CHECK ((char_length((nome)::text) <= 100)),
    CONSTRAINT usuarios_nome_social_check CHECK ((char_length((nome_social)::text) <= 100)),
    CONSTRAINT usuarios_periodo_check CHECK ((periodo >= 0)),
    CONSTRAINT usuarios_senha_check CHECK ((char_length((senha)::text) <= 255)),
    CONSTRAINT usuarios_setor_check CHECK ((char_length((setor)::text) <= 100)),
    CONSTRAINT usuarios_situacao_check CHECK ((situacao = ANY (ARRAY['ativo'::text, 'pendente'::text, 'bloqueado'::text]))),
    CONSTRAINT usuarios_telefone_check CHECK ((char_length((telefone)::text) <= 20)),
    CONSTRAINT usuarios_tipo_usuario_check CHECK ((tipo_usuario = ANY (ARRAY['discente'::text, 'docente'::text, 'servidor'::text])))
);



--
-- TOC entry 222 (class 1259 OID 18202)
-- Name: usuarios_id_usuario_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.usuarios ALTER COLUMN id_usuario ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.usuarios_id_usuario_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 284 (class 1259 OID 18997)
-- Name: vinculo_auditoria; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vinculo_auditoria (
    id_auditoria integer NOT NULL,
    id_requisito integer,
    id_externo integer,
    id_admin integer,
    acao public.citext NOT NULL,
    motivo public.citext NOT NULL,
    criado_em timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT vinculo_auditoria_acao_check CHECK ((char_length((acao)::text) <= 30)),
    CONSTRAINT vinculo_auditoria_motivo_check CHECK ((char_length((motivo)::text) <= 1000))
);



--
-- TOC entry 283 (class 1259 OID 18996)
-- Name: vinculo_auditoria_id_auditoria_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.vinculo_auditoria ALTER COLUMN id_auditoria ADD GENERATED BY DEFAULT AS IDENTITY (
    SEQUENCE NAME public.vinculo_auditoria_id_auditoria_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);



--
-- TOC entry 307 (class 1259 OID 19721)
-- Name: vw_criados_recentemente; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_criados_recentemente AS
 SELECT 'projeto'::text AS origem,
    projetos.id_projeto AS id_origem,
    projetos.titulo,
    projetos.criado_em,
    NULL::integer AS id_usuario
   FROM public.projetos
  WHERE ((projetos.aprovacao = 'aprovado'::text) AND (projetos.visibilidade = 'publico'::text))
UNION ALL
 SELECT 'aviso'::text AS origem,
    avisos.id_aviso AS id_origem,
    avisos.titulo,
    avisos.criado_em,
    NULL::integer AS id_usuario
   FROM public.avisos
  WHERE (avisos.situacao = 'publicado'::text)
UNION ALL
 SELECT 'calendario'::text AS origem,
    calendario.id_evento AS id_origem,
    calendario.titulo,
    calendario.criado_em,
    NULL::integer AS id_usuario
   FROM public.calendario
  WHERE ((calendario.oculto = 0) AND (calendario.visibilidade = 'publico'::text))
UNION ALL
 SELECT 'documento'::text AS origem,
    documentos.id_documento AS id_origem,
    documentos.titulo,
    documentos.criado_em,
    documentos.id_usuario
   FROM public.documentos;



--
-- TOC entry 305 (class 1259 OID 19711)
-- Name: vw_pessoas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_pessoas AS
 SELECT u.id_usuario,
    u.nome,
    u.nome_social,
    u.tipo_usuario,
    COALESCE(c.nome, u.setor) AS curso_ou_setor,
    u.periodo,
    u.email
   FROM (public.usuarios u
     LEFT JOIN public.cursos c ON ((c.id_curso = u.id_curso)))
  WHERE (u.situacao = 'ativo'::text);



--
-- TOC entry 306 (class 1259 OID 19716)
-- Name: vw_proximas_datas; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.vw_proximas_datas AS
 SELECT 'calendario'::text AS origem,
    calendario.id_evento AS id_origem,
    calendario.titulo,
    calendario.data_evento AS data,
    calendario.categoria AS rotulo,
    NULL::integer AS id_usuario
   FROM public.calendario
  WHERE ((calendario.oculto = 0) AND (calendario.visibilidade = 'publico'::text))
UNION ALL
 SELECT 'aviso'::text AS origem,
    avisos.id_aviso AS id_origem,
    avisos.titulo,
    COALESCE(avisos.data_evento, avisos.data_prazo) AS data,
    avisos.categoria AS rotulo,
    NULL::integer AS id_usuario
   FROM public.avisos
  WHERE ((avisos.situacao = 'publicado'::text) AND (COALESCE(avisos.data_evento, avisos.data_prazo) IS NOT NULL))
UNION ALL
 SELECT 'tarefa'::text AS origem,
    tarefas.id_tarefa AS id_origem,
    tarefas.titulo,
    tarefas.data_entrega AS data,
    tarefas.status AS rotulo,
    tarefas.id_usuario
   FROM public.tarefas
  WHERE ((tarefas.status <> 'concluida'::text) AND (tarefas.data_entrega IS NOT NULL))
UNION ALL
 SELECT 'documento'::text AS origem,
    documentos.id_documento AS id_origem,
    documentos.titulo,
    COALESCE(documentos.previsao, documentos.data_emissao) AS data,
    documentos.status AS rotulo,
    documentos.id_usuario
   FROM public.documentos
  WHERE (COALESCE(documentos.previsao, documentos.data_emissao) IS NOT NULL);



--
-- TOC entry 5724 (class 2606 OID 19161)
-- Name: academico_catalogo_disciplinas academico_catalogo_disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_catalogo_disciplinas
    ADD CONSTRAINT academico_catalogo_disciplinas_pkey PRIMARY KEY (id_catalogo);



--
-- TOC entry 5665 (class 2606 OID 18835)
-- Name: academico_convites academico_convites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_convites
    ADD CONSTRAINT academico_convites_pkey PRIMARY KEY (id_convite);



--
-- TOC entry 5658 (class 2606 OID 18804)
-- Name: academico_disciplinas academico_disciplinas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_disciplinas
    ADD CONSTRAINT academico_disciplinas_pkey PRIMARY KEY (id_disciplina);



--
-- TOC entry 5739 (class 2606 OID 19231)
-- Name: academico_gestao_historico academico_gestao_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_gestao_historico
    ADD CONSTRAINT academico_gestao_historico_pkey PRIMARY KEY (id_registro);



--
-- TOC entry 5712 (class 2606 OID 19071)
-- Name: academico_horario_excecoes academico_horario_excecoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horario_excecoes
    ADD CONSTRAINT academico_horario_excecoes_pkey PRIMARY KEY (id_horario, data);



--
-- TOC entry 5710 (class 2606 OID 19053)
-- Name: academico_horarios academico_horarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horarios
    ADD CONSTRAINT academico_horarios_pkey PRIMARY KEY (id_horario);



--
-- TOC entry 5662 (class 2606 OID 18817)
-- Name: academico_matriculas academico_matriculas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_matriculas
    ADD CONSTRAINT academico_matriculas_pkey PRIMARY KEY (id_disciplina, id_aluno);



--
-- TOC entry 5728 (class 2606 OID 19170)
-- Name: academico_oferta_catalogo academico_oferta_catalogo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_oferta_catalogo
    ADD CONSTRAINT academico_oferta_catalogo_pkey PRIMARY KEY (id_disciplina);



--
-- TOC entry 5734 (class 2606 OID 19210)
-- Name: academico_pedidos_ingresso academico_pedidos_ingresso_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_pedidos_ingresso
    ADD CONSTRAINT academico_pedidos_ingresso_pkey PRIMARY KEY (id_pedido);



--
-- TOC entry 5670 (class 2606 OID 18861)
-- Name: academico_publicacoes academico_publicacoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_publicacoes
    ADD CONSTRAINT academico_publicacoes_pkey PRIMARY KEY (id_publicacao);



--
-- TOC entry 5683 (class 2606 OID 18929)
-- Name: academico_saidas_professor academico_saidas_professor_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_saidas_professor
    ADD CONSTRAINT academico_saidas_professor_pkey PRIMARY KEY (id_saida);



--
-- TOC entry 5707 (class 2606 OID 19027)
-- Name: academico_salas_historico academico_salas_historico_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_salas_historico
    ADD CONSTRAINT academico_salas_historico_pkey PRIMARY KEY (id_alteracao);



--
-- TOC entry 5652 (class 2606 OID 18774)
-- Name: academico_turmas academico_turmas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT academico_turmas_pkey PRIMARY KEY (id_turma);



--
-- TOC entry 5730 (class 2606 OID 19187)
-- Name: academico_vinculos_turma academico_vinculos_turma_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_vinculos_turma
    ADD CONSTRAINT academico_vinculos_turma_pkey PRIMARY KEY (id_turma, id_aluno);



--
-- TOC entry 5628 (class 2606 OID 18619)
-- Name: agenda_externa agenda_externa_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_externa
    ADD CONSTRAINT agenda_externa_pkey PRIMARY KEY (id_evento);



--
-- TOC entry 5700 (class 2606 OID 18995)
-- Name: agenda_vinculos agenda_vinculos_id_evento_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_vinculos
    ADD CONSTRAINT agenda_vinculos_id_evento_key UNIQUE (id_evento);



--
-- TOC entry 5702 (class 2606 OID 18993)
-- Name: agenda_vinculos agenda_vinculos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_vinculos
    ADD CONSTRAINT agenda_vinculos_pkey PRIMARY KEY (id_evento_externo);



--
-- TOC entry 5743 (class 2606 OID 19737)
-- Name: arcadia_postgres_baselines arcadia_postgres_baselines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arcadia_postgres_baselines
    ADD CONSTRAINT arcadia_postgres_baselines_pkey PRIMARY KEY (versao);



--
-- TOC entry 5714 (class 2606 OID 19084)
-- Name: arcadia_schema_migrations arcadia_schema_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.arcadia_schema_migrations
    ADD CONSTRAINT arcadia_schema_migrations_pkey PRIMARY KEY (versao);



--
-- TOC entry 5605 (class 2606 OID 18458)
-- Name: avisos_lidos avisos_lidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_lidos
    ADD CONSTRAINT avisos_lidos_pkey PRIMARY KEY (id_aviso, id_usuario);



--
-- TOC entry 5603 (class 2606 OID 18449)
-- Name: avisos avisos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_pkey PRIMARY KEY (id_aviso);



--
-- TOC entry 5717 (class 2606 OID 19098)
-- Name: cadastro_auditoria cadastro_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadastro_auditoria
    ADD CONSTRAINT cadastro_auditoria_pkey PRIMARY KEY (id_auditoria);



--
-- TOC entry 5620 (class 2606 OID 18540)
-- Name: calendario calendario_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendario
    ADD CONSTRAINT calendario_pkey PRIMARY KEY (id_evento);



--
-- TOC entry 5720 (class 2606 OID 19120)
-- Name: conta_nome_pedidos conta_nome_pedidos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_nome_pedidos
    ADD CONSTRAINT conta_nome_pedidos_pkey PRIMARY KEY (id_pedido);



--
-- TOC entry 5694 (class 2606 OID 18986)
-- Name: conta_vinculos conta_vinculos_id_requisito_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_id_requisito_key UNIQUE (id_requisito);



--
-- TOC entry 5696 (class 2606 OID 18984)
-- Name: conta_vinculos conta_vinculos_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_id_usuario_key UNIQUE (id_usuario);



--
-- TOC entry 5698 (class 2606 OID 18982)
-- Name: conta_vinculos conta_vinculos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_pkey PRIMARY KEY (id_externo);



--
-- TOC entry 5546 (class 2606 OID 18201)
-- Name: cursos cursos_nome_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_nome_key UNIQUE (nome);



--
-- TOC entry 5548 (class 2606 OID 18199)
-- Name: cursos cursos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cursos
    ADD CONSTRAINT cursos_pkey PRIMARY KEY (id_curso);



--
-- TOC entry 5672 (class 2606 OID 18901)
-- Name: docente_requisitos docente_requisitos_id_externo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_id_externo_key UNIQUE (id_externo);



--
-- TOC entry 5674 (class 2606 OID 18903)
-- Name: docente_requisitos docente_requisitos_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_id_usuario_key UNIQUE (id_usuario);



--
-- TOC entry 5677 (class 2606 OID 18905)
-- Name: docente_requisitos docente_requisitos_nome_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_nome_usuario_key UNIQUE (nome_usuario);



--
-- TOC entry 5679 (class 2606 OID 18899)
-- Name: docente_requisitos docente_requisitos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_pkey PRIMARY KEY (id_requisito);



--
-- TOC entry 5646 (class 2606 OID 18733)
-- Name: documento_armazenamento documento_armazenamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_armazenamento
    ADD CONSTRAINT documento_armazenamento_pkey PRIMARY KEY (id);



--
-- TOC entry 5644 (class 2606 OID 18727)
-- Name: documento_itens documento_itens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_itens
    ADD CONSTRAINT documento_itens_pkey PRIMARY KEY (id_item);



--
-- TOC entry 5637 (class 2606 OID 18689)
-- Name: documento_pastas documento_pastas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_pastas
    ADD CONSTRAINT documento_pastas_pkey PRIMARY KEY (id_pasta);



--
-- TOC entry 5648 (class 2606 OID 18743)
-- Name: documento_salvos documento_salvos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_salvos
    ADD CONSTRAINT documento_salvos_pkey PRIMARY KEY (id_salvo);



--
-- TOC entry 5614 (class 2606 OID 18509)
-- Name: documentos documentos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_pkey PRIMARY KEY (id_documento);



--
-- TOC entry 5616 (class 2606 OID 18511)
-- Name: documentos documentos_protocolo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_protocolo_key UNIQUE (protocolo);



--
-- TOC entry 5592 (class 2606 OID 18388)
-- Name: email_estado email_estado_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_estado
    ADD CONSTRAINT email_estado_pkey PRIMARY KEY (tipo, identidade);



--
-- TOC entry 5596 (class 2606 OID 18410)
-- Name: email_tokens email_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tokens
    ADD CONSTRAINT email_tokens_pkey PRIMARY KEY (id_token_email);



--
-- TOC entry 5598 (class 2606 OID 18412)
-- Name: email_tokens email_tokens_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_tokens
    ADD CONSTRAINT email_tokens_token_hash_key UNIQUE (token_hash);



--
-- TOC entry 5722 (class 2606 OID 19137)
-- Name: google_export_destinos google_export_destinos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_export_destinos
    ADD CONSTRAINT google_export_destinos_pkey PRIMARY KEY (titular_tipo, titular_id, google_sub);



--
-- TOC entry 5577 (class 2606 OID 18339)
-- Name: google_identidades google_identidades_id_externo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_identidades
    ADD CONSTRAINT google_identidades_id_externo_key UNIQUE (id_externo);



--
-- TOC entry 5579 (class 2606 OID 18337)
-- Name: google_identidades google_identidades_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_identidades
    ADD CONSTRAINT google_identidades_id_usuario_key UNIQUE (id_usuario);



--
-- TOC entry 5581 (class 2606 OID 18335)
-- Name: google_identidades google_identidades_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_identidades
    ADD CONSTRAINT google_identidades_pkey PRIMARY KEY (google_sub);



--
-- TOC entry 5639 (class 2606 OID 18691)
-- Name: documento_pastas idx_doc_pasta_nome; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_pastas
    ADD CONSTRAINT idx_doc_pasta_nome UNIQUE (id_usuario, nome);



--
-- TOC entry 5650 (class 2606 OID 18745)
-- Name: documento_salvos idx_doc_salvo_dono_origem; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_salvos
    ADD CONSTRAINT idx_doc_salvo_dono_origem UNIQUE (id_usuario, id_item);



--
-- TOC entry 5690 (class 2606 OID 18971)
-- Name: inscricoes_editais inscricoes_editais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_editais
    ADD CONSTRAINT inscricoes_editais_pkey PRIMARY KEY (id_inscricao);



--
-- TOC entry 5688 (class 2606 OID 18956)
-- Name: lembrete_envios lembrete_envios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembrete_envios
    ADD CONSTRAINT lembrete_envios_pkey PRIMARY KEY (id_lembrete, versao);



--
-- TOC entry 5633 (class 2606 OID 18652)
-- Name: lembretes lembretes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_pkey PRIMARY KEY (id_lembrete);



--
-- TOC entry 5635 (class 2606 OID 18673)
-- Name: links_uteis links_uteis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links_uteis
    ADD CONSTRAINT links_uteis_pkey PRIMARY KEY (id_link);



--
-- TOC entry 5564 (class 2606 OID 18306)
-- Name: perfil_compartilhamento perfil_compartilhamento_id_externo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil_compartilhamento
    ADD CONSTRAINT perfil_compartilhamento_id_externo_key UNIQUE (id_externo);



--
-- TOC entry 5566 (class 2606 OID 18304)
-- Name: perfil_compartilhamento perfil_compartilhamento_id_usuario_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil_compartilhamento
    ADD CONSTRAINT perfil_compartilhamento_id_usuario_key UNIQUE (id_usuario);



--
-- TOC entry 5568 (class 2606 OID 18302)
-- Name: perfil_compartilhamento perfil_compartilhamento_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil_compartilhamento
    ADD CONSTRAINT perfil_compartilhamento_pkey PRIMARY KEY (id_compartilhamento);



--
-- TOC entry 5685 (class 2606 OID 18938)
-- Name: preferencias_notificacao preferencias_notificacao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferencias_notificacao
    ADD CONSTRAINT preferencias_notificacao_pkey PRIMARY KEY (id_usuario);



--
-- TOC entry 5681 (class 2606 OID 18919)
-- Name: projeto_inscricoes_externas projeto_inscricoes_externas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes_externas
    ADD CONSTRAINT projeto_inscricoes_externas_pkey PRIMARY KEY (id_projeto, id_externo);



--
-- TOC entry 5626 (class 2606 OID 18598)
-- Name: projeto_inscricoes projeto_inscricoes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes
    ADD CONSTRAINT projeto_inscricoes_pkey PRIMARY KEY (id_projeto, id_usuario);



--
-- TOC entry 5624 (class 2606 OID 18584)
-- Name: projetos projetos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_pkey PRIMARY KEY (id_projeto);



--
-- TOC entry 5560 (class 2606 OID 18271)
-- Name: publico_externo publico_externo_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publico_externo
    ADD CONSTRAINT publico_externo_email_key UNIQUE (email);



--
-- TOC entry 5562 (class 2606 OID 18269)
-- Name: publico_externo publico_externo_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.publico_externo
    ADD CONSTRAINT publico_externo_pkey PRIMARY KEY (id_externo);



--
-- TOC entry 5583 (class 2606 OID 18353)
-- Name: recuperacao_senha recuperacao_senha_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacao_senha
    ADD CONSTRAINT recuperacao_senha_pkey PRIMARY KEY (id_recuperacao);



--
-- TOC entry 5585 (class 2606 OID 18355)
-- Name: recuperacao_senha recuperacao_senha_token_hash_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacao_senha
    ADD CONSTRAINT recuperacao_senha_token_hash_key UNIQUE (token_hash);



--
-- TOC entry 5590 (class 2606 OID 18374)
-- Name: seguranca_email_lock seguranca_email_lock_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguranca_email_lock
    ADD CONSTRAINT seguranca_email_lock_pkey PRIMARY KEY (chave);



--
-- TOC entry 5588 (class 2606 OID 18368)
-- Name: seguranca_limites seguranca_limites_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.seguranca_limites
    ADD CONSTRAINT seguranca_limites_pkey PRIMARY KEY (chave);



--
-- TOC entry 5741 (class 2606 OID 19239)
-- Name: tarefa_arquivos tarefa_arquivos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarefa_arquivos
    ADD CONSTRAINT tarefa_arquivos_pkey PRIMARY KEY (id_tarefa);



--
-- TOC entry 5610 (class 2606 OID 18484)
-- Name: tarefas tarefas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarefas
    ADD CONSTRAINT tarefas_pkey PRIMARY KEY (id_tarefa);



--
-- TOC entry 5573 (class 2606 OID 18323)
-- Name: tokens tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_pkey PRIMARY KEY (id_token);



--
-- TOC entry 5575 (class 2606 OID 18325)
-- Name: tokens tokens_token_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_token_key UNIQUE (token);



--
-- TOC entry 5692 (class 2606 OID 18973)
-- Name: inscricoes_editais uq_aviso_usuario; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inscricoes_editais
    ADD CONSTRAINT uq_aviso_usuario UNIQUE (id_aviso, id_usuario);



--
-- TOC entry 5726 (class 2606 OID 19163)
-- Name: academico_catalogo_disciplinas uq_catalogo_nome; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_catalogo_disciplinas
    ADD CONSTRAINT uq_catalogo_nome UNIQUE (nome_chave);



--
-- TOC entry 5667 (class 2606 OID 18837)
-- Name: academico_convites uq_convite_destino; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_convites
    ADD CONSTRAINT uq_convite_destino UNIQUE (id_disciplina, email);



--
-- TOC entry 5660 (class 2606 OID 18806)
-- Name: academico_disciplinas uq_oferta_turma; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_disciplinas
    ADD CONSTRAINT uq_oferta_turma UNIQUE (id_turma, nome, ano_letivo, regime_letivo, semestre);



--
-- TOC entry 5736 (class 2606 OID 19212)
-- Name: academico_pedidos_ingresso uq_pedido_pendente; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_pedidos_ingresso
    ADD CONSTRAINT uq_pedido_pendente UNIQUE (id_aluno, turma_pendente);



--
-- TOC entry 5654 (class 2606 OID 18778)
-- Name: academico_turmas uq_turma_coorte; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT uq_turma_coorte UNIQUE (id_curso, nome, ano_ingresso, turno, campus);



--
-- TOC entry 5656 (class 2606 OID 18776)
-- Name: academico_turmas uq_turma_nome_global; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT uq_turma_nome_global UNIQUE (nome_chave);



--
-- TOC entry 5550 (class 2606 OID 18239)
-- Name: usuarios uq_usuario_origem_externa; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT uq_usuario_origem_externa UNIQUE (id_externo_origem);



--
-- TOC entry 5732 (class 2606 OID 19189)
-- Name: academico_vinculos_turma uq_vinculo_curso_ativo; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_vinculos_turma
    ADD CONSTRAINT uq_vinculo_curso_ativo UNIQUE (id_aluno, id_curso_ativo);



--
-- TOC entry 5552 (class 2606 OID 18235)
-- Name: usuarios usuarios_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_email_key UNIQUE (email);



--
-- TOC entry 5556 (class 2606 OID 18237)
-- Name: usuarios usuarios_matricula_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_matricula_key UNIQUE (matricula);



--
-- TOC entry 5558 (class 2606 OID 18233)
-- Name: usuarios usuarios_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_pkey PRIMARY KEY (id_usuario);



--
-- TOC entry 5704 (class 2606 OID 19010)
-- Name: vinculo_auditoria vinculo_auditoria_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo_auditoria
    ADD CONSTRAINT vinculo_auditoria_pkey PRIMARY KEY (id_auditoria);



--
-- TOC entry 5663 (class 1259 OID 19671)
-- Name: academico_convites_idx_convites_email; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX academico_convites_idx_convites_email ON public.academico_convites USING btree (email, estado);



--
-- TOC entry 5737 (class 1259 OID 19679)
-- Name: academico_gestao_historico_idx_gestao_alvo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX academico_gestao_historico_idx_gestao_alvo ON public.academico_gestao_historico USING btree (tipo, id_alvo, criado_em);



--
-- TOC entry 5708 (class 1259 OID 19676)
-- Name: academico_horarios_idx_horario_oferta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX academico_horarios_idx_horario_oferta ON public.academico_horarios USING btree (id_disciplina, ativo, dia_semana);



--
-- TOC entry 5668 (class 1259 OID 19672)
-- Name: academico_publicacoes_idx_publicacoes_disciplina; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX academico_publicacoes_idx_publicacoes_disciplina ON public.academico_publicacoes USING btree (id_disciplina, tipo, criado_em);



--
-- TOC entry 5705 (class 1259 OID 19675)
-- Name: academico_salas_historico_idx_salas_turma; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX academico_salas_historico_idx_salas_turma ON public.academico_salas_historico USING btree (id_turma, id_alteracao);



--
-- TOC entry 5599 (class 1259 OID 19655)
-- Name: avisos_ft_avisos_busca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX avisos_ft_avisos_busca ON public.avisos USING btree (titulo, resumo, referencia);



--
-- TOC entry 5600 (class 1259 OID 19654)
-- Name: avisos_idx_avisos_categoria; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX avisos_idx_avisos_categoria ON public.avisos USING btree (categoria);



--
-- TOC entry 5601 (class 1259 OID 19653)
-- Name: avisos_idx_avisos_listagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX avisos_idx_avisos_listagem ON public.avisos USING btree (situacao, fixado, data_publicacao);



--
-- TOC entry 5715 (class 1259 OID 19677)
-- Name: cadastro_auditoria_idx_cadastro_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX cadastro_auditoria_idx_cadastro_usuario ON public.cadastro_auditoria USING btree (id_usuario, criado_em);



--
-- TOC entry 5617 (class 1259 OID 19662)
-- Name: calendario_ft_calendario_busca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendario_ft_calendario_busca ON public.calendario USING btree (titulo, descricao);



--
-- TOC entry 5618 (class 1259 OID 19661)
-- Name: calendario_idx_calendario_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX calendario_idx_calendario_data ON public.calendario USING btree (data_evento);



--
-- TOC entry 5718 (class 1259 OID 19678)
-- Name: conta_nome_pedidos_idx_nome_pendente; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX conta_nome_pedidos_idx_nome_pendente ON public.conta_nome_pedidos USING btree (tipo, id_conta, estado);



--
-- TOC entry 5675 (class 1259 OID 19673)
-- Name: docente_requisitos_idx_requisitos_estado; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX docente_requisitos_idx_requisitos_estado ON public.docente_requisitos USING btree (estado, criado_em);



--
-- TOC entry 5640 (class 1259 OID 19670)
-- Name: documento_itens_idx_doc_item_dono_pasta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documento_itens_idx_doc_item_dono_pasta ON public.documento_itens USING btree (id_usuario, id_pasta);



--
-- TOC entry 5641 (class 1259 OID 19669)
-- Name: documento_itens_idx_doc_item_publico; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documento_itens_idx_doc_item_publico ON public.documento_itens USING btree (visibilidade, atualizado_em);



--
-- TOC entry 5642 (class 1259 OID 19668)
-- Name: documento_itens_idx_doc_item_revisao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documento_itens_idx_doc_item_revisao ON public.documento_itens USING btree (revisao, enviado_em);



--
-- TOC entry 5611 (class 1259 OID 19660)
-- Name: documentos_ft_documentos_busca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documentos_ft_documentos_busca ON public.documentos USING btree (titulo, descricao);



--
-- TOC entry 5612 (class 1259 OID 19659)
-- Name: documentos_idx_documentos_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX documentos_idx_documentos_usuario ON public.documentos USING btree (id_usuario, status);



--
-- TOC entry 5593 (class 1259 OID 19652)
-- Name: email_tokens_idx_email_conta; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_tokens_idx_email_conta ON public.email_tokens USING btree (tipo, identidade);



--
-- TOC entry 5594 (class 1259 OID 19651)
-- Name: email_tokens_idx_email_destino; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX email_tokens_idx_email_destino ON public.email_tokens USING btree (email_destino, expira_em);



--
-- TOC entry 5686 (class 1259 OID 19674)
-- Name: lembrete_envios_idx_lembrete_retry; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lembrete_envios_idx_lembrete_retry ON public.lembrete_envios USING btree (estado, proxima_tentativa_utc);



--
-- TOC entry 5629 (class 1259 OID 19665)
-- Name: lembretes_idx_lembrete_envio; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lembretes_idx_lembrete_envio ON public.lembretes USING btree (enviar_email, ativo, agendado_utc);



--
-- TOC entry 5630 (class 1259 OID 19667)
-- Name: lembretes_idx_lembrete_externo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lembretes_idx_lembrete_externo ON public.lembretes USING btree (id_externo, agendado_utc);



--
-- TOC entry 5631 (class 1259 OID 19666)
-- Name: lembretes_idx_lembretes_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lembretes_idx_lembretes_usuario ON public.lembretes USING btree (id_usuario, data_lembrete);



--
-- TOC entry 5621 (class 1259 OID 19664)
-- Name: projetos_ft_projetos_busca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projetos_ft_projetos_busca ON public.projetos USING btree (titulo, descricao);



--
-- TOC entry 5622 (class 1259 OID 19663)
-- Name: projetos_idx_projetos_listagem; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX projetos_idx_projetos_listagem ON public.projetos USING btree (aprovacao, eixo, situacao);



--
-- TOC entry 5586 (class 1259 OID 19650)
-- Name: seguranca_limites_idx_limites_expiracao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX seguranca_limites_idx_limites_expiracao ON public.seguranca_limites USING btree (expira_em);



--
-- TOC entry 5606 (class 1259 OID 19658)
-- Name: tarefas_ft_tarefas_busca; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tarefas_ft_tarefas_busca ON public.tarefas USING btree (titulo);



--
-- TOC entry 5607 (class 1259 OID 19656)
-- Name: tarefas_idx_tarefas_externo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tarefas_idx_tarefas_externo ON public.tarefas USING btree (id_externo, data_entrega);



--
-- TOC entry 5608 (class 1259 OID 19657)
-- Name: tarefas_idx_tarefas_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tarefas_idx_tarefas_usuario ON public.tarefas USING btree (id_usuario, status, data_entrega);



--
-- TOC entry 5569 (class 1259 OID 19649)
-- Name: tokens_idx_tokens_expiracao; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_idx_tokens_expiracao ON public.tokens USING btree (expiracao);



--
-- TOC entry 5570 (class 1259 OID 19648)
-- Name: tokens_idx_tokens_externo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_idx_tokens_externo ON public.tokens USING btree (id_externo);



--
-- TOC entry 5571 (class 1259 OID 19647)
-- Name: tokens_idx_tokens_usuario; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX tokens_idx_tokens_usuario ON public.tokens USING btree (id_usuario);



--
-- TOC entry 5553 (class 1259 OID 19646)
-- Name: usuarios_ft_usuarios_nome; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_ft_usuarios_nome ON public.usuarios USING btree (nome, nome_social);



--
-- TOC entry 5554 (class 1259 OID 19645)
-- Name: usuarios_idx_usuarios_tipo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX usuarios_idx_usuarios_tipo ON public.usuarios USING btree (tipo_usuario);



--
-- TOC entry 5847 (class 2620 OID 19693)
-- Name: academico_horario_excecoes academico_horario_excecoes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER academico_horario_excecoes_touch BEFORE UPDATE ON public.academico_horario_excecoes FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5845 (class 2620 OID 19691)
-- Name: academico_publicacoes academico_publicacoes_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER academico_publicacoes_touch BEFORE UPDATE ON public.academico_publicacoes FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5839 (class 2620 OID 19688)
-- Name: agenda_externa agenda_externa_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER agenda_externa_touch BEFORE UPDATE ON public.agenda_externa FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5829 (class 2620 OID 19683)
-- Name: avisos avisos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER avisos_touch BEFORE UPDATE ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5834 (class 2620 OID 19686)
-- Name: calendario calendario_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER calendario_touch BEFORE UPDATE ON public.calendario FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5846 (class 2620 OID 19692)
-- Name: docente_requisitos docente_requisitos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER docente_requisitos_touch BEFORE UPDATE ON public.docente_requisitos FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5843 (class 2620 OID 19690)
-- Name: documento_itens documento_itens_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER documento_itens_touch BEFORE UPDATE ON public.documento_itens FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5842 (class 2620 OID 19689)
-- Name: documento_pastas documento_pastas_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER documento_pastas_touch BEFORE UPDATE ON public.documento_pastas FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5833 (class 2620 OID 19685)
-- Name: documentos documentos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER documentos_touch BEFORE UPDATE ON public.documentos FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5848 (class 2620 OID 19694)
-- Name: google_export_destinos google_export_destinos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER google_export_destinos_touch BEFORE UPDATE ON public.google_export_destinos FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5837 (class 2620 OID 19687)
-- Name: projetos projetos_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER projetos_touch BEFORE UPDATE ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5826 (class 2620 OID 19682)
-- Name: publico_externo publico_externo_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER publico_externo_touch BEFORE UPDATE ON public.publico_externo FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5831 (class 2620 OID 19705)
-- Name: tarefas tarefa_invalida_lembretes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tarefa_invalida_lembretes AFTER UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.arcadia_tarefa_lembretes();



--
-- TOC entry 5832 (class 2620 OID 19684)
-- Name: tarefas tarefas_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tarefas_touch BEFORE UPDATE ON public.tarefas FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5840 (class 2620 OID 19710)
-- Name: agenda_externa trg_agenda_externa_lembrete_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_agenda_externa_lembrete_delete BEFORE DELETE ON public.agenda_externa FOR EACH ROW EXECUTE FUNCTION public.arcadia_evento_lembretes();



--
-- TOC entry 5841 (class 2620 OID 19709)
-- Name: agenda_externa trg_agenda_externa_lembrete_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_agenda_externa_lembrete_update AFTER UPDATE ON public.agenda_externa FOR EACH ROW EXECUTE FUNCTION public.arcadia_evento_lembretes();



--
-- TOC entry 5830 (class 2620 OID 19696)
-- Name: avisos trg_avisos_autor; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_avisos_autor BEFORE INSERT ON public.avisos FOR EACH ROW EXECUTE FUNCTION public.arcadia_autor_aviso();



--
-- TOC entry 5835 (class 2620 OID 19708)
-- Name: calendario trg_calendario_lembrete_delete; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calendario_lembrete_delete BEFORE DELETE ON public.calendario FOR EACH ROW EXECUTE FUNCTION public.arcadia_evento_lembretes();



--
-- TOC entry 5836 (class 2620 OID 19707)
-- Name: calendario trg_calendario_lembrete_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_calendario_lembrete_update AFTER UPDATE ON public.calendario FOR EACH ROW EXECUTE FUNCTION public.arcadia_evento_lembretes();



--
-- TOC entry 5838 (class 2620 OID 19698)
-- Name: projetos trg_projetos_aprovacao; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_projetos_aprovacao BEFORE INSERT ON public.projetos FOR EACH ROW EXECUTE FUNCTION public.arcadia_aprovar_projeto();



--
-- TOC entry 5828 (class 2620 OID 19701)
-- Name: recuperacao_senha trg_recuperacao_dono; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_recuperacao_dono BEFORE INSERT OR UPDATE ON public.recuperacao_senha FOR EACH ROW EXECUTE FUNCTION public.arcadia_titular_unico();



--
-- TOC entry 5827 (class 2620 OID 19700)
-- Name: tokens trg_tokens_dono; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_tokens_dono BEFORE INSERT OR UPDATE ON public.tokens FOR EACH ROW EXECUTE FUNCTION public.arcadia_titular_unico();



--
-- TOC entry 5844 (class 2620 OID 19703)
-- Name: academico_turmas trg_turma_nome; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_turma_nome BEFORE INSERT OR UPDATE ON public.academico_turmas FOR EACH ROW EXECUTE FUNCTION public.arcadia_turma_nome();



--
-- TOC entry 5825 (class 2620 OID 19681)
-- Name: usuarios usuarios_touch; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER usuarios_touch BEFORE UPDATE ON public.usuarios FOR EACH ROW EXECUTE FUNCTION public.arcadia_touch();



--
-- TOC entry 5787 (class 2606 OID 19455)
-- Name: academico_convites academico_convites_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_convites
    ADD CONSTRAINT academico_convites_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5783 (class 2606 OID 19440)
-- Name: academico_disciplinas academico_disciplinas_id_professor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_disciplinas
    ADD CONSTRAINT academico_disciplinas_id_professor_fkey FOREIGN KEY (id_professor) REFERENCES public.usuarios(id_usuario) ON DELETE RESTRICT;



--
-- TOC entry 5784 (class 2606 OID 19435)
-- Name: academico_disciplinas academico_disciplinas_id_turma_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_disciplinas
    ADD CONSTRAINT academico_disciplinas_id_turma_fkey FOREIGN KEY (id_turma) REFERENCES public.academico_turmas(id_turma) ON DELETE RESTRICT;



--
-- TOC entry 5812 (class 2606 OID 19585)
-- Name: academico_horario_excecoes academico_horario_excecoes_id_autor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horario_excecoes
    ADD CONSTRAINT academico_horario_excecoes_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5813 (class 2606 OID 19580)
-- Name: academico_horario_excecoes academico_horario_excecoes_id_horario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horario_excecoes
    ADD CONSTRAINT academico_horario_excecoes_id_horario_fkey FOREIGN KEY (id_horario) REFERENCES public.academico_horarios(id_horario) ON DELETE CASCADE;



--
-- TOC entry 5810 (class 2606 OID 19575)
-- Name: academico_horarios academico_horarios_id_autor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horarios
    ADD CONSTRAINT academico_horarios_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5811 (class 2606 OID 19570)
-- Name: academico_horarios academico_horarios_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_horarios
    ADD CONSTRAINT academico_horarios_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5785 (class 2606 OID 19450)
-- Name: academico_matriculas academico_matriculas_id_aluno_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_matriculas
    ADD CONSTRAINT academico_matriculas_id_aluno_fkey FOREIGN KEY (id_aluno) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5786 (class 2606 OID 19445)
-- Name: academico_matriculas academico_matriculas_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_matriculas
    ADD CONSTRAINT academico_matriculas_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5788 (class 2606 OID 19465)
-- Name: academico_publicacoes academico_publicacoes_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_publicacoes
    ADD CONSTRAINT academico_publicacoes_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5789 (class 2606 OID 19470)
-- Name: academico_publicacoes academico_publicacoes_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_publicacoes
    ADD CONSTRAINT academico_publicacoes_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.documento_itens(id_item) ON DELETE RESTRICT;



--
-- TOC entry 5796 (class 2606 OID 19500)
-- Name: academico_saidas_professor academico_saidas_professor_id_disciplina_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_saidas_professor
    ADD CONSTRAINT academico_saidas_professor_id_disciplina_fkey FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5797 (class 2606 OID 19505)
-- Name: academico_saidas_professor academico_saidas_professor_id_professor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_saidas_professor
    ADD CONSTRAINT academico_saidas_professor_id_professor_fkey FOREIGN KEY (id_professor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5808 (class 2606 OID 19565)
-- Name: academico_salas_historico academico_salas_historico_id_autor_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_salas_historico
    ADD CONSTRAINT academico_salas_historico_id_autor_fkey FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5809 (class 2606 OID 19560)
-- Name: academico_salas_historico academico_salas_historico_id_turma_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_salas_historico
    ADD CONSTRAINT academico_salas_historico_id_turma_fkey FOREIGN KEY (id_turma) REFERENCES public.academico_turmas(id_turma) ON DELETE SET NULL;



--
-- TOC entry 5779 (class 2606 OID 19430)
-- Name: academico_turmas academico_turmas_id_curso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT academico_turmas_id_curso_fkey FOREIGN KEY (id_curso) REFERENCES public.cursos(id_curso) ON DELETE RESTRICT;



--
-- TOC entry 5780 (class 2606 OID 19415)
-- Name: academico_turmas academico_turmas_id_representante_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT academico_turmas_id_representante_fkey FOREIGN KEY (id_representante) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5781 (class 2606 OID 19420)
-- Name: academico_turmas academico_turmas_id_vice1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT academico_turmas_id_vice1_fkey FOREIGN KEY (id_vice1) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5782 (class 2606 OID 19425)
-- Name: academico_turmas academico_turmas_id_vice2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_turmas
    ADD CONSTRAINT academico_turmas_id_vice2_fkey FOREIGN KEY (id_vice2) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5765 (class 2606 OID 19345)
-- Name: agenda_externa agenda_externa_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_externa
    ADD CONSTRAINT agenda_externa_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5803 (class 2606 OID 19535)
-- Name: agenda_vinculos agenda_vinculos_id_evento_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_vinculos
    ADD CONSTRAINT agenda_vinculos_id_evento_externo_fkey FOREIGN KEY (id_evento_externo) REFERENCES public.agenda_externa(id_evento) ON DELETE CASCADE;



--
-- TOC entry 5804 (class 2606 OID 19540)
-- Name: agenda_vinculos agenda_vinculos_id_evento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_vinculos
    ADD CONSTRAINT agenda_vinculos_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.calendario(id_evento) ON DELETE CASCADE;



--
-- TOC entry 5753 (class 2606 OID 19285)
-- Name: avisos avisos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5754 (class 2606 OID 19290)
-- Name: avisos_lidos avisos_lidos_id_aviso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_lidos
    ADD CONSTRAINT avisos_lidos_id_aviso_fkey FOREIGN KEY (id_aviso) REFERENCES public.avisos(id_aviso) ON DELETE CASCADE;



--
-- TOC entry 5755 (class 2606 OID 19295)
-- Name: avisos_lidos avisos_lidos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.avisos_lidos
    ADD CONSTRAINT avisos_lidos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5814 (class 2606 OID 19590)
-- Name: cadastro_auditoria cadastro_auditoria_id_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cadastro_auditoria
    ADD CONSTRAINT cadastro_auditoria_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5760 (class 2606 OID 19320)
-- Name: calendario calendario_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calendario
    ADD CONSTRAINT calendario_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5800 (class 2606 OID 19520)
-- Name: conta_vinculos conta_vinculos_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5801 (class 2606 OID 19530)
-- Name: conta_vinculos conta_vinculos_id_requisito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_id_requisito_fkey FOREIGN KEY (id_requisito) REFERENCES public.docente_requisitos(id_requisito) ON DELETE SET NULL;



--
-- TOC entry 5802 (class 2606 OID 19525)
-- Name: conta_vinculos conta_vinculos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.conta_vinculos
    ADD CONSTRAINT conta_vinculos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5791 (class 2606 OID 19475)
-- Name: docente_requisitos docente_requisitos_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE SET NULL;



--
-- TOC entry 5792 (class 2606 OID 19480)
-- Name: docente_requisitos docente_requisitos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5793 (class 2606 OID 19485)
-- Name: docente_requisitos docente_requisitos_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.docente_requisitos
    ADD CONSTRAINT docente_requisitos_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5773 (class 2606 OID 19395)
-- Name: documento_itens documento_itens_id_pasta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_itens
    ADD CONSTRAINT documento_itens_id_pasta_fkey FOREIGN KEY (id_pasta) REFERENCES public.documento_pastas(id_pasta) ON DELETE RESTRICT;



--
-- TOC entry 5774 (class 2606 OID 19390)
-- Name: documento_itens documento_itens_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_itens
    ADD CONSTRAINT documento_itens_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5775 (class 2606 OID 19385)
-- Name: documento_itens documento_itens_revisado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_itens
    ADD CONSTRAINT documento_itens_revisado_por_fkey FOREIGN KEY (revisado_por) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5772 (class 2606 OID 19380)
-- Name: documento_pastas documento_pastas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_pastas
    ADD CONSTRAINT documento_pastas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5776 (class 2606 OID 19405)
-- Name: documento_salvos documento_salvos_id_item_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_salvos
    ADD CONSTRAINT documento_salvos_id_item_fkey FOREIGN KEY (id_item) REFERENCES public.documento_itens(id_item) ON DELETE SET NULL;



--
-- TOC entry 5777 (class 2606 OID 19410)
-- Name: documento_salvos documento_salvos_id_pasta_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_salvos
    ADD CONSTRAINT documento_salvos_id_pasta_fkey FOREIGN KEY (id_pasta) REFERENCES public.documento_pastas(id_pasta) ON DELETE RESTRICT;



--
-- TOC entry 5778 (class 2606 OID 19400)
-- Name: documento_salvos documento_salvos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documento_salvos
    ADD CONSTRAINT documento_salvos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5758 (class 2606 OID 19315)
-- Name: documentos documentos_id_responsavel_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_id_responsavel_fkey FOREIGN KEY (id_responsavel) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5759 (class 2606 OID 19310)
-- Name: documentos documentos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.documentos
    ADD CONSTRAINT documentos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5745 (class 2606 OID 19250)
-- Name: perfil_compartilhamento fk_compartilhamento_externo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil_compartilhamento
    ADD CONSTRAINT fk_compartilhamento_externo FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5746 (class 2606 OID 19245)
-- Name: perfil_compartilhamento fk_compartilhamento_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.perfil_compartilhamento
    ADD CONSTRAINT fk_compartilhamento_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5823 (class 2606 OID 19635)
-- Name: academico_gestao_historico fk_gestao_autor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_gestao_historico
    ADD CONSTRAINT fk_gestao_autor FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5749 (class 2606 OID 19270)
-- Name: google_identidades fk_google_externo; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_identidades
    ADD CONSTRAINT fk_google_externo FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5750 (class 2606 OID 19265)
-- Name: google_identidades fk_google_usuario; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.google_identidades
    ADD CONSTRAINT fk_google_usuario FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5766 (class 2606 OID 19350)
-- Name: lembretes fk_lembrete_tarefa; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT fk_lembrete_tarefa FOREIGN KEY (id_tarefa) REFERENCES public.tarefas(id_tarefa) ON DELETE CASCADE;



--
-- TOC entry 5815 (class 2606 OID 19600)
-- Name: academico_oferta_catalogo fk_oferta_catalogo_item; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_oferta_catalogo
    ADD CONSTRAINT fk_oferta_catalogo_item FOREIGN KEY (id_catalogo) REFERENCES public.academico_catalogo_disciplinas(id_catalogo);



--
-- TOC entry 5816 (class 2606 OID 19595)
-- Name: academico_oferta_catalogo fk_oferta_catalogo_oferta; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_oferta_catalogo
    ADD CONSTRAINT fk_oferta_catalogo_oferta FOREIGN KEY (id_disciplina) REFERENCES public.academico_disciplinas(id_disciplina) ON DELETE CASCADE;



--
-- TOC entry 5820 (class 2606 OID 19625)
-- Name: academico_pedidos_ingresso fk_pedido_aluno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_pedidos_ingresso
    ADD CONSTRAINT fk_pedido_aluno FOREIGN KEY (id_aluno) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5821 (class 2606 OID 19630)
-- Name: academico_pedidos_ingresso fk_pedido_decisor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_pedidos_ingresso
    ADD CONSTRAINT fk_pedido_decisor FOREIGN KEY (id_decisor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5822 (class 2606 OID 19620)
-- Name: academico_pedidos_ingresso fk_pedido_turma; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_pedidos_ingresso
    ADD CONSTRAINT fk_pedido_turma FOREIGN KEY (id_turma) REFERENCES public.academico_turmas(id_turma);



--
-- TOC entry 5790 (class 2606 OID 19460)
-- Name: academico_publicacoes fk_publicacao_autor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_publicacoes
    ADD CONSTRAINT fk_publicacao_autor FOREIGN KEY (id_autor) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5817 (class 2606 OID 19610)
-- Name: academico_vinculos_turma fk_vinculo_aluno; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_vinculos_turma
    ADD CONSTRAINT fk_vinculo_aluno FOREIGN KEY (id_aluno) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5818 (class 2606 OID 19615)
-- Name: academico_vinculos_turma fk_vinculo_curso; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_vinculos_turma
    ADD CONSTRAINT fk_vinculo_curso FOREIGN KEY (id_curso) REFERENCES public.cursos(id_curso);



--
-- TOC entry 5819 (class 2606 OID 19605)
-- Name: academico_vinculos_turma fk_vinculo_turma; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.academico_vinculos_turma
    ADD CONSTRAINT fk_vinculo_turma FOREIGN KEY (id_turma) REFERENCES public.academico_turmas(id_turma);



--
-- TOC entry 5799 (class 2606 OID 19515)
-- Name: lembrete_envios lembrete_envios_id_lembrete_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembrete_envios
    ADD CONSTRAINT lembrete_envios_id_lembrete_fkey FOREIGN KEY (id_lembrete) REFERENCES public.lembretes(id_lembrete) ON DELETE CASCADE;



--
-- TOC entry 5767 (class 2606 OID 19370)
-- Name: lembretes lembretes_id_evento_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_id_evento_externo_fkey FOREIGN KEY (id_evento_externo) REFERENCES public.agenda_externa(id_evento) ON DELETE SET NULL;



--
-- TOC entry 5768 (class 2606 OID 19360)
-- Name: lembretes lembretes_id_evento_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_id_evento_fkey FOREIGN KEY (id_evento) REFERENCES public.calendario(id_evento) ON DELETE SET NULL;



--
-- TOC entry 5769 (class 2606 OID 19365)
-- Name: lembretes lembretes_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5770 (class 2606 OID 19355)
-- Name: lembretes lembretes_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lembretes
    ADD CONSTRAINT lembretes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5771 (class 2606 OID 19375)
-- Name: links_uteis links_uteis_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.links_uteis
    ADD CONSTRAINT links_uteis_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5798 (class 2606 OID 19510)
-- Name: preferencias_notificacao preferencias_notificacao_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.preferencias_notificacao
    ADD CONSTRAINT preferencias_notificacao_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5794 (class 2606 OID 19495)
-- Name: projeto_inscricoes_externas projeto_inscricoes_externas_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes_externas
    ADD CONSTRAINT projeto_inscricoes_externas_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5795 (class 2606 OID 19490)
-- Name: projeto_inscricoes_externas projeto_inscricoes_externas_id_projeto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes_externas
    ADD CONSTRAINT projeto_inscricoes_externas_id_projeto_fkey FOREIGN KEY (id_projeto) REFERENCES public.projetos(id_projeto) ON DELETE CASCADE;



--
-- TOC entry 5763 (class 2606 OID 19335)
-- Name: projeto_inscricoes projeto_inscricoes_id_projeto_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes
    ADD CONSTRAINT projeto_inscricoes_id_projeto_fkey FOREIGN KEY (id_projeto) REFERENCES public.projetos(id_projeto) ON DELETE CASCADE;



--
-- TOC entry 5764 (class 2606 OID 19340)
-- Name: projeto_inscricoes projeto_inscricoes_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projeto_inscricoes
    ADD CONSTRAINT projeto_inscricoes_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5761 (class 2606 OID 19330)
-- Name: projetos projetos_aprovado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_aprovado_por_fkey FOREIGN KEY (aprovado_por) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5762 (class 2606 OID 19325)
-- Name: projetos projetos_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.projetos
    ADD CONSTRAINT projetos_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5751 (class 2606 OID 19280)
-- Name: recuperacao_senha recuperacao_senha_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacao_senha
    ADD CONSTRAINT recuperacao_senha_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5752 (class 2606 OID 19275)
-- Name: recuperacao_senha recuperacao_senha_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recuperacao_senha
    ADD CONSTRAINT recuperacao_senha_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5824 (class 2606 OID 19640)
-- Name: tarefa_arquivos tarefa_arquivos_id_tarefa_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarefa_arquivos
    ADD CONSTRAINT tarefa_arquivos_id_tarefa_fkey FOREIGN KEY (id_tarefa) REFERENCES public.tarefas(id_tarefa) ON DELETE CASCADE;



--
-- TOC entry 5756 (class 2606 OID 19300)
-- Name: tarefas tarefas_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarefas
    ADD CONSTRAINT tarefas_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5757 (class 2606 OID 19305)
-- Name: tarefas tarefas_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tarefas
    ADD CONSTRAINT tarefas_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5747 (class 2606 OID 19260)
-- Name: tokens tokens_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE CASCADE;



--
-- TOC entry 5748 (class 2606 OID 19255)
-- Name: tokens tokens_id_usuario_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tokens
    ADD CONSTRAINT tokens_id_usuario_fkey FOREIGN KEY (id_usuario) REFERENCES public.usuarios(id_usuario) ON DELETE CASCADE;



--
-- TOC entry 5744 (class 2606 OID 19240)
-- Name: usuarios usuarios_id_curso_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usuarios
    ADD CONSTRAINT usuarios_id_curso_fkey FOREIGN KEY (id_curso) REFERENCES public.cursos(id_curso) ON DELETE SET NULL;



--
-- TOC entry 5805 (class 2606 OID 19555)
-- Name: vinculo_auditoria vinculo_auditoria_id_admin_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo_auditoria
    ADD CONSTRAINT vinculo_auditoria_id_admin_fkey FOREIGN KEY (id_admin) REFERENCES public.usuarios(id_usuario) ON DELETE SET NULL;



--
-- TOC entry 5806 (class 2606 OID 19550)
-- Name: vinculo_auditoria vinculo_auditoria_id_externo_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo_auditoria
    ADD CONSTRAINT vinculo_auditoria_id_externo_fkey FOREIGN KEY (id_externo) REFERENCES public.publico_externo(id_externo) ON DELETE SET NULL;



--
-- TOC entry 5807 (class 2606 OID 19545)
-- Name: vinculo_auditoria vinculo_auditoria_id_requisito_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vinculo_auditoria
    ADD CONSTRAINT vinculo_auditoria_id_requisito_fkey FOREIGN KEY (id_requisito) REFERENCES public.docente_requisitos(id_requisito) ON DELETE SET NULL;
COMMIT;
