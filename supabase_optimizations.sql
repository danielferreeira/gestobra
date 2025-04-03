-- =============================================
-- Otimizações de Banco de Dados - GestObra
-- =============================================
-- Script de otimização baseado na análise do schema atual
-- Autor: Claude AI
-- Data: 08/04/2024
-- =============================================

-- Seção 1: Extensões Úteis
-- =============================================
-- Adiciona extensões que podem ser úteis para o sistema

-- Extensão para busca por similaridade textual
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Extensão para análise estatística de consultas
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Seção 2: Índices Estratégicos
-- =============================================
-- Índices para melhorar a performance em consultas frequentes

-- Índices para tabela obras (filtros comuns)
CREATE INDEX IF NOT EXISTS idx_obras_status ON public.obras(status);
CREATE INDEX IF NOT EXISTS idx_obras_user_id ON public.obras(user_id);
CREATE INDEX IF NOT EXISTS idx_obras_data_inicio ON public.obras(data_inicio);

-- Índices para despesas (busca por data, status e filtros financeiros)
CREATE INDEX IF NOT EXISTS idx_despesas_data ON public.despesas(data);
CREATE INDEX IF NOT EXISTS idx_despesas_obra_id ON public.despesas(obra_id);
CREATE INDEX IF NOT EXISTS idx_despesas_status_pagamento ON public.despesas(status_pagamento);
CREATE INDEX IF NOT EXISTS idx_despesas_categoria ON public.despesas(categoria);
CREATE INDEX IF NOT EXISTS idx_despesas_user_id ON public.despesas(user_id);

-- Verificar se a coluna tipo existe antes de criar um índice para ela
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_despesas_tipo ON public.despesas(tipo)';
    END IF;
END $$;

-- Índices para etapas (filtros comuns em dashboards)
CREATE INDEX IF NOT EXISTS idx_etapas_obra_status ON public.etapas_obra(status);
CREATE INDEX IF NOT EXISTS idx_etapas_obra_obra_id ON public.etapas_obra(obra_id);
CREATE INDEX IF NOT EXISTS idx_etapas_obra_data_inicio ON public.etapas_obra(data_inicio);
CREATE INDEX IF NOT EXISTS idx_etapas_obra_data_fim ON public.etapas_obra(data_fim);

