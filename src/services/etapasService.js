import { supabase } from './supabaseClient';

/**
 * Busca todas as etapas de uma obra específica
 * @param {string} obraId ID da obra
 * @returns {Promise} Promise com os dados das etapas
 */
export const getEtapasByObraId = async (obraId) => {
  try {
    const { data, error } = await supabase
      .from('etapas_obra')
      .select('*')
      .eq('obra_id', obraId)
      .order('ordem');

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao buscar etapas:', error);
    return { error };
  }
};

/**
 * Cria uma nova etapa para uma obra
 * @param {Object} etapaData Dados da etapa
 * @returns {Promise} Promise com o resultado da operação
 */
export const createEtapa = async (etapaData) => {
  try {
    const { data: lastEtapa } = await supabase
      .from('etapas_obra')
      .select('ordem')
      .eq('obra_id', etapaData.obra_id)
      .order('ordem', { ascending: false })
      .limit(1)
      .single();

    const novaOrdem = lastEtapa ? lastEtapa.ordem + 1 : 1;

    const { data, error } = await supabase
      .from('etapas_obra')
      .insert([{ ...etapaData, ordem: novaOrdem }])
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao criar etapa:', error);
    return { error };
  }
};

/**
 * Atualiza uma etapa existente
 * @param {string} id ID da etapa
 * @param {Object} etapaData Dados atualizados da etapa
 * @returns {Promise} Promise com o resultado da operação
 */
