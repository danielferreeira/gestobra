import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão definidas');
  process.exit(1);
}

// Criar cliente Supabase com chave de serviço para acesso administrativo
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  try {
    console.log('Iniciando migração...');
    
    // Ler o arquivo SQL
    const sqlFilePath = path.join(process.cwd(), 'migrations', 'add_valor_columns_to_etapas.sql');
    const sqlContent = fs.readFileSync(sqlFilePath, 'utf8');
    
    // Executar a migração
    const { error } = await supabase.rpc('exec_sql', { sql: sqlContent });
    
    if (error) {
      throw error;
    }
    
    console.log('Migração concluída com sucesso!');
    
    // Verificar se as colunas foram adicionadas
    const { data, error: checkError } = await supabase
      .from('etapas_obra')
      .select('valor_previsto, valor_realizado')
      .limit(1);
    
    if (checkError) {
      console.warn('Aviso: Não foi possível verificar as colunas:', checkError.message);
    } else {
      console.log('Colunas adicionadas e verificadas com sucesso!');
    }
    
  } catch (error) {
    console.error('Erro ao executar migração:', error);
    process.exit(1);
  }
}

runMigration(); 