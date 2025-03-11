-- Verificar se a tabela obras existe
CREATE TABLE IF NOT EXISTS obras (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nome text NOT NULL,
    descricao text,
    endereco text,
    orcamento decimal,
    data_inicio timestamp with time zone,
    status text DEFAULT 'pendente',
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now()
);

-- Adicionar coluna data_fim à tabela obras
ALTER TABLE obras
ADD COLUMN IF NOT EXISTS data_fim timestamp with time zone;

-- Adicionar comentário à coluna
COMMENT ON COLUMN obras.data_fim IS 'Data de término prevista da obra';

-- Atualizar RLS policies para incluir a nova coluna
ALTER TABLE obras ENABLE ROW LEVEL SECURITY;

-- Atualizar ou criar política de segurança
CREATE POLICY "Usuários podem ver suas próprias obras"
ON obras FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR
    id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Usuários podem criar suas próprias obras"
ON obras FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias obras"
ON obras FOR UPDATE
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar suas próprias obras"
ON obras FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- Criar índice para melhorar performance de consultas por data
CREATE INDEX IF NOT EXISTS idx_obras_data_fim ON obras (data_fim); 