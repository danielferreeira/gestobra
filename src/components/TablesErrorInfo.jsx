import React from 'react';

/**
 * Componente que exibe informações sobre erros relacionados a tabelas ausentes
 * @param {Object} props Propriedades do componente
 * @param {string} props.tableName Nome da tabela faltante
 * @param {string} props.errorMessage Mensagem de erro completa
 * @returns {JSX.Element} Componente renderizado
 */
const TablesErrorInfo = ({ tableName, errorMessage }) => {
  // Verificar se é uma das tabelas de movimentação de materiais
  const isMovimentacaoTable = tableName === 'movimentacao_materiais' || 
                             tableName === 'movimentacoes_materiais' ||
                             tableName.includes('movimentac');
  
  // Verificar se é um erro específico de campo valor_unitario
  const isValorUnitarioError = errorMessage && 
                             (errorMessage.includes('valor_unitario does not exist') || 
                              errorMessage.includes('movimentacao_materiais.valor_unitario'));
  
  // Verificar se é um erro específico de campo observacao
  const isObservacaoError = errorMessage && 
                          (errorMessage.includes('observacao does not exist') || 
                           errorMessage.includes('movimentacao_materiais.observacao'));
  
  // Verificar se é um erro de campo ausente (qualquer um dos dois)
  const isMissingFieldError = isValorUnitarioError || isObservacaoError;
  
  // Obter o nome do campo que está faltando
  const missingFieldName = isValorUnitarioError ? 'valor_unitario' : 
                          isObservacaoError ? 'observacao' : '';
  
  return (
    <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">
            {isMissingFieldError 
              ? `Campo ${missingFieldName} não encontrado na tabela` 
              : `Tabela não encontrada: ${tableName}`}
          </h3>
          <div className="mt-2 text-sm text-red-700">
            {isMissingFieldError ? (
              <p>
                O campo <code className="bg-red-100 px-1 py-0.5 rounded">{missingFieldName}</code> não existe na tabela <code className="bg-red-100 px-1 py-0.5 rounded">{tableName}</code>.
                Este campo é necessário para o funcionamento correto deste relatório.
              </p>
            ) : (
              <p>
                A tabela <code className="bg-red-100 px-1 py-0.5 rounded">{tableName}</code> não existe no banco de dados.
                Esta tabela é necessária para o funcionamento deste relatório.
              </p>
            )}
            
            <p className="mt-2">
              <strong>Solução:</strong> Um administrador de banco de dados precisa {isMissingFieldError ? 'adicionar este campo à tabela' : 'criar esta tabela'} no Supabase.
            </p>
            
            {isMovimentacaoTable && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
                <p className="font-semibold text-yellow-800">Nota importante:</p>
                <p className="text-yellow-700">
                  O sistema suporta dois nomes possíveis para esta tabela:
                </p>
                <ul className="list-disc list-inside ml-2 mt-1 text-yellow-700">
                  <li><code className="bg-yellow-100 px-1 py-0.5 rounded">movimentacao_materiais</code> (singular)</li>
                  <li><code className="bg-yellow-100 px-1 py-0.5 rounded">movimentacoes_materiais</code> (plural)</li>
                </ul>
                <p className="mt-1 text-yellow-700">
                  Você pode escolher qualquer um dos dois nomes ao criar a tabela. O sistema irá detectar automaticamente qual tabela está disponível.
                </p>
              </div>
            )}
            
            {isMissingFieldError ? (
              <div className="mt-3">
                <p className="font-semibold">Passos para adicionar o campo {missingFieldName}:</p>
                <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                  <li>Acesse o painel administrativo do Supabase</li>
                  <li>Navegue até a seção "SQL Editor"</li>
                  <li>Crie um novo query e cole o SQL abaixo</li>
                  <li>Execute a query</li>
                </ol>
                
                <div className="mt-3">
                  <p className="font-semibold">SQL para adicionar os campos necessários:</p>
                  <pre className="bg-gray-800 text-gray-100 p-3 rounded-md mt-2 text-xs overflow-auto">
                    {`-- Use este script para adicionar os campos necessários à tabela
-- Escolha o script correspondente à tabela que você já tem (singular ou plural)

-- Para a tabela no singular:
ALTER TABLE public.movimentacao_materiais 
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS observacao TEXT,
ADD COLUMN IF NOT EXISTS responsavel VARCHAR(100);

-- Para a tabela no plural:
ALTER TABLE public.movimentacoes_materiais 
ADD COLUMN IF NOT EXISTS valor_unitario NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS observacao TEXT,
ADD COLUMN IF NOT EXISTS responsavel VARCHAR(100);`}
                  </pre>
                </div>
                
                <p className="mt-2 text-orange-700">
                  Um script SQL mais completo está disponível em: <code className="bg-orange-100 px-1 py-0.5 rounded">src/db/add_movimentacoes_campos.sql</code>
                </p>
                
                <p className="mt-2 text-green-700 font-semibold">
                  ✅ Solução recomendada: Para corrigir automaticamente todos os possíveis problemas, use o script <code className="bg-green-100 px-1 py-0.5 rounded">src/db/fix_movimentacoes_table.sql</code> que verifica e adiciona todos os campos necessários.
                </p>
              </div>
            ) : (
              <>
                <div className="mt-3">
                  <p className="font-semibold">Passos para criar a tabela:</p>
                  <ol className="list-decimal list-inside mt-1 ml-2 space-y-1">
                    <li>Acesse o painel administrativo do Supabase</li>
                    <li>Navegue até a seção "SQL Editor"</li>
                    <li>Crie um novo query e cole o SQL abaixo</li>
                    <li>Execute a query</li>
                  </ol>
                </div>
                <div className="mt-3">
                  <p className="font-semibold">SQL para criar a tabela:</p>
                  <pre className="bg-gray-800 text-gray-100 p-3 rounded-md mt-2 text-xs overflow-auto">
                    {isMovimentacaoTable ? 
                      `-- Escolha UM dos dois scripts abaixo:

-- Opção 1: Tabela no singular (movimentacao_materiais)
CREATE TABLE public.movimentacao_materiais (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  data DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  material_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  quantidade NUMERIC(10, 2) NOT NULL,
  valor_unitario NUMERIC(10, 2),
  responsavel VARCHAR(100),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.movimentacao_materiais ENABLE ROW LEVEL SECURITY;

-- Opção 2: Tabela no plural (movimentacoes_materiais)
-- Descomente esta seção se preferir usar o nome no plural
/*
CREATE TABLE public.movimentacoes_materiais (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  data DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada', 'saida')),
  material_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  quantidade NUMERIC(10, 2) NOT NULL,
  valor_unitario NUMERIC(10, 2),
  responsavel VARCHAR(100),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.movimentacoes_materiais ENABLE ROW LEVEL SECURITY;
*/` :
                      
                      `CREATE TABLE public.${tableName} (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  data DATE NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  material_id UUID NOT NULL,
  obra_id UUID NOT NULL,
  quantidade NUMERIC(10, 2) NOT NULL,
  valor_unitario NUMERIC(10, 2),
  responsavel VARCHAR(100),
  observacao TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar Row Level Security
ALTER TABLE public.${tableName} ENABLE ROW LEVEL SECURITY;`}
                  </pre>
                </div>
              </>
            )}

            <p className="mt-4">
              {isMovimentacaoTable ? 
                "Um script SQL completo está disponível no arquivo " :
                "Para mais detalhes, consulte o arquivo "}
              <code className="bg-red-100 px-1 py-0.5 rounded">src/db/create_movimentacoes_table.sql</code>
            </p>
            <div className="mt-3 text-xs text-red-600">
              <p>Erro técnico: {errorMessage}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TablesErrorInfo; 