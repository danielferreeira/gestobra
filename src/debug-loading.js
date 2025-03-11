// Script de diagnóstico para problemas de carregamento infinito
import { supabase } from './services/supabaseClient';

// Função para testar a conexão com o Supabase
export const testSupabaseConnection = async () => {
  console.log('Testando conexão com Supabase...');
  try {
    // Verificar se as variáveis de ambiente estão definidas
    console.log('VITE_SUPABASE_URL:', import.meta.env.VITE_SUPABASE_URL ? 'Definido' : 'Não definido');
    console.log('VITE_SUPABASE_ANON_KEY:', import.meta.env.VITE_SUPABASE_ANON_KEY ? 'Definido' : 'Não definido');
    
    // Testar uma consulta simples
    const start = performance.now();
    const { data, error } = await supabase.from('obras').select('count').limit(1);
    const end = performance.now();
    
    console.log('Tempo de resposta do Supabase:', (end - start).toFixed(2), 'ms');
    
    if (error) {
      console.error('Erro na conexão com Supabase:', error);
      return { success: false, error };
    }
    
    console.log('Conexão com Supabase bem-sucedida:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Erro não tratado ao testar conexão:', error);
    return { success: false, error };
  }
};

// Função para verificar problemas de autenticação
export const checkAuthState = async () => {
  console.log('Verificando estado de autenticação...');
  try {
    const start = performance.now();
    const { data, error } = await supabase.auth.getSession();
    const end = performance.now();
    
    console.log('Tempo de resposta da autenticação:', (end - start).toFixed(2), 'ms');
    
    if (error) {
      console.error('Erro ao verificar sessão:', error);
      return { success: false, error };
    }
    
    const hasSession = !!data.session;
    console.log('Sessão ativa:', hasSession);
    
    if (hasSession) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('Erro ao obter dados do usuário:', userError);
        return { success: false, error: userError };
      }
      console.log('Dados do usuário obtidos com sucesso');
    }
    
    return { success: true, hasSession };
  } catch (error) {
    console.error('Erro não tratado ao verificar autenticação:', error);
    return { success: false, error };
  }
};

// Função para verificar problemas de roteamento
export const checkRouting = (location) => {
  console.log('Verificando roteamento...');
  console.log('Localização atual:', location.pathname);
  
  // Verificar se há parâmetros na URL
  const params = new URLSearchParams(location.search);
  console.log('Parâmetros de URL:', params.toString() || 'Nenhum');
  
  // Verificar se há parâmetros de rota
  if (location.pathname.includes('/obras/')) {
    const obraId = location.pathname.split('/obras/')[1];
    console.log('ID da obra na rota:', obraId);
    
    // Verificar se o ID é válido
    if (!obraId || obraId === 'undefined' || obraId === 'null') {
      console.error('ID de obra inválido na rota');
      return { success: false, error: 'ID de obra inválido' };
    }
  }
  
  return { success: true };
};

// Função para verificar problemas de renderização
export const checkRenderCycles = (componentName, dependencies) => {
  console.log(`Verificando ciclos de renderização em ${componentName}...`);
  console.log('Dependências do useEffect:', dependencies);
  
  return {
    success: true,
    message: `Monitorando renderizações de ${componentName}`
  };
};

// Função principal de diagnóstico
export const runDiagnostics = async (location) => {
  console.log('=== INICIANDO DIAGNÓSTICO ===');
  console.log('Versão do navegador:', navigator.userAgent);
  console.log('Data e hora:', new Date().toISOString());
  
  // Verificar conexão com Supabase
  const connectionResult = await testSupabaseConnection();
  
  // Verificar autenticação
  const authResult = await checkAuthState();
  
  // Verificar roteamento
  const routingResult = checkRouting(location);
  
  // Resultado final
  const diagnosticResult = {
    timestamp: new Date().toISOString(),
    connection: connectionResult,
    auth: authResult,
    routing: routingResult,
    success: connectionResult.success && authResult.success && routingResult.success
  };
  
  console.log('=== RESULTADO DO DIAGNÓSTICO ===');
  console.log(diagnosticResult);
  
  return diagnosticResult;
};

export default runDiagnostics; 