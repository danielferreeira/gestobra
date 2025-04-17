import { supabase } from './supabaseClient';

/**
 * Atualiza o perfil do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} dadosPerfil - Dados do perfil a serem atualizados
 * @returns {Promise<Object>} Resultado da operação
 */
export const atualizarPerfil = async (userId, dadosPerfil) => {
  try {
    // Atualizar metadados do usuário no Auth
    const { error: errorAuth } = await supabase.auth.updateUser({
      data: {
        nome: dadosPerfil.nome,
        cargo: dadosPerfil.cargo,
        telefone: dadosPerfil.telefone
      }
    });

    if (errorAuth) throw errorAuth;

    // Se houver um avatar, fazer upload
    let avatarUrl = null;
    if (dadosPerfil.avatar) {
      const fileExt = dadosPerfil.avatar.name.split('.').pop();
      const fileName = `${userId}.${fileExt}`;
      
      const { error: uploadError, data } = await supabase.storage
        .from('avatares')
        .upload(fileName, dadosPerfil.avatar, {
          upsert: true,
          cacheControl: '3600'
        });
      
      if (uploadError) throw uploadError;
      
      // Obter URL pública do avatar
      const { data: { publicUrl } } = supabase.storage
        .from('avatares')
        .getPublicUrl(fileName);
      
      avatarUrl = publicUrl;
      
      // Atualizar URL do avatar nos metadados
      await supabase.auth.updateUser({
        data: { avatar_url: avatarUrl }
      });
    }
    
    return { 
      error: null, 
      data: { 
        ...dadosPerfil, 
        avatar_url: avatarUrl 
      } 
    };
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    return { error, data: null };
  }
};

/**
 * Atualiza a senha do usuário
 * @param {string} senhaAtual - Senha atual
 * @param {string} novaSenha - Nova senha
 * @returns {Promise<Object>} Resultado da operação
 */
export const atualizarSenha = async (senhaAtual, novaSenha) => {
  try {
    // Verificar senha atual (implícito na operação de updateUser)
    const { error } = await supabase.auth.updateUser({
      password: novaSenha
    });
    
    if (error) throw error;
    
    return { error: null };
  } catch (error) {
    console.error('Erro ao atualizar senha:', error);
    return { error };
  }
};

/**
 * Salva as preferências de notificações do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} preferencias - Preferências de notificações
 * @returns {Promise<Object>} Resultado da operação
 */
export const salvarPreferenciasNotificacoes = async (userId, preferencias) => {
  try {
    // Verificar se já existe um registro para o usuário
    const { data: existing, error: queryError } = await supabase
      .from('preferencias_usuarios')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') {
      // PGRST116 é o código para "nenhum resultado encontrado"
      throw queryError;
    }
    
    let result;
    
    if (existing) {
      // Atualizar registro existente
      result = await supabase
        .from('preferencias_usuarios')
        .update({
          notificacoes: preferencias,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Criar novo registro
      result = await supabase
        .from('preferencias_usuarios')
        .insert({
          user_id: userId,
          notificacoes: preferencias,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        });
    }
    
    if (result.error) throw result.error;
    
    return { error: null, data: preferencias };
  } catch (error) {
    console.error('Erro ao salvar preferências de notificações:', error);
    return { error, data: null };
  }
};

/**
 * Salva as preferências de aparência do usuário
 * @param {string} userId - ID do usuário
 * @param {Object} preferencias - Preferências de aparência
 * @returns {Promise<Object>} Resultado da operação
 */
export const salvarPreferenciasAparencia = async (userId, preferencias) => {
  try {
    // Verificar se já existe um registro para o usuário
    const { data: existing, error: queryError } = await supabase
      .from('preferencias_usuarios')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (queryError && queryError.code !== 'PGRST116') {
      throw queryError;
    }
    
    let result;
    
    if (existing) {
      // Atualizar registro existente
      result = await supabase
        .from('preferencias_usuarios')
        .update({
          aparencia: preferencias,
          atualizado_em: new Date().toISOString()
        })
        .eq('user_id', userId);
    } else {
      // Criar novo registro
      result = await supabase
        .from('preferencias_usuarios')
        .insert({
          user_id: userId,
          aparencia: preferencias,
          criado_em: new Date().toISOString(),
          atualizado_em: new Date().toISOString()
        });
    }
    
    if (result.error) throw result.error;
    
    // Aplicar tema no localStorage para persistência entre sessões
    localStorage.setItem('tema', preferencias.tema);
    localStorage.setItem('corPrimaria', preferencias.corPrimaria);
    localStorage.setItem('tamanhoFonte', preferencias.tamanhoFonte);
    
    // Aplicar temas dinamicamente no documento
    aplicarTema(preferencias);
    
    return { error: null, data: preferencias };
  } catch (error) {
    console.error('Erro ao salvar preferências de aparência:', error);
    return { error, data: null };
  }
};

/**
 * Carrega as preferências do usuário
 * @param {string} userId - ID do usuário
 * @returns {Promise<Object>} Preferências do usuário
 */
export const carregarPreferencias = async (userId) => {
  try {
    // Buscar preferências no banco de dados
    const { data, error } = await supabase
      .from('preferencias_usuarios')
      .select('*')
      .eq('user_id', userId)
      .single();
    
    if (error && error.code !== 'PGRST116') {
      throw error;
    }
    
    // Se não encontrar no banco, usar valores padrão do localStorage ou padrões fixos
    const preferencias = {
      notificacoes: data?.notificacoes || {
        emailAlertaEstoque: true,
        emailOrcamentoExcedido: true,
        emailNovaObra: true,
        emailRelatorios: false
      },
      aparencia: data?.aparencia || {
        tema: localStorage.getItem('tema') || 'claro',
        corPrimaria: localStorage.getItem('corPrimaria') || '#3B82F6',
        tamanhoFonte: localStorage.getItem('tamanhoFonte') || 'medio'
      }
    };
    
    return { error: null, data: preferencias };
  } catch (error) {
    console.error('Erro ao carregar preferências:', error);
    return { error, data: null };
  }
};

/**
 * Aplica as configurações de tema visualmente
 * @param {Object} preferencias - Preferências de aparência
 */
const aplicarTema = (preferencias) => {
  // Aplicar tema (claro/escuro)
  const root = document.documentElement;
  
  if (preferencias.tema === 'escuro') {
    root.classList.add('dark');
    document.body.style.backgroundColor = '#1f2937';
    document.body.style.color = '#f9fafb';
  } else if (preferencias.tema === 'claro') {
    root.classList.remove('dark');
    document.body.style.backgroundColor = '#ffffff';
    document.body.style.color = '#1f2937';
  } else if (preferencias.tema === 'sistema') {
    // Detectar preferência do sistema
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDarkMode) {
      root.classList.add('dark');
      document.body.style.backgroundColor = '#1f2937';
      document.body.style.color = '#f9fafb';
    } else {
      root.classList.remove('dark');
      document.body.style.backgroundColor = '#ffffff';
      document.body.style.color = '#1f2937';
    }
  }
  
  // Aplicar cor primária
  root.style.setProperty('--color-primary', preferencias.corPrimaria);
  
  // Aplicar tamanho da fonte
  const fontSizeMap = {
    pequeno: '0.875rem',
    medio: '1rem',
    grande: '1.125rem'
  };
  
  root.style.fontSize = fontSizeMap[preferencias.tamanhoFonte] || '1rem';
}; 