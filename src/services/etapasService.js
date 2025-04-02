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
    console.log(`Buscando dependências para etapa ${etapaId}`);
    
    // Primeiro, buscar apenas as referências das dependências
    const { data: dependenciasRef, error: refError } = await supabase
      .from('etapas_dependencias')
      .select('etapa_requisito_id')
      .eq('etapa_dependente_id', etapaId);
    
    if (refError) {
      console.error('Erro ao buscar referências de dependências:', refError);
      return { data: [], error: refError };
    }
    
    if (!dependenciasRef || dependenciasRef.length === 0) {
      return { data: [], error: null };
    }
    
    // Extrair os IDs das etapas requisito
    const etapaRequisitosIds = dependenciasRef.map(dep => dep.etapa_requisito_id);
    
    // Buscar detalhes das etapas requisito
    const { data: etapasRequisito, error: etapasError } = await supabase
      .from('etapas_obra')
      .select('id, nome, status, progresso')
      .in('id', etapaRequisitosIds);
    
    if (etapasError) {
      console.error('Erro ao buscar detalhes das etapas requisito:', etapasError);
      return { data: [], error: etapasError };
    }
    
    // Montar as dependências com detalhes das etapas
    const dependenciasCompletas = dependenciasRef.map(dep => {
      const etapaRequisito = etapasRequisito.find(etapa => etapa.id === dep.etapa_requisito_id);
      return {
        etapa_requisito_id: dep.etapa_requisito_id,
        etapa_dependente_id: etapaId,
        etapas_obra: etapaRequisito
      };
    });
    
    return { data: dependenciasCompletas, error: null };
  } catch (error) {
    console.error('Erro ao buscar dependências:', error);
    return { data: [], error };
  }
};

/**
 * Adiciona uma dependência entre etapas
 * @param {string} etapaId ID da etapa dependente
 * @param {string} etapaRequisitoId ID da etapa requisito
 * @returns {Promise} Promise com o resultado da operação
 */
export const addDependencia = async (etapaId, etapaRequisitoId) => {
  try {
    console.log(`Adicionando dependência: Etapa ${etapaId} depende de ${etapaRequisitoId}`);
    
    const dependencia = {
      etapa_dependente_id: etapaId,
      etapa_requisito_id: etapaRequisitoId
    };
    
    const { data, error } = await supabase
      .from('etapas_dependencias')
      .insert([dependencia])
      .select();
    
    if (error) {
      console.error('Erro ao adicionar dependência:', error);
      throw error;
    }
    
    console.log('Dependência adicionada com sucesso:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao adicionar dependência:', error);
    return { error };
  }
};

/**
 * Remove uma dependência entre etapas
 * @param {string} etapaId ID da etapa dependente
 * @param {string} etapaRequisitoId ID da etapa requisito
 * @returns {Promise} Promise com o resultado da operação
 */
