import { supabase } from './supabaseClient';

// Buscar todos os documentos
export const getDocumentos = async () => {
  const { data, error } = await supabase
    .from('documentos')
    .select(`
      *,
      obras (id, nome)
    `)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Buscar documentos de uma obra específica
export const getDocumentosByObraId = async (obraId) => {
  const { data, error } = await supabase
    .from('documentos')
    .select('*')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Buscar um documento específico pelo ID
export const getDocumentoById = async (id) => {
  const { data, error } = await supabase
    .from('documentos')
    .select(`
      *,
      obras (id, nome)
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
};

/**
 * Upload de documento
 * @param {Object} documentoData Dados do documento (titulo, descricao, tipo, obra_id)
 * @param {File} arquivo Arquivo a ser enviado
 * @param {string|null} documentoId ID do documento existente (para atualização) ou null (para criação)
 * @param {Function} progressCallback Função de callback para progresso do upload
 * @returns {Promise} Promise com o resultado da operação
 */
export const uploadDocumento = async (documentoData, arquivo, documentoId = null, progressCallback = null) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      return { error: userError };
    }
    
    // Upload do arquivo para o Storage
    const fileExt = arquivo.name.split('.').pop();
    const fileName = `${documentoData.obra_id}/${Math.random().toString(36).substring(2)}.${fileExt}`;
    const filePath = `${fileName}`;
    
    // Configurar opções de upload com progresso, se fornecido
    const uploadOptions = {
      cacheControl: '3600',
      upsert: false
    };
    
    if (progressCallback) {
      uploadOptions.onUploadProgress = (progress) => {
        const percent = Math.round((progress.loaded / progress.total) * 100);
        progressCallback(percent);
      };
    }
    
    const { data: fileData, error: fileError } = await supabase.storage
      .from('documentos')
      .upload(filePath, arquivo, uploadOptions);
    
    if (fileError) {
      return { error: fileError };
    }
    
    // Obter URL pública do arquivo
    const { data: urlData } = supabase.storage
      .from('documentos')
      .getPublicUrl(filePath);
    
    const publicUrl = urlData.publicUrl;
    
    if (documentoId) {
      // Atualizar documento existente
      const { data, error } = await supabase
        .from('documentos')
        .update({
          titulo: documentoData.titulo,
          descricao: documentoData.descricao,
          tipo: documentoData.tipo,
          arquivo_url: publicUrl,
          arquivo_nome: arquivo.name,
          updated_at: new Date()
        })
        .eq('id', documentoId)
        .select();
      
      return { data, error };
    } else {
      // Criar novo documento
      const { data, error } = await supabase
        .from('documentos')
        .insert([{
          obra_id: documentoData.obra_id,
          titulo: documentoData.titulo,
          descricao: documentoData.descricao,
          tipo: documentoData.tipo,
          arquivo_url: publicUrl,
          arquivo_nome: arquivo.name,
          user_id: userData.user.id,
          created_at: new Date()
        }])
        .select();
      
      return { data, error };
    }
  } catch (error) {
    return { error };
  }
};

/**
 * Atualizar metadados de um documento
 * @param {string} id ID do documento
 * @param {Object} documentoData Dados atualizados do documento
 * @returns {Promise} Promise com o resultado da operação
 */
export const updateDocumento = async (id, documentoData) => {
  return await supabase
    .from('documentos')
    .update({
      titulo: documentoData.titulo,
      descricao: documentoData.descricao,
      tipo: documentoData.tipo,
      updated_at: new Date()
    })
    .eq('id', id)
    .select();
};

// Excluir um documento
export const deleteDocumento = async (id) => {
  // Primeiro, obter o documento para saber o caminho do arquivo
  const { data: documento, error: getError } = await getDocumentoById(id);
  
  if (getError) {
    return { error: getError };
  }
  
  // Extrair o caminho do arquivo da URL
  if (documento.arquivo_url) {
    const url = documento.arquivo_url;
    const path = url.split('/').slice(-2).join('/');
    
    // Excluir o arquivo do Storage
    const { error: storageError } = await supabase.storage
      .from('documentos')
      .remove([path]);
    
    if (storageError) {
      console.error('Erro ao excluir arquivo:', storageError);
      // Continuar mesmo com erro no storage
    }
  }
  
  // Excluir o registro do banco de dados
  const { error } = await supabase
    .from('documentos')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Buscar documentos por tipo
export const getDocumentosByTipo = async (tipo) => {
  const { data, error } = await supabase
    .from('documentos')
    .select(`
      *,
      obras (id, nome)
    `)
    .eq('tipo', tipo)
    .order('created_at', { ascending: false });
  
  return { data, error };
}; 