-- Índices para documentos
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON public.documentos(tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_obra_id ON public.documentos(obra_id);
CREATE INDEX IF NOT EXISTS idx_documentos_user_id ON public.documentos(user_id);

-- Índices para materiais
CREATE INDEX IF NOT EXISTS idx_materiais_categoria ON public.materiais(categoria);
CREATE INDEX IF NOT EXISTS idx_materiais_nome_trgm ON public.materiais USING gin (nome gin_trgm_ops);

-- Índices para tabela de junção etapas_materiais (melhoria de desempenho em JOINs)
CREATE INDEX IF NOT EXISTS idx_etapas_materiais_etapa_id ON public.etapas_materiais(etapa_id);
CREATE INDEX IF NOT EXISTS idx_etapas_materiais_material_id ON public.etapas_materiais(material_id);

-- Índices para fornecedores
CREATE INDEX IF NOT EXISTS idx_fornecedores_nome_trgm ON public.fornecedores USING gin (nome gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_fornecedores_tipo ON public.fornecedores(tipo);

-- Seção 3: Documentação das Tabelas
-- =============================================
-- Adiciona comentários às tabelas principais para documentação

COMMENT ON TABLE public.obras IS 'Armazena informações sobre as obras, incluindo dados de orçamento, cronograma e progresso';
COMMENT ON TABLE public.despesas IS 'Registra todas as despesas e receitas vinculadas a obras, incluindo status de pagamento e categorização';
COMMENT ON TABLE public.etapas_obra IS 'Contém as etapas de cada obra, com datas previstas, progresso e valores orçados';
COMMENT ON TABLE public.documentos IS 'Armazena documentos relacionados às obras, como contratos, plantas e fotos';
COMMENT ON TABLE public.materiais IS 'Cadastro de materiais utilizados nas obras, com informações de preço e estoque';
COMMENT ON TABLE public.fornecedores IS 'Cadastro de fornecedores de materiais e serviços para as obras';

-- Seção 4: Documentação dos Campos
-- =============================================
-- Adiciona comentários aos campos principais para documentação

-- Campos da tabela obras
COMMENT ON COLUMN public.obras.nome IS 'Nome da obra (ex: Residencial Park Tower)';
COMMENT ON COLUMN public.obras.endereco IS 'Endereço completo da obra';
COMMENT ON COLUMN public.obras.orcamento IS 'Valor total orçado para a obra (em reais)';
COMMENT ON COLUMN public.obras.status IS 'Status atual da obra: planejada, em_andamento, pausada ou concluida';
COMMENT ON COLUMN public.obras.progresso IS 'Percentual de progresso da obra (0-100)';

-- Campos da tabela despesas
COMMENT ON COLUMN public.despesas.descricao IS 'Descrição detalhada da despesa ou receita';
COMMENT ON COLUMN public.despesas.valor IS 'Valor da transação em reais';
COMMENT ON COLUMN public.despesas.status_pagamento IS 'Status do pagamento: pendente, pago ou cancelado';
COMMENT ON COLUMN public.despesas.categoria IS 'Categoria da despesa: material, mao_de_obra, equipamento, servico, imposto ou outro';
COMMENT ON COLUMN public.despesas.obra_id IS 'Referência à obra relacionada com esta despesa';

-- Verificar se a coluna tipo existe antes de documentá-la
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) THEN
        EXECUTE 'COMMENT ON COLUMN public.despesas.tipo IS ''Tipo da transação: despesa ou receita''';
    END IF;
END $$;

-- Seção 5: Melhoria nas Funções
-- =============================================
-- Aprimoramento de funções existentes com tratamento de erros

-- Função melhorada de cálculo de valor total com tratamento de erros
CREATE OR REPLACE FUNCTION public.calc_etapas_materiais_valor_total()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Verificar se material existe
    IF NEW.material_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.materiais WHERE id = NEW.material_id
    ) THEN
        RAISE EXCEPTION 'Material ID % não encontrado', NEW.material_id;
    END IF;

    -- Verificar se etapa existe
    IF NEW.etapa_id IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM public.etapas_obra WHERE id = NEW.etapa_id
    ) THEN
        RAISE EXCEPTION 'Etapa ID % não encontrada', NEW.etapa_id;
    END IF;

    -- Se o valor_unitario não foi fornecido, obter do material
    IF (NEW.valor_unitario IS NULL OR NEW.valor_unitario = 0) AND NEW.material_id IS NOT NULL THEN
        SELECT preco_unitario INTO NEW.valor_unitario
        FROM public.materiais
        WHERE id = NEW.material_id;
        
        IF NEW.valor_unitario IS NULL OR NEW.valor_unitario = 0 THEN
            RAISE EXCEPTION 'Preço unitário do material % não definido ou zero', NEW.material_id;
        END IF;
    END IF;

    -- Calcular o valor total (mesmo que valor_unitario seja nulo)
    NEW.valor_total := NEW.quantidade * COALESCE(NEW.valor_unitario, 0);

    RETURN NEW;
EXCEPTION
    WHEN others THEN
        RAISE EXCEPTION 'Erro ao calcular valor total: %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION public.calc_etapas_materiais_valor_total() IS 'Calcula automaticamente o valor total de materiais em etapas da obra, buscando preço unitário do material se necessário';

-- Função para verificar orçamento excedido em tempo real - agora bloqueando operações inválidas
CREATE OR REPLACE FUNCTION public.check_orcamento_excedido()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
    v_orcamento numeric;
    v_total_despesas numeric;
    v_obra_nome text;
    v_bloquear_excedente boolean;
    v_tem_tipo boolean;
