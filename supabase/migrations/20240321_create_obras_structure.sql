-- 1. Primeiro criar a tabela obras (estrutura básica)
CREATE TABLE IF NOT EXISTS obras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    endereco text,
    orcamento decimal,
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    status text DEFAULT 'planejada',
    area_construida decimal,
    responsavel text,
    cliente text,
    progresso integer DEFAULT 0,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 2. Criar a tabela de etapas
DROP TABLE IF EXISTS etapas_obra;
CREATE TABLE IF NOT EXISTS etapas_obra (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id uuid REFERENCES obras(id) ON DELETE CASCADE,
    nome text NOT NULL,
    descricao text,
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    status text DEFAULT 'pendente',
    progresso integer DEFAULT 0,
    ordem integer,
    valor_previsto decimal DEFAULT 0,
    valor_realizado decimal DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 3. Criar a tabela de documentos
DROP TABLE IF EXISTS documentos;
CREATE TABLE documentos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id uuid REFERENCES obras(id) ON DELETE CASCADE,
    nome text NOT NULL,
    descricao text,
    tipo text,
    url text,
    tamanho_bytes bigint,
    formato text,
    status text DEFAULT 'ativo',
    versao integer DEFAULT 1,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- 4. Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON obras(user_id);
CREATE INDEX IF NOT EXISTS idx_obras_status ON obras(status);
CREATE INDEX IF NOT EXISTS idx_etapas_obra_id ON etapas_obra(obra_id);
CREATE INDEX IF NOT EXISTS idx_etapas_status ON etapas_obra(status);
CREATE INDEX IF NOT EXISTS idx_documentos_obra_id ON documentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON documentos(user_id);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_status ON documentos(status);

-- 5. Habilitar RLS nas tabelas
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- 6. Remover políticas existentes
DROP POLICY IF EXISTS "obras_policy" ON obras;
DROP POLICY IF EXISTS "etapas_policy" ON etapas_obra;
DROP POLICY IF EXISTS "documentos_policy" ON documentos;

-- 7. Criar políticas de segurança simplificadas
CREATE POLICY "obras_policy" ON obras
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "etapas_policy" ON etapas_obra
TO authenticated
USING (true)
WITH CHECK (true);

CREATE POLICY "documentos_policy" ON documentos
TO authenticated
USING (true)
WITH CHECK (true);

-- 8. Adicionar comentários às tabelas e colunas
COMMENT ON TABLE obras IS 'Tabela principal de obras';
COMMENT ON COLUMN obras.nome IS 'Nome da obra';
COMMENT ON COLUMN obras.descricao IS 'Descrição detalhada da obra';
COMMENT ON COLUMN obras.endereco IS 'Endereço completo da obra';
COMMENT ON COLUMN obras.orcamento IS 'Orçamento total previsto';
COMMENT ON COLUMN obras.data_inicio IS 'Data de início da obra';
COMMENT ON COLUMN obras.data_fim IS 'Data prevista para término';
COMMENT ON COLUMN obras.status IS 'Status atual: planejada, em_andamento, pausada, concluida';
COMMENT ON COLUMN obras.area_construida IS 'Área total construída em m²';
COMMENT ON COLUMN obras.responsavel IS 'Nome do responsável técnico';
COMMENT ON COLUMN obras.cliente IS 'Nome do cliente';
COMMENT ON COLUMN obras.progresso IS 'Percentual de progresso geral da obra';

COMMENT ON TABLE etapas_obra IS 'Etapas de execução das obras';
COMMENT ON COLUMN etapas_obra.nome IS 'Nome da etapa';
COMMENT ON COLUMN etapas_obra.descricao IS 'Descrição detalhada da etapa';
COMMENT ON COLUMN etapas_obra.data_inicio IS 'Data de início da etapa';
COMMENT ON COLUMN etapas_obra.data_fim IS 'Data prevista para término da etapa';
COMMENT ON COLUMN etapas_obra.status IS 'Status: pendente, em_andamento, concluida';
COMMENT ON COLUMN etapas_obra.progresso IS 'Percentual de progresso da etapa';
COMMENT ON COLUMN etapas_obra.ordem IS 'Ordem de execução da etapa';
COMMENT ON COLUMN etapas_obra.valor_previsto IS 'Valor previsto para a etapa';
COMMENT ON COLUMN etapas_obra.valor_realizado IS 'Valor já gasto na etapa';

COMMENT ON TABLE documentos IS 'Documentos relacionados às obras';
COMMENT ON COLUMN documentos.nome IS 'Nome do documento';
COMMENT ON COLUMN documentos.descricao IS 'Descrição do documento';
COMMENT ON COLUMN documentos.tipo IS 'Tipo do documento (projeto, contrato, etc)';
COMMENT ON COLUMN documentos.url IS 'URL de acesso ao documento';
COMMENT ON COLUMN documentos.tamanho_bytes IS 'Tamanho do arquivo em bytes';
COMMENT ON COLUMN documentos.formato IS 'Formato do arquivo (pdf, dwg, etc)';
COMMENT ON COLUMN documentos.status IS 'Status do documento: ativo, arquivado, excluído';
COMMENT ON COLUMN documentos.versao IS 'Número da versão do documento'; 