export const removeDependencia = async (etapaId, etapaRequisitoId) => {
  try {
    console.log(`Removendo dependência: Etapa ${etapaId} depende de ${etapaRequisitoId}`);
    
    const { data, error } = await supabase
      .from('etapas_dependencias')
      .delete()
      .eq('etapa_dependente_id', etapaId)
      .eq('etapa_requisito_id', etapaRequisitoId)
      .select();
    
    if (error) {
      console.error('Erro ao remover dependência:', error);
      throw error;
    }
    
    console.log('Dependência removida com sucesso:', data);
    return { data, error: null };
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
  if (!etapa.data_previsao_termino || etapa.status === 'concluida') return false;
  
  const hoje = new Date();
  const dataTermino = new Date(etapa.data_previsao_termino);
  return hoje > dataTermino && etapa.progresso < 100;
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
  
  // Verificar se há valores previstos para usar como peso
  const temValoresPrevisto = etapas.some(etapa => etapa.valor_previsto > 0);
  
  if (temValoresPrevisto) {
    // Calcular progresso ponderado pelo valor previsto
    const valorTotal = etapas.reduce((sum, etapa) => sum + (parseFloat(etapa.valor_previsto) || 0), 0);
    
    if (valorTotal <= 0) return calcularProgressoSimples(etapas);
    
    const progressoPonderado = etapas.reduce((sum, etapa) => {
      const peso = (parseFloat(etapa.valor_previsto) || 0) / valorTotal;
      return sum + ((etapa.progresso || 0) * peso);
    }, 0);
    
    return Math.round(progressoPonderado);
  } else {
    // Se não houver valores previstos, calcular média simples
    return calcularProgressoSimples(etapas);
  }
};

// Função auxiliar para calcular progresso simples (média)
const calcularProgressoSimples = (etapas) => {
  const totalProgresso = etapas.reduce((sum, etapa) => sum + (etapa.progresso || 0), 0);
  return Math.round(totalProgresso / etapas.length);
};

export const atualizarValorRealizado = async (id, valor_realizado) => {
  try {
    // Garantir que valores vazios ou inválidos sejam tratados como null
    const valorFormatado = valor_realizado === '' || isNaN(valor_realizado) ? null : parseFloat(valor_realizado);
    
    const { data, error } = await supabase
      .from('etapas_obra')
      .update({ valor_realizado: valorFormatado })
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

// Etapas padrão para obras
export const etapasPadroes = [
  { nome: 'Preparação do Terreno', descricao: 'Limpeza do terreno, demarcação e preparação do solo.' },
  { nome: 'Fundação', descricao: 'Execução das fundações e alicerces da construção.' },
  { nome: 'Estrutura', descricao: 'Montagem da estrutura principal da edificação.' },
  { nome: 'Alvenaria', descricao: 'Construção de paredes e divisórias.' },
  { nome: 'Cobertura', descricao: 'Instalação do telhado e sistema de impermeabilização.' },
  { nome: 'Instalações', descricao: 'Execução de instalações elétricas, hidráulicas e outras.' },
  { nome: 'Acabamento', descricao: 'Revestimentos, pintura e acabamentos finais.' },
  { nome: 'Paisagismo e Finalização', descricao: 'Trabalhos externos e finalização da obra.' }
];

// Função para criar etapas padrão para uma obra
export const criarEtapasPadrao = async (obraId) => {
  try {
    console.log('Iniciando criação de etapas padrão para obra ID:', obraId);
    
    if (!obraId) {
      const errorMsg = 'ID da obra não fornecido';
      console.error(errorMsg);
      throw new Error(errorMsg);
    }
    
    // Verificar se há um usuário autenticado
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Erro ao obter usuário atual:', userError);
      throw new Error('Erro de autenticação: ' + userError.message);
    }
    
    if (!user) {
      const authError = 'Usuário não autenticado. Faça login novamente.';
      console.error(authError);
      throw new Error(authError);
    }
    
    console.log('Usuário autenticado:', user.id);
    
    // Buscar informações da obra, incluindo orçamento total
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .single();
    
    if (obraError) {
      console.error('Erro ao buscar obra:', obraError);
      throw new Error('Erro ao buscar informações da obra: ' + obraError.message);
    }
    
    const orcamentoTotal = parseFloat(obra.orcamento) || 0;
    console.log('Orçamento total da obra:', orcamentoTotal);
    
    // Calcular valor previsto por etapa (dividir o orçamento igualmente)
    const totalEtapas = etapasPadroes.length;
    const valorPorEtapa = totalEtapas > 0 ? orcamentoTotal / totalEtapas : 0;
    console.log(`Distribuindo orçamento: R$ ${valorPorEtapa.toFixed(2)} por etapa`);
    
    // Preparar etapas para inserção
    const etapasParaInserir = etapasPadroes.map((etapa, index) => {
      const dataAtual = new Date().toISOString();
      
      const novaEtapa = {
        obra_id: obraId,
        nome: etapa.nome,
        descricao: etapa.descricao,
        status: 'pendente',
        progresso: 0,
        ordem: index + 1,
        data_inicio: dataAtual,
        data_previsao_termino: null,
        valor_previsto: valorPorEtapa, // Atribuir o valor dividido por etapa
        valor_realizado: 0,
        progresso_automatico: true
      };
      console.log(`Preparando etapa ${index + 1}: ${novaEtapa.nome}, Valor previsto: R$ ${novaEtapa.valor_previsto.toFixed(2)}`);
      return novaEtapa;
    });

    console.log('Total de etapas a inserir:', etapasParaInserir.length);
    
    // Inserir etapas uma por uma para identificar problemas específicos
    const resultados = [];
    const erros = [];
    
    for (let i = 0; i < etapasParaInserir.length; i++) {
      const etapa = etapasParaInserir[i];
      console.log(`Inserindo etapa ${i + 1}/${etapasParaInserir.length}: ${etapa.nome}`);
      
      try {
        const { data, error } = await supabase
          .from('etapas_obra')
          .insert([etapa])
          .select();
        
        if (error) {
          console.error(`Erro ao inserir etapa ${i + 1} (${etapa.nome}):`, error);
          erros.push({ etapa: etapa.nome, erro: error });
        } else if (data && data.length > 0) {
          console.log(`Etapa ${i + 1} (${etapa.nome}) inserida com sucesso`);
          resultados.push(data[0]);
        }
      } catch (insertError) {
        console.error(`Exceção ao inserir etapa ${i + 1} (${etapa.nome}):`, insertError);
        erros.push({ etapa: etapa.nome, erro: insertError });
      }
    }
    
    console.log(`Inserção concluída: ${resultados.length} etapas inseridas, ${erros.length} erros`);
    
    if (erros.length > 0 && resultados.length === 0) {
      return { success: false, errors: erros };
    }
    
    return { 
      success: true, 
      data: resultados,
      parcial: erros.length > 0
    };
  } catch (error) {
    console.error('Erro ao criar etapas padrão:', error);
    return { error };
  }
}; 