BEGIN
    -- Verificar se a coluna tipo existe na tabela despesas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) INTO v_tem_tipo;

    -- Buscar orçamento da obra
    SELECT orcamento, nome, COALESCE(bloquear_excedente, false) 
    INTO v_orcamento, v_obra_nome, v_bloquear_excedente
    FROM public.obras
    WHERE id = NEW.obra_id;
    
    IF v_orcamento IS NULL THEN
        RAISE EXCEPTION 'Obra ID % não encontrada ou sem orçamento definido', NEW.obra_id;
    END IF;

    -- Calcular total de despesas
    IF v_tem_tipo THEN
        -- Se a coluna tipo existe, filtra apenas despesas
        SELECT COALESCE(SUM(valor), 0) INTO v_total_despesas
        FROM public.despesas
        WHERE obra_id = NEW.obra_id 
        AND tipo = 'despesa'
        AND status_pagamento IN ('pago', 'pendente');
    ELSE
        -- Se não existe a coluna tipo, considera todas as transações
        SELECT COALESCE(SUM(valor), 0) INTO v_total_despesas
        FROM public.despesas
        WHERE obra_id = NEW.obra_id
        AND status_pagamento IN ('pago', 'pendente');
    END IF;

    -- Adicionar o valor da nova despesa ao total
    IF v_tem_tipo THEN
        IF NEW.tipo = 'despesa' THEN
            v_total_despesas := v_total_despesas + NEW.valor;
        END IF;
    ELSE
        -- Se não há coluna tipo, considera sempre como despesa
        v_total_despesas := v_total_despesas + NEW.valor;
    END IF;

    -- Verificar se o orçamento foi excedido
    IF v_total_despesas > v_orcamento THEN
        -- Se configurado para bloquear, impede a inserção/atualização
        IF v_bloquear_excedente THEN
            RAISE EXCEPTION 'Orçamento excedido para a obra % (%). Orçamento: %, Total despesas: %',
                         v_obra_nome, NEW.obra_id, v_orcamento, v_total_despesas;
        ELSE
            -- Apenas emite alerta
            RAISE WARNING 'ALERTA: Orçamento excedido para a obra % (%). Orçamento: %, Total despesas: %',
                         v_obra_nome, NEW.obra_id, v_orcamento, v_total_despesas;
        END IF;
    END IF;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao verificar orçamento: %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION public.check_orcamento_excedido() IS 'Verifica se o orçamento da obra foi excedido após nova despesa e bloqueia ou emite alerta';

-- Criar trigger para verificar orçamento após inserção de despesa
DROP TRIGGER IF EXISTS check_orcamento_after_despesa ON public.despesas;
CREATE TRIGGER check_orcamento_after_despesa
BEFORE INSERT OR UPDATE ON public.despesas
FOR EACH ROW
EXECUTE FUNCTION public.check_orcamento_excedido();

-- Seção 6: Ordenação de Triggers
-- =============================================
-- Especifica a ordem de execução de triggers importantes

-- Garante que o timestamp seja atualizado antes da execução de outros triggers
-- Primeiro remover o trigger existente e recriar com a ordem correta
DROP TRIGGER IF EXISTS "calc_valor_total_trigger" ON "etapas_materiais";
DROP TRIGGER IF EXISTS "update_etapas_materiais_timestamp" ON "etapas_materiais";

-- Recriar na ordem correta
CREATE TRIGGER "update_etapas_materiais_timestamp"
BEFORE UPDATE ON "etapas_materiais"
FOR EACH ROW
EXECUTE FUNCTION update_etapas_materiais_updated_at();

CREATE TRIGGER "calc_valor_total_trigger"
BEFORE INSERT OR UPDATE ON "etapas_materiais"
FOR EACH ROW
EXECUTE FUNCTION calc_etapas_materiais_valor_total();

-- Seção 7: Funções de Utilidade para Relatórios
-- =============================================
-- Funções para facilitar consultas complexas

-- Função para calcular o custo por metro quadrado de uma obra
CREATE OR REPLACE FUNCTION public.calcular_custo_metro_quadrado(p_obra_id uuid)
RETURNS numeric
LANGUAGE plpgsql
AS $function$
DECLARE
    v_total_despesas numeric;
    v_area numeric;
    v_custo_m2 numeric;
    v_tem_tipo boolean;
