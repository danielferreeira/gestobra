import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem ser definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com a chave anônima
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable() {
  try {
    console.log('Verificando a estrutura da tabela documentos...');

    // Verificar se a tabela documentos existe
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') { // Código para "tabela não existe"
        console.log('A tabela documentos não existe.');
      } else {
        console.error('Erro ao verificar tabela documentos:', error);
      }
    } else {
      console.log('A tabela documentos existe.');
      console.log('Exemplo de registro:', data);
    }

    console.log('Verificação concluída!');
  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

checkTable(); 