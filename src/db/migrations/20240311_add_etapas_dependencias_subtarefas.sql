-- Adicionar coluna estimativa_horas na tabela etapas
ALTER TABLE etapas_obra
ADD COLUMN estimativa_horas INTEGER DEFAULT 0;

-- Criar tabela de dependências entre etapas
CREATE TABLE IF NOT EXISTS etapas_dependencias (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    etapa_dependente_id UUID NOT NULL REFERENCES etapas_obra(id) ON DELETE CASCADE,
    etapa_requisito_id UUID NOT NULL REFERENCES etapas_obra(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(etapa_dependente_id, etapa_requisito_id)
);

-- Criar tabela de subtarefas
CREATE TABLE IF NOT EXISTS subtarefas (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    etapa_id UUID NOT NULL REFERENCES etapas_obra(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    concluida BOOLEAN DEFAULT FALSE,
    ordem INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_etapas_dependencias_dependente ON etapas_dependencias(etapa_dependente_id);
CREATE INDEX IF NOT EXISTS idx_etapas_dependencias_requisito ON etapas_dependencias(etapa_requisito_id);
CREATE INDEX IF NOT EXISTS idx_subtarefas_etapa ON subtarefas(etapa_id);

-- Criar função para atualizar o timestamp de updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Criar triggers para atualizar o timestamp de updated_at
CREATE TRIGGER update_etapas_dependencias_updated_at
    BEFORE UPDATE ON etapas_dependencias
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_subtarefas_updated_at
    BEFORE UPDATE ON subtarefas
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Criar políticas de segurança RLS (Row Level Security)
ALTER TABLE etapas_dependencias ENABLE ROW LEVEL SECURITY;
ALTER TABLE subtarefas ENABLE ROW LEVEL SECURITY;

-- Criar políticas para etapas_dependencias
CREATE POLICY "Permitir select para usuários autenticados" ON etapas_dependencias
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir insert para usuários autenticados" ON etapas_dependencias
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir update para usuários autenticados" ON etapas_dependencias
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir delete para usuários autenticados" ON etapas_dependencias
    FOR DELETE
    TO authenticated
    USING (true);

-- Criar políticas para subtarefas
CREATE POLICY "Permitir select para usuários autenticados" ON subtarefas
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Permitir insert para usuários autenticados" ON subtarefas
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Permitir update para usuários autenticados" ON subtarefas
    FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Permitir delete para usuários autenticados" ON subtarefas
    FOR DELETE
    TO authenticated
    USING (true); 