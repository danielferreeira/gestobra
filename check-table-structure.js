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

async function checkTable() {
  try {
    console.log('Verificando acesso à tabela documentos...');
    
    // Tentar selecionar dados da tabela documentos
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .limit(5);
    
    if (error) {
      console.error('Erro ao acessar a tabela documentos:', error);
      return;
    }
    
    console.log('Acesso à tabela documentos bem-sucedido.');
    console.log('Número de registros encontrados:', data.length);
    
    if (data.length > 0) {
      console.log('Colunas disponíveis:', Object.keys(data[0]).join(', '));
      console.log('Primeiro registro:', JSON.stringify(data[0], null, 2));
    }
    
  } catch (error) {
    console.error('Erro ao verificar a tabela:', error);
  }
}

checkTable(); 