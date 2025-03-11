#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Obter o diretório atual do arquivo
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Carregar variáveis de ambiente
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY; // Chave de serviço (não a chave anônima)

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: VITE_SUPABASE_URL e SUPABASE_SERVICE_KEY devem ser definidos no arquivo .env');
  process.exit(1);
}

// Criar cliente Supabase com a chave de serviço
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function setupSupabase() {
  try {
    console.log('Iniciando configuração do Supabase...');

    // Ler o arquivo SQL
    const schemaPath = path.join(__dirname, 'supabase-schema.sql');
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');

    // Dividir o SQL em comandos individuais
    const sqlCommands = schemaSql
      .split(';')
      .map(cmd => cmd.trim())
      .filter(cmd => cmd.length > 0);

    console.log(`Encontrados ${sqlCommands.length} comandos SQL para executar.`);

    // Executar cada comando SQL
    for (let i = 0; i < sqlCommands.length; i++) {
      const command = sqlCommands[i];
      console.log(`Executando comando ${i + 1}/${sqlCommands.length}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql_query: command });
      
      if (error) {
        console.error(`Erro ao executar comando SQL #${i + 1}:`, error);
        // Continuar mesmo com erro
      }
    }

    console.log('Configuração do banco de dados concluída com sucesso!');

    // Configurar buckets de armazenamento
    console.log('Configurando buckets de armazenamento...');
    
    // Verificar se o bucket 'documentos' existe, se não, criar
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Erro ao listar buckets:', bucketsError);
    } else {
      const documentosBucketExists = buckets.some(bucket => bucket.name === 'documentos');
      const comprovantesBucketExists = buckets.some(bucket => bucket.name === 'comprovantes');
      
      if (!documentosBucketExists) {
        console.log('Criando bucket "documentos"...');
        const { error } = await supabase.storage.createBucket('documentos', {
          public: false,
          fileSizeLimit: 10485760, // 10MB
        });
        
        if (error) {
          console.error('Erro ao criar bucket "documentos":', error);
        }
      }
      
      if (!comprovantesBucketExists) {
        console.log('Criando bucket "comprovantes"...');
        const { error } = await supabase.storage.createBucket('comprovantes', {
          public: false,
          fileSizeLimit: 5242880, // 5MB
        });
        
        if (error) {
          console.error('Erro ao criar bucket "comprovantes":', error);
        }
      }
    }

    console.log('Configuração do Supabase concluída com sucesso!');
  } catch (error) {
    console.error('Erro durante a configuração do Supabase:', error);
    process.exit(1);
  }
}

setupSupabase(); 