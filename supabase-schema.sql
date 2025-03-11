-- Tabela de Obras
CREATE TABLE obras (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  endereco TEXT NOT NULL,
  orcamento DECIMAL(12, 2) NOT NULL,
  data_inicio DATE NOT NULL,
  data_previsao_termino DATE,
  data_termino DATE,
  status TEXT NOT NULL CHECK (status IN ('planejada', 'em_andamento', 'pausada', 'concluida')),
  progresso INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  descricao TEXT,
  area_construida DECIMAL(10, 2),
  responsavel TEXT,
  cliente TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Tabela de Etapas da Obra
CREATE TABLE etapas_obra (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio DATE,
  data_fim DATE,
  status TEXT NOT NULL CHECK (status IN ('pendente', 'em_andamento', 'concluida')),
  progresso INTEGER NOT NULL DEFAULT 0 CHECK (progresso >= 0 AND progresso <= 100),
  ordem INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Despesas
CREATE TABLE despesas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  descricao TEXT NOT NULL,
  valor DECIMAL(12, 2) NOT NULL,
  data DATE NOT NULL,
  categoria TEXT NOT NULL CHECK (categoria IN ('material', 'mao_de_obra', 'equipamento', 'servico', 'imposto', 'outro')),
  fornecedor TEXT,
  nota_fiscal TEXT,
  comprovante_url TEXT,
  status_pagamento TEXT NOT NULL CHECK (status_pagamento IN ('pendente', 'pago', 'cancelado')),
  data_pagamento DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tabela de Materiais
CREATE TABLE materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nome TEXT NOT NULL,
  descricao TEXT,
  unidade TEXT NOT NULL,
  preco_unitario DECIMAL(12, 2),
  quantidade_estoque DECIMAL(12, 2) DEFAULT 0,
  estoque_minimo DECIMAL(12, 2) DEFAULT 0,
  fornecedor TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Movimentação de Materiais
CREATE TABLE movimentacao_materiais (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  material_id UUID REFERENCES materiais(id) ON DELETE CASCADE,
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  quantidade DECIMAL(12, 2) NOT NULL,
  data DATE NOT NULL,
  descricao TEXT,
  responsavel TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tabela de Documentos
CREATE TABLE documentos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
  titulo TEXT NOT NULL,
  descricao TEXT,
  tipo TEXT NOT NULL CHECK (tipo IN ('contrato', 'planta', 'orcamento', 'nota_fiscal', 'alvara', 'outro')),
  arquivo_url TEXT NOT NULL,
  arquivo_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Políticas de Segurança RLS (Row Level Security)

-- Habilitar RLS em todas as tabelas
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;
ALTER TABLE etapas_obra ENABLE ROW LEVEL SECURITY;
ALTER TABLE despesas ENABLE ROW LEVEL SECURITY;
ALTER TABLE materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacao_materiais ENABLE ROW LEVEL SECURITY;
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

-- Política para obras (usuários só podem ver suas próprias obras)
CREATE POLICY "Usuários podem ver suas próprias obras" ON obras
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias obras" ON obras
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias obras" ON obras
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem excluir suas próprias obras" ON obras
  FOR DELETE USING (auth.uid() = user_id);

-- Funções e Triggers para atualização automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger em todas as tabelas
CREATE TRIGGER update_obras_updated_at
BEFORE UPDATE ON obras
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_etapas_obra_updated_at
BEFORE UPDATE ON etapas_obra
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_despesas_updated_at
BEFORE UPDATE ON despesas
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_materiais_updated_at
BEFORE UPDATE ON materiais
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_documentos_updated_at
BEFORE UPDATE ON documentos
FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Configuração de Storage
-- Criar buckets para armazenamento de arquivos
-- Nota: Isso deve ser feito manualmente no console do Supabase

-- Instruções para configuração de Storage:
-- 1. Criar bucket 'documentos' para armazenar documentos das obras
-- 2. Criar bucket 'comprovantes' para armazenar comprovantes de pagamento
-- 3. Configurar políticas de acesso para permitir upload e download apenas para usuários autenticados 