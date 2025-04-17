-- Script para adicionar campos faltantes às tabelas de movimentação de materiais
-- Execute este script se estiver encontrando erros como:
-- "column movimentacao_materiais.valor_unitario does not exist"
-- "column movimentacao_materiais.observacao does not exist"

-- Para a tabela no singular (movimentacao_materiais)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacao_materiais'
    ) THEN
        -- Adicionar campo valor_unitario se não existir
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacao_materiais' 
            AND column_name = 'valor_unitario'
        ) THEN
            ALTER TABLE public.movimentacao_materiais 
            ADD COLUMN valor_unitario NUMERIC(10, 2);
            
            RAISE NOTICE 'Coluna valor_unitario adicionada à tabela movimentacao_materiais.';
        ELSE
            RAISE NOTICE 'A coluna valor_unitario já existe na tabela movimentacao_materiais.';
        END IF;
        
        -- Adicionar campo observacao se não existir
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacao_materiais' 
            AND column_name = 'observacao'
        ) THEN
            ALTER TABLE public.movimentacao_materiais 
            ADD COLUMN observacao TEXT;
            
            RAISE NOTICE 'Coluna observacao adicionada à tabela movimentacao_materiais.';
        ELSE
            RAISE NOTICE 'A coluna observacao já existe na tabela movimentacao_materiais.';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela movimentacao_materiais não existe.';
    END IF;
END $$;

-- Para a tabela no plural (movimentacoes_materiais)
DO $$
BEGIN
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacoes_materiais'
    ) THEN
        -- Adicionar campo valor_unitario se não existir
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes_materiais' 
            AND column_name = 'valor_unitario'
        ) THEN
            ALTER TABLE public.movimentacoes_materiais 
            ADD COLUMN valor_unitario NUMERIC(10, 2);
            
            RAISE NOTICE 'Coluna valor_unitario adicionada à tabela movimentacoes_materiais.';
        ELSE
            RAISE NOTICE 'A coluna valor_unitario já existe na tabela movimentacoes_materiais.';
        END IF;
        
        -- Adicionar campo observacao se não existir
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes_materiais' 
            AND column_name = 'observacao'
        ) THEN
            ALTER TABLE public.movimentacoes_materiais 
            ADD COLUMN observacao TEXT;
            
            RAISE NOTICE 'Coluna observacao adicionada à tabela movimentacoes_materiais.';
        ELSE
            RAISE NOTICE 'A coluna observacao já existe na tabela movimentacoes_materiais.';
        END IF;
    ELSE
        RAISE NOTICE 'A tabela movimentacoes_materiais não existe.';
    END IF;
END $$;

-- Adicionar campo responsavel (caso esteja faltando também)
DO $$
BEGIN
    -- Para tabela no singular
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacao_materiais'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacao_materiais' 
        AND column_name = 'responsavel'
    ) THEN
        ALTER TABLE public.movimentacao_materiais 
        ADD COLUMN responsavel VARCHAR(100);
        RAISE NOTICE 'Coluna responsavel adicionada à tabela movimentacao_materiais.';
    END IF;
    
    -- Para tabela no plural
    IF EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacoes_materiais'
    ) AND NOT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacoes_materiais' 
        AND column_name = 'responsavel'
    ) THEN
        ALTER TABLE public.movimentacoes_materiais 
        ADD COLUMN responsavel VARCHAR(100);
        RAISE NOTICE 'Coluna responsavel adicionada à tabela movimentacoes_materiais.';
    END IF;
END $$;

-- Instruções para executar este script:
-- 1. Acesse o painel do Supabase
-- 2. Vá para a seção "SQL Editor"
-- 3. Cole este script na área de edição
-- 4. Clique em "Run" ou "Execute"
-- 5. Verifique as mensagens na parte inferior para confirmar que o script foi executado com sucesso 