BEGIN
    -- Verificar se a coluna tipo existe na tabela despesas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) INTO v_tem_tipo;

    -- Obter área construída
    SELECT area_construida INTO v_area
    FROM public.obras
    WHERE id = p_obra_id;

    IF v_area IS NULL THEN
        RAISE EXCEPTION 'Área construída não definida para a obra ID %', p_obra_id;
    END IF;
    
    IF v_area <= 0 THEN
        RAISE EXCEPTION 'Área construída deve ser maior que zero (obra ID %)', p_obra_id;
    END IF;
    
    -- Calcular total de despesas
    IF v_tem_tipo THEN
        -- Se a coluna tipo existe, filtra apenas despesas
        SELECT COALESCE(SUM(valor), 0) INTO v_total_despesas
        FROM public.despesas
        WHERE obra_id = p_obra_id
        AND tipo = 'despesa'
        AND status_pagamento = 'pago';
    ELSE
        -- Se não existe a coluna tipo, considera todas as transações pagas
        SELECT COALESCE(SUM(valor), 0) INTO v_total_despesas
        FROM public.despesas
        WHERE obra_id = p_obra_id
        AND status_pagamento = 'pago';
    END IF;

    -- Calcular custo por m²
    v_custo_m2 := v_total_despesas / v_area;

    RETURN v_custo_m2;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao calcular custo por metro quadrado: %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION public.calcular_custo_metro_quadrado(uuid) IS 'Calcula o custo por metro quadrado de uma obra específica com base nas despesas pagas';

-- Função para obter resumo financeiro de uma obra
CREATE OR REPLACE FUNCTION public.obter_resumo_financeiro(p_obra_id uuid)
RETURNS TABLE(
    categoria text,
    total_despesas numeric,
    percentual_categoria numeric
)
LANGUAGE plpgsql
AS $function$
DECLARE
    v_total numeric;
    v_tem_tipo boolean;
    v_query text;
BEGIN
    -- Verificar se a coluna tipo existe na tabela despesas
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) INTO v_tem_tipo;

    -- Verificar se a obra existe
    IF NOT EXISTS (SELECT 1 FROM public.obras WHERE id = p_obra_id) THEN
        RAISE EXCEPTION 'Obra ID % não encontrada', p_obra_id;
    END IF;

    -- Calcular total geral de despesas
    IF v_tem_tipo THEN
        -- Se a coluna tipo existe, filtra apenas despesas
        SELECT COALESCE(SUM(valor), 0) INTO v_total
        FROM public.despesas
        WHERE obra_id = p_obra_id
        AND tipo = 'despesa'
        AND status_pagamento = 'pago';  -- Considerar apenas despesas pagas
    ELSE
        -- Se não existe a coluna tipo, considera todas as transações pagas
        SELECT COALESCE(SUM(valor), 0) INTO v_total
        FROM public.despesas
        WHERE obra_id = p_obra_id
        AND status_pagamento = 'pago';  -- Considerar apenas despesas pagas
    END IF;

    -- Retornar resumo por categoria
    IF v_tem_tipo THEN
        RETURN QUERY
        SELECT
            d.categoria,
            COALESCE(SUM(d.valor), 0) as total_despesas,
            CASE
                WHEN v_total > 0 THEN ROUND((COALESCE(SUM(d.valor), 0) / v_total) * 100, 2)
                ELSE 0
            END as percentual_categoria
        FROM public.despesas d
        WHERE d.obra_id = p_obra_id
        AND d.tipo = 'despesa'
        AND d.status_pagamento = 'pago'  -- Considerar apenas despesas pagas
        GROUP BY d.categoria
        ORDER BY total_despesas DESC;
    ELSE
        RETURN QUERY
        SELECT
            d.categoria,
            COALESCE(SUM(d.valor), 0) as total_despesas,
            CASE
                WHEN v_total > 0 THEN ROUND((COALESCE(SUM(d.valor), 0) / v_total) * 100, 2)
                ELSE 0
            END as percentual_categoria
        FROM public.despesas d
        WHERE d.obra_id = p_obra_id
        AND d.status_pagamento = 'pago'  -- Considerar apenas despesas pagas
        GROUP BY d.categoria
        ORDER BY total_despesas DESC;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Erro ao gerar resumo financeiro: %', SQLERRM;
END;
$function$;

COMMENT ON FUNCTION public.obter_resumo_financeiro(uuid) IS 'Retorna um resumo financeiro da obra por categoria de despesa com percentuais, considerando apenas despesas pagas';

-- Seção 8: Melhorias para Performance em Consultas
-- =============================================
-- Views materializadas para relatórios frequentes

