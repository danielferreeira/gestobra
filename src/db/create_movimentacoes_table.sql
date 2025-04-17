-- Script para criar a tabela movimentacoes_materiais no Supabase
-- Este script deve ser executado pelo administrador do banco de dados

-- Criação da tabela de movimentações de materiais
CREATE TABLE public.movimentacoes_materiais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    material_id UUID NOT NULL,
    obra_id UUID NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    valor_unitario NUMERIC(10, 2),
    responsavel VARCHAR(100),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comentários da tabela
COMMENT ON TABLE public.movimentacoes_materiais IS 'Registro de entradas e saídas de materiais';
COMMENT ON COLUMN public.movimentacoes_materiais.id IS 'ID único da movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.data IS 'Data da movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.tipo IS 'Tipo de movimentação: entrada ou saída';
COMMENT ON COLUMN public.movimentacoes_materiais.material_id IS 'ID do material movimentado';
COMMENT ON COLUMN public.movimentacoes_materiais.obra_id IS 'ID da obra relacionada à movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.quantidade IS 'Quantidade de material movimentado';
COMMENT ON COLUMN public.movimentacoes_materiais.valor_unitario IS 'Valor unitário do material no momento da movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.responsavel IS 'Pessoa responsável pela movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.observacao IS 'Observações adicionais sobre a movimentação';
COMMENT ON COLUMN public.movimentacoes_materiais.created_at IS 'Data de criação do registro';
COMMENT ON COLUMN public.movimentacoes_materiais.updated_at IS 'Data da última atualização do registro';

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" 
    ON public.movimentacoes_materiais 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Criar política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados" 
    ON public.movimentacoes_materiais 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Criar política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados" 
    ON public.movimentacoes_materiais 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Criar política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão para usuários autenticados" 
    ON public.movimentacoes_materiais 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Índices para melhorar performance
CREATE INDEX idx_movimentacoes_materiais_material_id ON public.movimentacoes_materiais(material_id);
CREATE INDEX idx_movimentacoes_materiais_obra_id ON public.movimentacoes_materiais(obra_id);
CREATE INDEX idx_movimentacoes_materiais_data ON public.movimentacoes_materiais(data);
CREATE INDEX idx_movimentacoes_materiais_tipo ON public.movimentacoes_materiais(tipo);

-- Trigger para atualizar o updated_at automaticamente
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_movimentacoes_materiais_timestamp
BEFORE UPDATE ON public.movimentacoes_materiais
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();

-- Versão alternativa (singular): Para quem preferir usar o nome no singular
-- Descomente o bloco abaixo para usar o nome 'movimentacao_materiais' (singular)
/*
CREATE TABLE public.movimentacao_materiais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    data DATE NOT NULL,
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
    material_id UUID NOT NULL,
    obra_id UUID NOT NULL,
    quantidade NUMERIC(10, 2) NOT NULL,
    valor_unitario NUMERIC(10, 2),
    responsavel VARCHAR(100),
    observacao TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar RLS (Row Level Security)
ALTER TABLE public.movimentacao_materiais ENABLE ROW LEVEL SECURITY;

-- Criar política para permitir leitura para todos os usuários autenticados
CREATE POLICY "Permitir leitura para usuários autenticados" 
    ON public.movimentacao_materiais 
    FOR SELECT 
    USING (auth.role() = 'authenticated');

-- Criar política para permitir inserção para usuários autenticados
CREATE POLICY "Permitir inserção para usuários autenticados" 
    ON public.movimentacao_materiais 
    FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- Criar política para permitir atualização para usuários autenticados
CREATE POLICY "Permitir atualização para usuários autenticados" 
    ON public.movimentacao_materiais 
    FOR UPDATE 
    USING (auth.role() = 'authenticated');

-- Criar política para permitir exclusão para usuários autenticados
CREATE POLICY "Permitir exclusão para usuários autenticados" 
    ON public.movimentacao_materiais 
    FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Índices para melhorar performance
CREATE INDEX idx_movimentacao_materiais_material_id ON public.movimentacao_materiais(material_id);
CREATE INDEX idx_movimentacao_materiais_obra_id ON public.movimentacao_materiais(obra_id);
CREATE INDEX idx_movimentacao_materiais_data ON public.movimentacao_materiais(data);
CREATE INDEX idx_movimentacao_materiais_tipo ON public.movimentacao_materiais(tipo);

-- Trigger para atualizar o updated_at automaticamente
CREATE TRIGGER update_movimentacao_materiais_timestamp
BEFORE UPDATE ON public.movimentacao_materiais
FOR EACH ROW
EXECUTE FUNCTION update_modified_column();
*/

-- Script para adicionar a coluna valor_unitario caso ela não exista
-- Execute este script se a tabela já existir mas estiver faltando esta coluna
/*
-- Para a tabela no plural
ALTER TABLE public.movimentacoes_materiais 
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2);

-- Para a tabela no singular
ALTER TABLE public.movimentacao_materiais 
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2);
*/ 