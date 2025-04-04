-- Script para adicionar colunas material_id e etapa_id na tabela despesas
-- Este script também adiciona um índice para consulta rápida de despesas por material

-- Adicionar coluna material_id, se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'despesas' AND column_name = 'material_id'
    ) THEN
        ALTER TABLE despesas ADD COLUMN material_id UUID REFERENCES materiais(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna material_id adicionada à tabela despesas.';
    ELSE
        RAISE NOTICE 'Coluna material_id já existe na tabela despesas.';
    END IF;
END $$;

-- Adicionar coluna etapa_id, se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'despesas' AND column_name = 'etapa_id'
    ) THEN
        ALTER TABLE despesas ADD COLUMN etapa_id UUID REFERENCES etapas_obra(id) ON DELETE SET NULL;
        RAISE NOTICE 'Coluna etapa_id adicionada à tabela despesas.';
    ELSE
        RAISE NOTICE 'Coluna etapa_id já existe na tabela despesas.';
    END IF;
END $$;

-- Criar índice para pesquisa rápida de despesas por material
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_despesas_material_id'
    ) THEN
        CREATE INDEX idx_despesas_material_id ON despesas(material_id);
        RAISE NOTICE 'Índice idx_despesas_material_id criado.';
    ELSE
        RAISE NOTICE 'Índice idx_despesas_material_id já existe.';
    END IF;
END $$;

-- Criar índice para pesquisa rápida de despesas por etapa
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'idx_despesas_etapa_id'
    ) THEN
        CREATE INDEX idx_despesas_etapa_id ON despesas(etapa_id);
        RAISE NOTICE 'Índice idx_despesas_etapa_id criado.';
    ELSE
        RAISE NOTICE 'Índice idx_despesas_etapa_id já existe.';
    END IF;
END $$;

-- Adicionar uma categoria 'material' ao sistema se não existir
-- Observação: esta parte assume que a tabela despesas tem uma coluna 'categoria' 
-- do tipo texto sem restrições específicas 