-- Verificar se a coluna tipo existe na tabela despesas
DO $$
DECLARE
    v_tem_tipo boolean;
    v_view_sql text;
BEGIN
    -- Verificar se a coluna tipo existe
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) INTO v_tem_tipo;

    -- Drop da view materializada existente
    DROP MATERIALIZED VIEW IF EXISTS public.mv_dashboard_financeiro;

    -- Criar versão apropriada da view materializada
    IF v_tem_tipo THEN
        -- Versão com filtro de tipo (despesa/receita)
        v_view_sql := '
        CREATE MATERIALIZED VIEW public.mv_dashboard_financeiro AS
        SELECT
            o.id as obra_id,
            o.nome as obra_nome,
            o.status as obra_status,
            o.orcamento,
            COALESCE(SUM(CASE WHEN d.tipo = ''despesa'' AND d.status_pagamento = ''pago'' THEN d.valor ELSE 0 END), 0) as total_despesas_pagas,
            COALESCE(SUM(CASE WHEN d.tipo = ''despesa'' AND d.status_pagamento = ''pendente'' THEN d.valor ELSE 0 END), 0) as total_despesas_pendentes,
            COALESCE(SUM(CASE WHEN d.tipo = ''receita'' AND d.status_pagamento = ''pago'' THEN d.valor ELSE 0 END), 0) as total_receitas_recebidas,
            COALESCE(SUM(CASE WHEN d.tipo = ''receita'' AND d.status_pagamento = ''pendente'' THEN d.valor ELSE 0 END), 0) as total_receitas_pendentes,
            o.orcamento - COALESCE(SUM(CASE WHEN d.tipo = ''despesa'' THEN d.valor ELSE 0 END), 0) as saldo_orcamento,
            CASE
                WHEN o.orcamento > 0 THEN
                    ROUND((COALESCE(SUM(CASE WHEN d.tipo = ''despesa'' THEN d.valor ELSE 0 END), 0) / o.orcamento) * 100, 2)
                ELSE 0
            END as percentual_orcamento_utilizado,
            CASE
                WHEN o.area_construida > 0 THEN
                    ROUND(COALESCE(SUM(CASE WHEN d.tipo = ''despesa'' AND d.status_pagamento = ''pago'' THEN d.valor ELSE 0 END), 0) / o.area_construida, 2)
                ELSE 0
            END as custo_por_m2
        FROM
            public.obras o
        LEFT JOIN
            public.despesas d ON o.id = d.obra_id
        GROUP BY
            o.id, o.nome, o.status, o.orcamento, o.area_construida
        WITH DATA';
    ELSE
        -- Versão sem a coluna tipo
        v_view_sql := '
        CREATE MATERIALIZED VIEW public.mv_dashboard_financeiro AS
        SELECT
            o.id as obra_id,
            o.nome as obra_nome,
            o.status as obra_status,
            o.orcamento,
            COALESCE(SUM(CASE WHEN d.status_pagamento = ''pago'' THEN d.valor ELSE 0 END), 0) as total_despesas_pagas,
            COALESCE(SUM(CASE WHEN d.status_pagamento = ''pendente'' THEN d.valor ELSE 0 END), 0) as total_despesas_pendentes,
            0 as total_receitas_recebidas,
            0 as total_receitas_pendentes,
            o.orcamento - COALESCE(SUM(d.valor), 0) as saldo_orcamento,
            CASE
                WHEN o.orcamento > 0 THEN
                    ROUND((COALESCE(SUM(d.valor), 0) / o.orcamento) * 100, 2)
                ELSE 0
            END as percentual_orcamento_utilizado,
            CASE
                WHEN o.area_construida > 0 THEN
                    ROUND(COALESCE(SUM(CASE WHEN d.status_pagamento = ''pago'' THEN d.valor ELSE 0 END), 0) / o.area_construida, 2)
                ELSE 0
            END as custo_por_m2
        FROM
            public.obras o
        LEFT JOIN
            public.despesas d ON o.id = d.obra_id
        GROUP BY
            o.id, o.nome, o.status, o.orcamento, o.area_construida
        WITH DATA';
    END IF;

    -- Criar a view materializada
    EXECUTE v_view_sql;

    -- Criar índice para a view materializada
    EXECUTE 'CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_dashboard_financeiro_obra_id ON public.mv_dashboard_financeiro(obra_id)';
