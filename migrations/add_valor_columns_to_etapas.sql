-- Adicionar colunas de valor à tabela etapas_obra
ALTER TABLE etapas_obra 
ADD COLUMN IF NOT EXISTS valor_previsto DECIMAL DEFAULT 0,
ADD COLUMN IF NOT EXISTS valor_realizado DECIMAL DEFAULT 0;

-- Adicionar comentários para documentação
COMMENT ON COLUMN etapas_obra.valor_previsto IS 'Valor previsto para a etapa';
COMMENT ON COLUMN etapas_obra.valor_realizado IS 'Valor já gasto na etapa';

-- Atualizar o cache do esquema para o Supabase
SELECT pg_catalog.pg_namespace.nspname as schema, pg_catalog.pg_class.relname as table_name
FROM pg_catalog.pg_class
JOIN pg_catalog.pg_namespace ON pg_catalog.pg_class.relnamespace = pg_catalog.pg_namespace.oid
WHERE pg_catalog.pg_class.relname = 'etapas_obra'; 