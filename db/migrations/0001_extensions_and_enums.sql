-- =============================================================================
-- goldendata — 0001 — extensões e tipos enumerados
-- Plataforma de Registro de Modelos (3.2) + Avaliação Contínua de Qualidade (3.3)
-- Postgres puro (sem features proprietárias) para permitir migração on-prem.
-- O servidor de banco deve ter o relógio sincronizado à Hora Legal Brasileira
-- (HLB) via NTP/NTS — exigência da trilha de auditoria (CESEC §3).
-- =============================================================================

-- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---- Registro / Ficha Técnica (3.2) -----------------------------------------
CREATE TYPE tool_type            AS ENUM ('ferramenta', 'agente');
CREATE TYPE risk_category        AS ENUM ('alto', 'baixo');               -- CNJ 615 Art. 9-11
CREATE TYPE supervision_level    AS ENUM ('humano_no_loop', 'humano_sobre_o_loop', 'sem_supervisao');
CREATE TYPE model_hosting        AS ENUM ('api_externa', 'on_premise', 'nuvem_homologada');
CREATE TYPE lifecycle_stage      AS ENUM ('rascunho', 'em_avaliacao', 'aprovado', 'em_producao', 'suspenso', 'descontinuado');
CREATE TYPE data_nature          AS ENUM ('treino_finetuning', 'rag_base', 'contexto_runtime');
CREATE TYPE base_legal           AS ENUM (
    'funcao_jurisdicional',          -- LGPD Art. 4º II / exercício regular
    'obrigacao_legal',               -- Art. 7º II
    'politica_publica',              -- Art. 7º III
    'legitimo_interesse',            -- Art. 7º IX (exige RIPD)
    'consentimento',                 -- Art. 7º I
    'nao_se_aplica'
);
CREATE TYPE attachment_type      AS ENUM ('model_card', 'datasheet', 'ripd', 'aia', 'relatorio_avaliacao', 'parecer_conformidade', 'outro');
CREATE TYPE risk_kind            AS ENUM ('alucinacao', 'vies', 'vazamento_dados', 'propriedade_intelectual', 'prompt_injection', 'dependencia_fornecedor', 'outro');

-- ---- Avaliação / Golden Datasets (3.3) --------------------------------------
CREATE TYPE dataset_domain       AS ENUM ('minuta', 'despacho', 'decisao', 'relatorio', 'sentenca', 'outro');
CREATE TYPE case_origin          AS ENUM ('sintetico', 'producao');
CREATE TYPE rubric_scale         AS ENUM ('binaria', 'escala_3', 'escala_5');
CREATE TYPE eval_trigger         AS ENUM ('manual', 'importacao', 'agendado', 'ci');
CREATE TYPE evaluator_type       AS ENUM ('deterministic', 'statistical', 'human', 'llm_judge', 'nli_faithfulness');
CREATE TYPE metric_type          AS ENUM ('exact_match', 'edit_distance', 'similarity', 'rouge_l', 'bleu', 'bertscore', 'faithfulness', 'rubrica', 'citation');
CREATE TYPE annotation_label     AS ENUM ('aceite', 'correcao', 'rejeicao');
CREATE TYPE gate_result          AS ENUM ('pendente', 'aprovado', 'reprovado');
CREATE TYPE citation_status      AS ENUM ('existe', 'inexistente', 'numero_incorreto', 'fora_contexto');
CREATE TYPE iaa_metric           AS ENUM ('cohen_kappa', 'krippendorff_alpha', 'fleiss_kappa');

-- ---- Governança / RBAC ------------------------------------------------------
CREATE TYPE rbac_role            AS ENUM ('coordenador_comite', 'owner_ferramenta', 'avaliador', 'auditor_dpo', 'admin');
CREATE TYPE audit_action         AS ENUM ('create', 'update', 'delete', 'promote', 'suspend', 'annotate', 'gate_decision', 'login', 'export');