END $$;

-- Função para atualizar a view materializada
CREATE OR REPLACE FUNCTION public.refresh_dashboard_financeiro()
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_dashboard_financeiro;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao atualizar view materializada dashboard_financeiro: %', SQLERRM;
END;
$function$;

-- Trigger para atualizar a view materializada quando houver alterações
CREATE OR REPLACE FUNCTION public.trigger_refresh_dashboard_financeiro()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Programar a atualização para o próximo ciclo de commits
    PERFORM pg_notify('refresh_dashboard', 'dashboard_financeiro');
    RETURN NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Erro ao notificar atualização de dashboard: %', SQLERRM;
        RETURN NULL;
END;
$function$;

-- Trigger para despesas
DROP TRIGGER IF EXISTS trigger_refresh_dashboard_after_despesa ON public.despesas;
CREATE TRIGGER trigger_refresh_dashboard_after_despesa
AFTER INSERT OR UPDATE OR DELETE ON public.despesas
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_dashboard_financeiro();

-- Trigger para obras
DROP TRIGGER IF EXISTS trigger_refresh_dashboard_after_obra ON public.obras;
CREATE TRIGGER trigger_refresh_dashboard_after_obra
AFTER INSERT OR UPDATE OR DELETE ON public.obras
FOR EACH STATEMENT
EXECUTE FUNCTION public.trigger_refresh_dashboard_financeiro();

-- Seção 9: Comentários Adicionais para Documentação
-- =============================================

COMMENT ON MATERIALIZED VIEW public.mv_dashboard_financeiro IS 'View materializada para o dashboard financeiro, contendo resumo de despesas, receitas e indicadores por obra';
COMMENT ON FUNCTION public.refresh_dashboard_financeiro() IS 'Atualiza a view materializada do dashboard financeiro';
COMMENT ON FUNCTION public.trigger_refresh_dashboard_financeiro() IS 'Trigger que notifica necessidade de atualização do dashboard quando alterações ocorrem';

-- Comentários adicionais em triggers
COMMENT ON TRIGGER check_orcamento_after_despesa ON public.despesas IS 'Verifica excedente de orçamento após inserção ou atualização de despesas';
COMMENT ON TRIGGER trigger_refresh_dashboard_after_despesa ON public.despesas IS 'Notifica atualização do dashboard após alterações em despesas';
COMMENT ON TRIGGER trigger_refresh_dashboard_after_obra ON public.obras IS 'Notifica atualização do dashboard após alterações em obras';

-- Seção 10: Adição de coluna para controle de orçamento
-- =============================================
-- Adiciona coluna para controlar se deve bloquear operações que excedam o orçamento

-- Adicionar coluna para definir se deve bloquear operações que excedam o orçamento
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'obras' AND column_name = 'bloquear_excedente'
    ) THEN
        ALTER TABLE public.obras 
        ADD COLUMN bloquear_excedente BOOLEAN DEFAULT false;
        
        COMMENT ON COLUMN public.obras.bloquear_excedente IS 'Define se deve bloquear operações que excedam o orçamento da obra';
    END IF;
END $$;

-- Seção 11: Adicionar coluna tipo à tabela despesas se não existir
-- =============================================
-- Adiciona a coluna tipo para distinguir entre despesas e receitas

DO $$
BEGIN
    -- Adicionar coluna se não existir
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' AND table_name = 'despesas' AND column_name = 'tipo'
    ) THEN
        -- Adiciona a coluna tipo
        ALTER TABLE public.despesas 
        ADD COLUMN tipo VARCHAR(20) DEFAULT 'despesa';
        
        -- Adiciona comentário para a coluna
        COMMENT ON COLUMN public.despesas.tipo IS 'Tipo da transação: despesa ou receita';
        
        -- Criar índice para a nova coluna
        CREATE INDEX idx_despesas_tipo ON public.despesas(tipo);
        
        RAISE NOTICE 'Coluna "tipo" adicionada à tabela "despesas" com índice.';
    ELSE
        RAISE NOTICE 'Coluna "tipo" já existe na tabela "despesas".';
    END IF;
END $$; 