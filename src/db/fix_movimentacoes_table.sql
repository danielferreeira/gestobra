-- Script de correção completa das tabelas de movimentação de materiais
-- Este script verifica e adiciona todos os campos que possam estar faltando

-- Função para adicionar colunas se não existirem
CREATE OR REPLACE FUNCTION add_missing_columns() RETURNS void AS $$
DECLARE
    tables_count integer := 0;
    singular_exists boolean := false;
    plural_exists boolean := false;
    missing_columns text := '';
BEGIN
    -- Verificar se a tabela no singular existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacao_materiais'
    ) INTO singular_exists;
    
    -- Verificar se a tabela no plural existe
    SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'movimentacoes_materiais'
    ) INTO plural_exists;
    
    -- Contar quantas tabelas existem
    tables_count := CASE WHEN singular_exists THEN 1 ELSE 0 END + 
                    CASE WHEN plural_exists THEN 1 ELSE 0 END;
    
    -- Verificar se pelo menos uma tabela existe
    IF tables_count = 0 THEN
        RAISE NOTICE 'Nenhuma tabela de movimentação de materiais encontrada. Execute o script de criação primeiro.';
        RETURN;
    END IF;
    
    -- Verificar se ambas as tabelas existem
    IF tables_count = 2 THEN
        RAISE NOTICE 'ATENÇÃO: As duas versões da tabela (singular e plural) existem no banco. Recomenda-se manter apenas uma delas.';
    END IF;
    
    -- Corrigir a tabela no singular, se existir
    IF singular_exists THEN
        RAISE NOTICE 'Verificando e corrigindo a tabela movimentacao_materiais...';
        
        -- Verificar e adicionar campo valor_unitario
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacao_materiais' 
            AND column_name = 'valor_unitario'
        ) THEN
            missing_columns := missing_columns || 'valor_unitario, ';
        END IF;
        
        -- Verificar e adicionar campo observacao
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacao_materiais' 
            AND column_name = 'observacao'
        ) THEN
            missing_columns := missing_columns || 'observacao, ';
        END IF;
        
        -- Verificar e adicionar campo responsavel
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacao_materiais' 
            AND column_name = 'responsavel'
        ) THEN
            missing_columns := missing_columns || 'responsavel, ';
        END IF;
        
        -- Adicionar todos os campos faltantes de uma vez
        IF missing_columns <> '' THEN
            missing_columns := RTRIM(missing_columns, ', ');
            RAISE NOTICE 'Adicionando campos faltantes à tabela movimentacao_materiais: %', missing_columns;
            
            EXECUTE 'ALTER TABLE public.movimentacao_materiais 
                    ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2),
                    ADD COLUMN IF NOT EXISTS observacao TEXT,
                    ADD COLUMN IF NOT EXISTS responsavel VARCHAR(100)';
            
            RAISE NOTICE 'Campos adicionados com sucesso à tabela movimentacao_materiais';
        ELSE
            RAISE NOTICE 'Todos os campos necessários já existem na tabela movimentacao_materiais';
        END IF;
    END IF;
    
    -- Corrigir a tabela no plural, se existir
    IF plural_exists THEN
        RAISE NOTICE 'Verificando e corrigindo a tabela movimentacoes_materiais...';
        missing_columns := '';
        
        -- Verificar e adicionar campo valor_unitario
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes_materiais' 
            AND column_name = 'valor_unitario'
        ) THEN
            missing_columns := missing_columns || 'valor_unitario, ';
        END IF;
        
        -- Verificar e adicionar campo observacao
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes_materiais' 
            AND column_name = 'observacao'
        ) THEN
            missing_columns := missing_columns || 'observacao, ';
        END IF;
        
        -- Verificar e adicionar campo responsavel
        IF NOT EXISTS (
            SELECT FROM information_schema.columns 
            WHERE table_schema = 'public' 
            AND table_name = 'movimentacoes_materiais' 
            AND column_name = 'responsavel'
        ) THEN
            missing_columns := missing_columns || 'responsavel, ';
        END IF;
        
        -- Adicionar todos os campos faltantes de uma vez
        IF missing_columns <> '' THEN
            missing_columns := RTRIM(missing_columns, ', ');
            RAISE NOTICE 'Adicionando campos faltantes à tabela movimentacoes_materiais: %', missing_columns;
            
            EXECUTE 'ALTER TABLE public.movimentacoes_materiais 
                    ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2),
                    ADD COLUMN IF NOT EXISTS observacao TEXT,
                    ADD COLUMN IF NOT EXISTS responsavel VARCHAR(100)';
            
            RAISE NOTICE 'Campos adicionados com sucesso à tabela movimentacoes_materiais';
        ELSE
            RAISE NOTICE 'Todos os campos necessários já existem na tabela movimentacoes_materiais';
        END IF;
    END IF;
    
    RAISE NOTICE '✅ Processo de correção de tabelas concluído com sucesso!';
END;
$$ LANGUAGE plpgsql;

-- Executar a função
SELECT add_missing_columns();

-- Remover a função após a execução
DROP FUNCTION IF EXISTS add_missing_columns();

-- Instruções para executar este script:
-- 1. Acesse o painel do Supabase
-- 2. Vá para a seção "SQL Editor"
-- 3. Cole este script na área de edição
-- 4. Clique em "Run" ou "Execute"
-- 5. Verifique as mensagens na parte inferior para confirmar que o script foi executado com sucesso 