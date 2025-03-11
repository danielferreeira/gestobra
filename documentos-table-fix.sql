-- Verificar se a tabela documentos existe e criar se não existir
CREATE TABLE IF NOT EXISTS public.documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
  titulo TEXT,
  descricao TEXT,
  tipo TEXT,
  arquivo_url TEXT,
  arquivo_nome TEXT,
  user_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Adicionar colunas se não existirem
DO $$
BEGIN
  -- Verificar e adicionar coluna titulo
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'titulo') THEN
    ALTER TABLE public.documentos ADD COLUMN titulo TEXT;
  END IF;

  -- Verificar e adicionar coluna arquivo_url
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'arquivo_url') THEN
    ALTER TABLE public.documentos ADD COLUMN arquivo_url TEXT;
  END IF;

  -- Verificar e adicionar coluna arquivo_nome
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'arquivo_nome') THEN
    ALTER TABLE public.documentos ADD COLUMN arquivo_nome TEXT;
  END IF;
END
$$;

-- Renomear colunas antigas se necessário
DO $$
BEGIN
  -- Verificar se existe coluna nome mas não existe titulo
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'nome') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'titulo') THEN
    ALTER TABLE public.documentos RENAME COLUMN nome TO titulo;
  END IF;

  -- Verificar se existe coluna url mas não existe arquivo_url
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'url') 
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'documentos' AND column_name = 'arquivo_url') THEN
    ALTER TABLE public.documentos RENAME COLUMN url TO arquivo_url;
  END IF;
END
$$;

-- Comentário para o usuário
COMMENT ON TABLE public.documentos IS 'Tabela para armazenar documentos das obras'; 