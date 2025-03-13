-- Adicionar coluna categoria à tabela materiais
ALTER TABLE public.materiais
ADD COLUMN IF NOT EXISTS categoria text;

-- Criar um índice para melhorar a performance das consultas por categoria
CREATE INDEX IF NOT EXISTS materiais_categoria_idx ON public.materiais (categoria);

-- Atualizar as políticas de segurança para incluir a nova coluna
ALTER TABLE public.materiais ENABLE ROW LEVEL SECURITY;

-- Criar política de acesso para a nova coluna
CREATE POLICY "Permitir acesso a todos os usuários autenticados"
  ON public.materiais
  FOR ALL
  TO authenticated
  USING (true); 