import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

// Criar cliente Supabase com a chave anônima
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY são necessários no arquivo .env');
  process.exit(1);
}

console.log('URL do Supabase:', supabaseUrl);
console.log('Chave anônima configurada:', supabaseKey ? 'Sim' : 'Não');

const supabase = createClient(supabaseUrl, supabaseKey);

async function createDocumentosTable() {
  try {
    console.log('Verificando a tabela documentos...');
    
    // Verificar se a tabela existe
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .limit(1);
    
    if (error && error.code === '42P01') {
      console.log('A tabela documentos não existe. Criando tabela...');
      
      // Criar a tabela documentos
      const { error: createError } = await supabase.rpc('create_documentos_table');
      
      if (createError) {
        console.error('Erro ao criar a tabela documentos:', createError);
        return;
      }
      
      console.log('Tabela documentos criada com sucesso!');
    } else if (error) {
      console.error('Erro ao verificar a tabela documentos:', error);
      return;
    } else {
      console.log('A tabela documentos já existe.');
      
      // Verificar se as colunas necessárias existem
      const { data: testData, error: testError } = await supabase
        .from('documentos')
        .insert([
          {
            obra_id: 1,
            nome: 'Documento de Teste',
            descricao: 'Descrição de teste',
            tipo: 'contrato',
            url: 'https://exemplo.com/arquivo.pdf',
            user_id: '00000000-0000-0000-0000-000000000000'
          }
        ])
        .select()
        .single();
      
      if (testError) {
        if (testError.message.includes('violates foreign key constraint')) {
          console.log('A tabela tem as colunas necessárias, mas a inserção falhou devido a restrições de chave estrangeira.');
        } else {
          console.error('Erro ao testar a estrutura da tabela:', testError);
          
          // Tentar adicionar as colunas que podem estar faltando
          console.log('Tentando adicionar colunas que podem estar faltando...');
          
          const columnsToAdd = [
            { name: 'nome', type: 'text' },
            { name: 'url', type: 'text' },
            { name: 'descricao', type: 'text' },
            { name: 'tipo', type: 'text' },
            { name: 'user_id', type: 'uuid' }
          ];
          
          for (const column of columnsToAdd) {
            try {
              await supabase.rpc('add_column_if_not_exists', {
                table_name: 'documentos',
                column_name: column.name,
                column_type: column.type
              });
              console.log(`Coluna ${column.name} adicionada ou já existe.`);
            } catch (columnError) {
              console.error(`Erro ao adicionar a coluna ${column.name}:`, columnError);
            }
          }
        }
      } else {
        console.log('A tabela documentos tem todas as colunas necessárias.');
        console.log('Registro de teste inserido:', testData);
        
        // Remover o registro de teste
        await supabase
          .from('documentos')
          .delete()
          .eq('id', testData.id);
        
        console.log('Registro de teste removido.');
      }
    }
  } catch (error) {
    console.error('Erro ao criar/verificar a tabela documentos:', error);
  }
}

// Criar função RPC para criar a tabela documentos
async function createRpcFunctions() {
  try {
    console.log('Criando funções RPC...');
    
    // Função para criar a tabela documentos
    const createTableSql = `
      CREATE OR REPLACE FUNCTION create_documentos_table()
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      BEGIN
        CREATE TABLE IF NOT EXISTS public.documentos (
          id SERIAL PRIMARY KEY,
          obra_id INTEGER NOT NULL,
          nome TEXT,
          descricao TEXT,
          tipo TEXT,
          url TEXT,
          user_id UUID,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        
        -- Adicionar comentário à tabela
        COMMENT ON TABLE public.documentos IS 'Documentos relacionados às obras';
      END;
      $$;
    `;
    
    // Função para adicionar uma coluna se não existir
    const addColumnSql = `
      CREATE OR REPLACE FUNCTION add_column_if_not_exists(
        table_name text,
        column_name text,
        column_type text
      )
      RETURNS void
      LANGUAGE plpgsql
      SECURITY DEFINER
      AS $$
      DECLARE
        column_exists boolean;
      BEGIN
        SELECT EXISTS (
          SELECT 1
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = add_column_if_not_exists.table_name
            AND column_name = add_column_if_not_exists.column_name
        ) INTO column_exists;
        
        IF NOT column_exists THEN
          EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', 
                         add_column_if_not_exists.table_name, 
                         add_column_if_not_exists.column_name, 
                         add_column_if_not_exists.column_type);
        END IF;
      END;
      $$;
    `;
    
    // Executar as funções SQL
    const { error: createTableError } = await supabase.rpc('exec_sql', { sql: createTableSql });
    if (createTableError) {
      console.error('Erro ao criar a função create_documentos_table:', createTableError);
    } else {
      console.log('Função create_documentos_table criada com sucesso!');
    }
    
    const { error: addColumnError } = await supabase.rpc('exec_sql', { sql: addColumnSql });
    if (addColumnError) {
      console.error('Erro ao criar a função add_column_if_not_exists:', addColumnError);
    } else {
      console.log('Função add_column_if_not_exists criada com sucesso!');
    }
    
  } catch (error) {
    console.error('Erro ao criar funções RPC:', error);
  }
}

// Executar as funções
async function main() {
  try {
    await createRpcFunctions();
    await createDocumentosTable();
    console.log('Processo concluído!');
  } catch (error) {
    console.error('Erro no processo principal:', error);
  }
}

main(); 