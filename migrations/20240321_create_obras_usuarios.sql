-- Criar tabela de relacionamento entre obras e usuários
CREATE TABLE IF NOT EXISTS obras_usuarios (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    obra_id uuid REFERENCES obras(id) ON DELETE CASCADE,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    permissao text DEFAULT 'visualizar' CHECK (permissao IN ('visualizar', 'editar', 'admin')),
    created_at timestamp with time zone DEFAULT now(),
    UNIQUE(obra_id, user_id)
);

-- Adicionar comentários à tabela e colunas
COMMENT ON TABLE obras_usuarios IS 'Tabela de relacionamento entre obras e usuários com permissões';
COMMENT ON COLUMN obras_usuarios.permissao IS 'Nível de permissão do usuário na obra: visualizar, editar ou admin';

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_obras_usuarios_obra_id ON obras_usuarios(obra_id);
CREATE INDEX IF NOT EXISTS idx_obras_usuarios_user_id ON obras_usuarios(user_id);

-- Habilitar RLS
ALTER TABLE obras_usuarios ENABLE ROW LEVEL SECURITY;

-- Criar políticas de segurança
CREATE POLICY "Usuários podem ver suas próprias associações"
ON obras_usuarios FOR SELECT
TO authenticated
USING (
    auth.uid() = user_id OR
    obra_id IN (
        SELECT id FROM obras
        WHERE user_id = auth.uid()
    )
);

CREATE POLICY "Apenas administradores podem criar associações"
ON obras_usuarios FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM obras
        WHERE id = obra_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Apenas administradores podem atualizar associações"
ON obras_usuarios FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM obras
        WHERE id = obra_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Apenas administradores podem deletar associações"
ON obras_usuarios FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM obras
        WHERE id = obra_id
        AND user_id = auth.uid()
    )
); 