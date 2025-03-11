import { supabase } from './supabaseClient';

/**
 * Busca todas as obras cadastradas
 * @returns {Promise} Promise com os dados das obras
 */
export const getObras = async () => {
  return await supabase
    .from('obras')
    .select('*')
    .order('nome');
};

/**
 * Busca uma obra específica pelo ID
 * @param {string} id ID da obra
 * @returns {Promise} Promise com os dados da obra
 */
export const getObraById = async (id) => {
  try {
    console.log(`Buscando obra com ID: ${id}`);
    
    // Verificar se o ID é válido
    if (!id || typeof id !== 'string' || id.trim() === '') {
      console.error('ID inválido fornecido para getObraById:', id);
      return { data: null, error: new Error('ID de obra inválido') };
    }
    
    const response = await supabase
      .from('obras')
      .select(`
        *,
        despesas(*),
        documentos(*)
      `)
      .eq('id', id)
      .single();
    
    if (response.error) {
      console.error('Erro ao buscar obra:', response.error);
    } else if (!response.data) {
      console.log('Nenhuma obra encontrada com o ID:', id);
    } else {
      console.log('Obra encontrada:', response.data.nome);
    }
    
    return response;
  } catch (error) {
    console.error('Erro não tratado em getObraById:', error);
    return { data: null, error };
  }
};

/**
 * Cria uma nova obra
 * @param {Object} obraData Dados da obra
 * @returns {Promise} Promise com o resultado da operação
 */
export const createObra = async (obraData) => {
  const { data: { user } } = await supabase.auth.getUser();
  
  return await supabase
    .from('obras')
    .insert([
      {
        ...obraData,
        user_id: user?.id,
        progresso: 0,
        created_at: new Date()
      }
    ]);
};

/**
 * Atualiza uma obra existente
 * @param {string} id ID da obra
 * @param {Object} obraData Dados atualizados da obra
 * @returns {Promise} Promise com o resultado da operação
 */
export const updateObra = async (id, obraData) => {
  return await supabase
    .from('obras')
    .update({
      ...obraData,
      updated_at: new Date()
    })
    .eq('id', id);
};

/**
 * Exclui uma obra
 * @param {string} id ID da obra
 * @returns {Promise} Promise com o resultado da operação
 */
export const deleteObra = async (id) => {
  return await supabase
    .from('obras')
    .delete()
    .eq('id', id);
};

/**
 * Atualiza o progresso de uma obra
 * @param {string} id ID da obra
 * @param {number} progresso Novo valor de progresso (0-100)
 * @returns {Promise} Promise com o resultado da operação
 */
export const atualizarProgressoObra = async (id, progresso) => {
  return await supabase
    .from('obras')
    .update({
      progresso,
      updated_at: new Date()
    })
    .eq('id', id);
};

/**
 * Busca estatísticas das obras
 * @returns {Promise} Promise com estatísticas das obras
 */
export const getEstatisticasObras = async () => {
  const { data: obras, error } = await getObras();
  
  if (error) {
    throw error;
  }
  
  // Calcular estatísticas
  const totalObras = obras.length;
  const obrasEmAndamento = obras.filter(obra => obra.status === 'em_andamento').length;
  const obrasConcluidas = obras.filter(obra => obra.status === 'concluida').length;
  const obrasPlanejadas = obras.filter(obra => obra.status === 'planejada').length;
  
  // Calcular orçamento total
  const orcamentoTotal = obras.reduce((total, obra) => total + (obra.orcamento || 0), 0);
  
  // Buscar despesas para calcular gastos totais
  const { data: despesas, error: despesasError } = await supabase
    .from('despesas')
    .select('*');
  
  if (despesasError) {
    throw despesasError;
  }
  
  const gastoTotal = despesas.reduce((total, despesa) => total + (despesa.valor || 0), 0);
  
  return {
    totalObras,
    obrasEmAndamento,
    obrasConcluidas,
    obrasPlanejadas,
    orcamentoTotal,
    gastoTotal
  };
};

/**
 * Busca obras recentes
 * @param {number} limit Limite de obras a serem retornadas
 * @returns {Promise} Promise com as obras recentes
 */
export const getObrasRecentes = async (limit = 5) => {
  return await supabase
    .from('obras')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit);
};

/**
 * Busca obras com orçamento excedido
 * @returns {Promise} Promise com as obras com orçamento excedido
 */
export const getObrasComOrcamentoExcedido = async () => {
  // Buscar todas as obras
  const { data: obras, error } = await getObras();
  
  if (error) {
    throw error;
  }
  
  const obrasComExcesso = [];
  
  // Para cada obra, verificar se o total de despesas excede o orçamento
  for (const obra of obras) {
    const { data: despesas, error: despesasError } = await supabase
      .from('despesas')
      .select('valor')
      .eq('obra_id', obra.id);
    
    if (despesasError) {
      throw despesasError;
    }
    
    const totalDespesas = despesas.reduce((total, despesa) => total + (despesa.valor || 0), 0);
    
    if (totalDespesas > obra.orcamento) {
      obrasComExcesso.push({
        ...obra,
        totalDespesas,
        excesso: totalDespesas - obra.orcamento
      });
    }
  }
  
  return obrasComExcesso;
}; 