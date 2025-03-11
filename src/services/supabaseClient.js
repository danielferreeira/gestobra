import { createClient } from '@supabase/supabase-js';

// Essas variáveis são obtidas do arquivo .env
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Verificar se as variáveis de ambiente estão definidas
if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Erro: Variáveis de ambiente do Supabase não estão definidas');
  console.error('VITE_SUPABASE_URL:', supabaseUrl ? 'Definido' : 'Não definido');
  console.error('VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? 'Definido' : 'Não definido');
}

// Criando o cliente do Supabase com opções adicionais
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    // Adicionar headers para evitar problemas de CORS
    headers: { 'x-application-name': 'gestobra' }
  },
  // Configurações para evitar problemas de rede
  realtime: {
    timeout: 30000 // 30 segundos de timeout para operações em tempo real
  }
});

// Função auxiliar para adicionar timeout às requisições
const withTimeout = async (promise, timeoutMs = 10000, errorMessage = 'Operação expirou') => {
  let timeoutId;
  
  // Criar uma promise que rejeita após o timeout
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(errorMessage));
    }, timeoutMs);
  });
  
  try {
    // Executar a promise original com timeout
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId);
    return result;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
};

// Funções de autenticação com timeout
export const signIn = async (email, password) => {
  try {
    const result = await withTimeout(
      supabase.auth.signInWithPassword({
        email,
        password,
      }),
      15000, // 15 segundos de timeout
      'Timeout ao fazer login'
    );
    
    return result;
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const result = await withTimeout(
      supabase.auth.signOut(),
      10000, // 10 segundos de timeout
      'Timeout ao fazer logout'
    );
    
    return result;
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    return { error };
  }
};

export const getCurrentUser = async () => {
  try {
    const result = await withTimeout(
      supabase.auth.getUser(),
      10000, // 10 segundos de timeout
      'Timeout ao obter usuário atual'
    );
    
    return result;
  } catch (error) {
    console.error('Erro ao obter usuário atual:', error);
    return { data: null, error };
  }
};

// Função para habilitar autenticação de dois fatores
export const setupTwoFactorAuth = async () => {
  try {
    const result = await withTimeout(
      supabase.auth.mfa.enroll(),
      15000, // 15 segundos de timeout
      'Timeout ao configurar 2FA'
    );
    
    return result;
  } catch (error) {
    console.error('Erro ao configurar 2FA:', error);
    return { data: null, error };
  }
};

// Função para verificar o código 2FA
export const verifyTwoFactorAuth = async (factorId, challengeId, code) => {
  try {
    const result = await withTimeout(
      supabase.auth.mfa.challenge({
        factorId,
        challengeId,
        code,
      }),
      15000, // 15 segundos de timeout
      'Timeout ao verificar código 2FA'
    );
    
    return result;
  } catch (error) {
    console.error('Erro ao verificar código 2FA:', error);
    return { data: null, error };
  }
}; 