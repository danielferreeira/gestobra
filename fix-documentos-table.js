import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Obter URL e chave anônima do Supabase
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY devem estar definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase
const supabase = createClient(supabaseUrl, supabaseKey);

// Função para verificar e corrigir a tabela documentos
async function fixDocumentosTable() {
  console.log('Verificando a estrutura da tabela documentos...');

  try {
    // Verificar se a tabela documentos existe tentando fazer uma consulta
    const { data: documentos, error: documentosError } = await supabase
      .from('documentos')
      .select('id')
      .limit(1);

    if (documentosError && documentosError.code === '42P01') {
      // Erro 42P01 significa que a tabela não existe
      console.log('A tabela documentos não existe. Você precisa criá-la manualmente no painel do Supabase.');
      console.log('Estrutura recomendada:');
      console.log(`
        CREATE TABLE public.documentos (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          obra_id UUID NOT NULL REFERENCES public.obras(id) ON DELETE CASCADE,
          titulo TEXT NOT NULL,
          descricao TEXT,
          tipo TEXT NOT NULL,
          arquivo_url TEXT NOT NULL,
          arquivo_nome TEXT NOT NULL,
          user_id UUID REFERENCES auth.users(id),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE
        );
      `);
      return;
    } else if (documentosError) {
      throw new Error(`Erro ao verificar tabela documentos: ${documentosError.message}`);
    }

    console.log('A tabela documentos existe. Verificando registros...');

    // Verificar se há registros na tabela
    const { data: records, error: recordsError } = await supabase
      .from('documentos')
      .select('*')
      .limit(5);

    if (recordsError) {
      throw new Error(`Erro ao verificar registros: ${recordsError.message}`);
    }

    console.log(`A tabela documentos tem ${records ? records.length : 0} registros.`);

    if (records && records.length > 0) {
      // Verificar as colunas existentes
      const primeiroRegistro = records[0];
      const colunas = Object.keys(primeiroRegistro);
      console.log('Colunas existentes:', colunas);

      // Verificar se as colunas necessárias existem
      const colunasNecessarias = ['titulo', 'arquivo_url', 'arquivo_nome'];
      const colunasFaltantes = colunasNecessarias.filter(col => !colunas.includes(col));

      if (colunasFaltantes.length > 0) {
        console.log(`Colunas faltantes: ${colunasFaltantes.join(', ')}`);
        console.log('Você precisa adicionar estas colunas manualmente no painel do Supabase.');
      } else {
        console.log('Todas as colunas necessárias existem!');
      }

      // Verificar se há colunas antigas que precisam ser renomeadas
      if (colunas.includes('nome') && !colunas.includes('titulo')) {
        console.log('A coluna "nome" existe, mas "titulo" não. Você deve renomear "nome" para "titulo".');
      }

      if (colunas.includes('url') && !colunas.includes('arquivo_url')) {
        console.log('A coluna "url" existe, mas "arquivo_url" não. Você deve renomear "url" para "arquivo_url".');
      }

      // Mostrar exemplo de registro
      console.log('Exemplo de registro:');
      console.log(primeiroRegistro);
    } else {
      console.log('Não há registros na tabela documentos para analisar a estrutura.');
    }

    // Tentar inserir um registro de teste para verificar a estrutura
    console.log('Tentando inserir um registro de teste...');
    
    try {
      const { data: testInsert, error: insertError } = await supabase
        .from('documentos')
        .insert([
          {
            obra_id: '00000000-0000-0000-0000-000000000000', // ID inválido para teste
            titulo: 'Documento de Teste',
            descricao: 'Este é um documento de teste para verificar a estrutura da tabela',
            tipo: 'outro',
            arquivo_url: 'https://exemplo.com/arquivo.pdf',
            arquivo_nome: 'arquivo.pdf'
          }
        ])
        .select();

      if (insertError) {
        if (insertError.code === '23503') {
          // Erro de chave estrangeira, o que é esperado com o ID inválido
          console.log('Teste de inserção falhou com erro de chave estrangeira, o que é esperado.');
          console.log('A estrutura da tabela parece estar correta!');
        } else {
          console.log(`Erro ao inserir registro de teste: ${insertError.message}`);
          console.log('Você pode precisar ajustar a estrutura da tabela manualmente.');
        }
      } else {
        console.log('Registro de teste inserido com sucesso!');
        
        // Remover o registro de teste
        await supabase
          .from('documentos')
          .delete()
          .eq('id', testInsert[0].id);
          
        console.log('Registro de teste removido.');
      }
    } catch (insertTestError) {
      console.log(`Erro ao testar inserção: ${insertTestError.message}`);
    }

    console.log('Verificação da tabela documentos concluída!');
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

// Executar a função
fixDocumentosTable()
  .then(() => {
    console.log('Processo concluído.');
  })
  .catch(error => {
    console.error('Erro não tratado:', error);
  }); 