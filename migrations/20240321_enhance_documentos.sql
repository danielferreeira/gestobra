-- Enhance documentos table with new columns
ALTER TABLE documentos
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS versao text DEFAULT '1.0',
ADD COLUMN IF NOT EXISTS tamanho bigint,
ADD COLUMN IF NOT EXISTS mime_type text,
ADD COLUMN IF NOT EXISTS ultima_visualizacao timestamp with time zone,
ADD COLUMN IF NOT EXISTS compartilhamentos integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Add indexes for improved performance
CREATE INDEX IF NOT EXISTS idx_documentos_tags ON documentos USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_documentos_tipo ON documentos (tipo);
CREATE INDEX IF NOT EXISTS idx_documentos_created_at ON documentos (created_at);

-- Update RLS policies
ALTER TABLE documentos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Documentos são visíveis para usuários autenticados da obra"
ON documentos FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = documentos.obra_id
    AND (
      obras.user_id = auth.uid() OR
      obras.id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem inserir documentos em suas obras"
ON documentos FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = documentos.obra_id
    AND (
      obras.user_id = auth.uid() OR
      obras.id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem atualizar documentos de suas obras"
ON documentos FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = documentos.obra_id
    AND (
      obras.user_id = auth.uid() OR
      obras.id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
      )
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = documentos.obra_id
    AND (
      obras.user_id = auth.uid() OR
      obras.id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Usuários podem deletar documentos de suas obras"
ON documentos FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM obras
    WHERE obras.id = documentos.obra_id
    AND (
      obras.user_id = auth.uid() OR
      obras.id IN (
        SELECT obra_id FROM obras_usuarios
        WHERE user_id = auth.uid()
      )
    )
  )
);

-- Create function to update ultima_visualizacao
CREATE OR REPLACE FUNCTION update_documento_visualizacao()
RETURNS trigger AS $$
BEGIN
  UPDATE documentos
  SET ultima_visualizacao = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for visualizacao
DROP TRIGGER IF EXISTS update_documento_visualizacao_trigger ON documentos;
CREATE TRIGGER update_documento_visualizacao_trigger
  AFTER UPDATE OF ultima_visualizacao ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION update_documento_visualizacao();

-- Create function to increment compartilhamentos
CREATE OR REPLACE FUNCTION increment_documento_compartilhamentos()
RETURNS trigger AS $$
BEGIN
  UPDATE documentos
  SET compartilhamentos = compartilhamentos + 1
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for compartilhamentos
DROP TRIGGER IF EXISTS increment_documento_compartilhamentos_trigger ON documentos;
CREATE TRIGGER increment_documento_compartilhamentos_trigger
  AFTER UPDATE OF compartilhamentos ON documentos
  FOR EACH ROW
  EXECUTE FUNCTION increment_documento_compartilhamentos(); 