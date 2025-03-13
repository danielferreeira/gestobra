-- Função para verificar se uma tabela existe
CREATE OR REPLACE FUNCTION public.check_table_exists(table_name text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  table_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public'
    AND table_name = check_table_exists.table_name
  ) INTO table_exists;
  
  RETURN table_exists;
END;
$$;

-- Função para atualizar o campo updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar a tabela diretamente sem usar função
CREATE TABLE IF NOT EXISTS public.etapas_materiais (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  etapa_id uuid REFERENCES public.etapas_obra(id) ON DELETE CASCADE,
  material_id uuid REFERENCES public.materiais(id) ON DELETE CASCADE,
  obra_id uuid REFERENCES public.obras(id) ON DELETE CASCADE,
  quantidade numeric NOT NULL DEFAULT 0,
  valor_total numeric,
  data_compra date,
  nota_fiscal text,
  observacoes text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  etapa_nome text
);

-- Adicionar comentários
COMMENT ON TABLE public.etapas_materiais IS 'Tabela que relaciona materiais com etapas de obras';

-- Configurar RLS (Row Level Security)
ALTER TABLE public.etapas_materiais ENABLE ROW LEVEL SECURITY;

-- Criar políticas de acesso
CREATE POLICY "Permitir acesso a todos os usuários autenticados"
  ON public.etapas_materiais
  FOR ALL
  TO authenticated
  USING (true);
  
-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS etapas_materiais_etapa_id_idx ON public.etapas_materiais (etapa_id);
CREATE INDEX IF NOT EXISTS etapas_materiais_material_id_idx ON public.etapas_materiais (material_id);
CREATE INDEX IF NOT EXISTS etapas_materiais_obra_id_idx ON public.etapas_materiais (obra_id);

-- Criar trigger para atualizar o campo updated_at
DROP TRIGGER IF EXISTS set_updated_at_timestamp_etapas_materiais ON public.etapas_materiais;
CREATE TRIGGER set_updated_at_timestamp_etapas_materiais
BEFORE UPDATE ON public.etapas_materiais
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at(); 