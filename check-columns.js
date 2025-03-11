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

async function checkColumns() {
  try {
    console.log('Verificando as colunas da tabela documentos...');

    // Obter definição da tabela
    const { data, error } = await supabase
      .from('documentos')
      .select('*')
      .limit(0);

    if (error) {
      console.error('Erro ao verificar tabela documentos:', error);
      return;
    }

    // Verificar se a resposta tem a propriedade para obter as colunas
    if (data) {
      // Criar um registro de teste para verificar as colunas
      const testData = {
        obra_id: '00000000-0000-0000-0000-000000000000', // UUID fictício
        titulo: 'Documento de Teste',
        descricao: 'Descrição de teste',
        tipo: 'contrato',
        arquivo_url: 'https://exemplo.com/arquivo.pdf',
        arquivo_nome: 'arquivo.pdf',
        user_id: '00000000-0000-0000-0000-000000000000' // UUID fictício
      };

      // Tentar inserir o registro de teste
      const { data: insertData, error: insertError } = await supabase
        .from('documentos')
        .insert([testData])
        .select();

      if (insertError) {
        console.error('Erro ao inserir registro de teste:', insertError);
        
        // Verificar se o erro é devido à falta de colunas
        if (insertError.message.includes('column') && insertError.message.includes('does not exist')) {
          console.log('A tabela documentos não tem todas as colunas necessárias.');
          console.log('Erro específico:', insertError.message);
        }
      } else {
        console.log('Registro de teste inserido com sucesso!');
        console.log('Dados do registro:', insertData);
        
        // Excluir o registro de teste
        const { error: deleteError } = await supabase
          .from('documentos')
          .delete()
          .eq('id', insertData[0].id);
        
        if (deleteError) {
          console.error('Erro ao excluir registro de teste:', deleteError);
        } else {
          console.log('Registro de teste excluído com sucesso!');
        }
      }
    }

    console.log('Verificação concluída!');
  } catch (error) {
    console.error('Erro durante a verificação:', error);
  }
}

checkColumns(); 