export const updateEtapa = async (id, etapaData) => {
  try {
    const { data, error } = await supabase
      .from('etapas_obra')
      .update(etapaData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao atualizar etapa:', error);
    return { error };
  }
};

/**
 * Exclui uma etapa
 * @param {string} id ID da etapa
 * @returns {Promise} Promise com o resultado da operação
 */
export const deleteEtapa = async (id) => {
  try {
    const { error } = await supabase
      .from('etapas_obra')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao excluir etapa:', error);
    return { error };
  }
};

/**
 * Atualiza o progresso de uma etapa e recalcula o progresso da obra
 * @param {string} etapaId ID da etapa
 * @param {number} progresso Novo valor de progresso (0-100)
 * @returns {Promise} Promise com o resultado da operação
 */
export const atualizarProgressoEtapa = async (id, progresso) => {
  try {
    const { data, error } = await supabase
      .from('etapas_obra')
      .update({ progresso })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao atualizar progresso:', error);
    return { error };
  }
};

/**
 * Reordena as etapas de uma obra
 * @param {string} obraId ID da obra
 * @param {Array} novaOrdem Array com os IDs das etapas na nova ordem
 * @returns {Promise} Promise com o resultado da operação
 */
export const reordenarEtapas = async (obraId, novaOrdem) => {
  try {
    const updates = novaOrdem.map((id, index) => ({
      id,
      ordem: index + 1
    }));

    const { error } = await supabase.from('etapas_obra').upsert(updates);

    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao reordenar etapas:', error);
    return { error };
  }
};

/**
 * Busca as dependências de uma etapa
 * @param {string} etapaId ID da etapa
 * @returns {Promise} Promise com as dependências da etapa
 */
export const getDependenciasByEtapaId = async (etapaId) => {
  try {
    return await supabase
      .from('etapas_dependencias')
      .select(`
        etapa_requisito_id,
        etapas_obra!etapa_requisito_id (
          id,
          nome,
          status,
          progresso
        )
      `)
      .eq('etapa_id', etapaId);
  } catch (error) {
    console.error('Erro ao buscar dependências:', error);
    return { data: null, error };
  }
};

/**
 * Adiciona uma dependência entre etapas
 * @param {string} etapaDependenteId ID da etapa dependente
 * @param {string} etapaRequisitoId ID da etapa requisito
 * @returns {Promise} Promise com o resultado da operação
 */
export const addDependencia = async (etapaId, etapaRequisitoId) => {
  try {
    return await supabase
      .from('etapas_dependencias')
      .insert([{
        etapa_id: etapaId,
        etapa_requisito_id: etapaRequisitoId
      }]);
  } catch (error) {
    console.error('Erro ao adicionar dependência:', error);
    return { error };
  }
};

/**
 * Remove uma dependência entre etapas
 * @param {string} etapaDependenteId ID da etapa dependente
 * @param {string} etapaRequisitoId ID da etapa requisito
 * @returns {Promise} Promise com o resultado da operação
 */
export const removeDependencia = async (etapaId, etapaRequisitoId) => {
  try {
    return await supabase
      .from('etapas_dependencias')
      .delete()
      .eq('etapa_id', etapaId)
      .eq('etapa_requisito_id', etapaRequisitoId);
  } catch (error) {
    console.error('Erro ao remover dependência:', error);
    return { error };
  }
};

/**
 * Busca as subtarefas de uma etapa
 * @param {string} etapaId ID da etapa
 * @returns {Promise} Promise com as subtarefas da etapa
 */
export const getSubtarefasByEtapaId = async (etapaId) => {
  try {
    return await supabase
      .from('etapas_subtarefas')
      .select('*')
      .eq('etapa_id', etapaId)
      .order('created_at');
  } catch (error) {
    console.error('Erro ao buscar subtarefas:', error);
    return { data: null, error };
  }
};

/**
 * Cria uma nova subtarefa
 * @param {Object} subtarefaData Dados da subtarefa
 * @returns {Promise} Promise com o resultado da operação
 */
export const createSubtarefa = async (subtarefaData) => {
  try {
    return await supabase
      .from('etapas_subtarefas')
      .insert([subtarefaData])
      .select()
      .single();
  } catch (error) {
    console.error('Erro ao criar subtarefa:', error);
    return { data: null, error };
  }
};

/**
 * Atualiza uma subtarefa
 * @param {string} id ID da subtarefa
 * @param {Object} subtarefaData Dados atualizados da subtarefa
 * @returns {Promise} Promise com o resultado da operação
 */
export const updateSubtarefa = async (id, subtarefaData) => {
  try {
    return await supabase
      .from('etapas_subtarefas')
      .update(subtarefaData)
      .eq('id', id)
      .select()
      .single();
  } catch (error) {
    console.error('Erro ao atualizar subtarefa:', error);
    return { data: null, error };
  }
};

/**
 * Exclui uma subtarefa
 * @param {string} id ID da subtarefa
 * @returns {Promise} Promise com o resultado da operação
 */
export const deleteSubtarefa = async (id) => {
  try {
    return await supabase
      .from('subtarefas')
      .delete()
      .eq('id', id);
  } catch (error) {
    console.error('Erro ao excluir subtarefa:', error);
    return { error };
  }
};

/**
 * Verifica se uma etapa está atrasada
 * @param {Object} etapa Dados da etapa
 * @returns {boolean} True se a etapa estiver atrasada
 */
export const isEtapaAtrasada = (etapa) => {
  if (!etapa.data_fim || etapa.status === 'concluida') return false;
  
  const hoje = new Date();
  const dataFim = new Date(etapa.data_fim);
  return hoje > dataFim && etapa.progresso < 100;
};

/**
 * Calcula o progresso total de uma etapa baseado nas subtarefas
 * @param {string} etapaId ID da etapa
 * @returns {Promise<number>} Promise com o progresso calculado
 */
export const calcularProgressoEtapa = async (etapaId) => {
  const { data: subtarefas, error } = await getSubtarefasByEtapaId(etapaId);
  
  if (error) throw error;
  
  if (!subtarefas || subtarefas.length === 0) return 0;
  
  const totalSubtarefas = subtarefas.length;
  const subtarefasConcluidas = subtarefas.filter(st => st.concluida).length;
  
  return Math.round((subtarefasConcluidas / totalSubtarefas) * 100);
};

export const calcularTotalPrevisto = (etapas) => {
  return etapas.reduce((total, etapa) => total + (etapa.valor_previsto || 0), 0);
};

export const calcularTotalRealizado = (etapas) => {
  return etapas.reduce((total, etapa) => total + (etapa.valor_realizado || 0), 0);
};

export const calcularProgressoGeral = (etapas) => {
  if (!etapas || etapas.length === 0) return 0;
  
  const totalProgresso = etapas.reduce((sum, etapa) => sum + (etapa.progresso || 0), 0);
  return Math.round(totalProgresso / etapas.length);
};

export const atualizarValorRealizado = async (id, valor_realizado) => {
  try {
    const { data, error } = await supabase
      .from('etapas_obra')
      .update({ valor_realizado })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data };
  } catch (error) {
    console.error('Erro ao atualizar valor realizado:', error);
    return { error };
  }
}; 