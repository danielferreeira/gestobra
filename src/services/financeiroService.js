import { supabase } from './supabaseClient';

/**
 * Busca todas as transações financeiras (despesas e receitas)
 * @returns {Promise} Promise com os dados das transações
 */
export const getTransacoes = async () => {
  try {
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        obras (id, nome)
      `)
      .order('data', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar transações:', error);
    return { data: null, error };
  }
};

/**
 * Busca uma transação específica pelo ID
 * @param {string} id ID da transação
 * @returns {Promise} Promise com os dados da transação
 */
export const getTransacaoById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('despesas')
      .select(`
        *,
        obras (id, nome)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar transação:', error);
    return { data: null, error };
  }
};

/**
 * Cria uma nova transação financeira
 * @param {Object} transacaoData Dados da transação
 * @returns {Promise} Promise com o resultado da operação
 */
export const createTransacao = async (transacaoData) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    // Remover campo observacao se existir
    const { observacao, ...dadosTransacao } = transacaoData;
    
    // Validar campos - garantir que tipos corretos sejam enviados
    const dadosValidados = {
      ...dadosTransacao,
      // Converter strings vazias para null nos campos que são UUIDs
      obra_id: dadosTransacao.obra_id || null,
      // Adicionar campos adicionais
      user_id: userData.user.id,
      created_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('despesas')
      .insert([dadosValidados])
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao criar transação:', error);
    return { data: null, error };
  }
};

/**
 * Atualiza uma transação existente
 * @param {string} id ID da transação
 * @param {Object} transacaoData Dados atualizados da transação
 * @returns {Promise} Promise com o resultado da operação
 */
export const updateTransacao = async (id, transacaoData) => {
  try {
    // Remover campo observacao se existir
    const { observacao, ...dadosTransacao } = transacaoData;
    
    // Validar campos - garantir que tipos corretos sejam enviados
    const dadosValidados = {
      ...dadosTransacao,
      // Converter strings vazias para null nos campos que são UUIDs
      obra_id: dadosTransacao.obra_id || null
    };
    
    const { data, error } = await supabase
      .from('despesas')
      .update(dadosValidados)
      .eq('id', id)
      .select();
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao atualizar transação:', error);
    return { data: null, error };
  }
};

/**
 * Exclui uma transação
 * @param {string} id ID da transação
 * @returns {Promise} Promise com o resultado da operação
 */
export const deleteTransacao = async (id) => {
  try {
    const { error } = await supabase
      .from('despesas')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    return { error: null };
  } catch (error) {
    console.error('Erro ao excluir transação:', error);
    return { error };
  }
};

/**
 * Busca o fluxo de caixa por período
 * @param {string} dataInicio Data de início do período (YYYY-MM-DD)
 * @param {string} dataFim Data de fim do período (YYYY-MM-DD)
 * @returns {Promise} Promise com os dados do fluxo de caixa
 */
export const getFluxoCaixa = async (dataInicio, dataFim) => {
  try {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .gte('data', dataInicio)
      .lte('data', dataFim)
      .order('data', { ascending: true });
    
    if (error) throw error;
    
    // Organizar transações por data
    const fluxoPorDia = {};
    data.forEach(transacao => {
      const data = transacao.data;
      if (!fluxoPorDia[data]) {
        fluxoPorDia[data] = {
          data,
          entradas: 0,
          saidas: 0,
          saldo: 0
        };
      }
      
      if (transacao.tipo === 'receita') {
        fluxoPorDia[data].entradas += parseFloat(transacao.valor || 0);
      } else {
        fluxoPorDia[data].saidas += parseFloat(transacao.valor || 0);
      }
      
      fluxoPorDia[data].saldo = fluxoPorDia[data].entradas - fluxoPorDia[data].saidas;
    });
    
    // Converter para array e ordenar por data
    const fluxoArray = Object.values(fluxoPorDia).sort((a, b) => 
      new Date(a.data) - new Date(b.data)
    );
    
    // Calcular saldo acumulado
    let saldoAcumulado = 0;
    fluxoArray.forEach(dia => {
      saldoAcumulado += dia.saldo;
      dia.saldoAcumulado = saldoAcumulado;
    });
    
    return { data: fluxoArray, error: null };
  } catch (error) {
    console.error('Erro ao buscar fluxo de caixa:', error);
    return { data: null, error };
  }
};

/**
 * Busca transações financeiras por obra
 * @param {string} obraId ID da obra
 * @returns {Promise} Promise com os dados das transações da obra
 */
export const getTransacoesByObraId = async (obraId) => {
  try {
    const { data, error } = await supabase
      .from('despesas')
      .select('*')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar transações da obra:', error);
    return { data: null, error };
  }
};

/**
 * Gera relatório financeiro por categorias
 * @param {string} dataInicio Data de início (opcional)
 * @param {string} dataFim Data de fim (opcional)
 * @returns {Promise} Promise com os dados do relatório
 */
export const getRelatorioPorCategoria = async (dataInicio = null, dataFim = null) => {
  try {
    let query = supabase
      .from('despesas')
      .select('*');
    
    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('data', dataFim);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Agrupar por categoria e tipo (despesa/receita)
    const categorias = {};
    data.forEach(transacao => {
      const categoria = transacao.categoria || 'Sem categoria';
      const tipo = transacao.tipo;
      
      if (!categorias[categoria]) {
        categorias[categoria] = {
          receitas: 0,
          despesas: 0,
          saldo: 0
        };
      }
      
      if (tipo === 'receita') {
        categorias[categoria].receitas += parseFloat(transacao.valor || 0);
      } else {
        categorias[categoria].despesas += parseFloat(transacao.valor || 0);
      }
      
      categorias[categoria].saldo = categorias[categoria].receitas - categorias[categoria].despesas;
    });
    
    // Converter para array
    const relatorioArray = Object.entries(categorias).map(([categoria, valores]) => ({
      categoria,
      ...valores
    }));
    
    // Adicionar totais
    const totais = {
      receitas: relatorioArray.reduce((total, item) => total + item.receitas, 0),
      despesas: relatorioArray.reduce((total, item) => total + item.despesas, 0),
      saldo: relatorioArray.reduce((total, item) => total + item.saldo, 0)
    };
    
    return { 
      data: {
        categorias: relatorioArray,
        totais
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erro ao gerar relatório por categoria:', error);
    return { data: null, error };
  }
};

/**
 * Gera relatório de custos por obra
 * @returns {Promise} Promise com os dados do relatório
 */
export const getRelatorioCustosPorObra = async () => {
  try {
    // Buscar todas as obras
    const { data: obras, error: obrasError } = await supabase
      .from('obras')
      .select('id, nome, orcamento');
    
    if (obrasError) throw obrasError;
    
    // Buscar todas as despesas
    const { data: despesas, error: despesasError } = await supabase
      .from('despesas')
      .select('*');
    
    if (despesasError) throw despesasError;
    
    // Calcular custos por obra
    const relatorio = obras.map(obra => {
      const despesasObra = despesas.filter(d => d.obra_id === obra.id);
      const totalDespesas = despesasObra.reduce((total, d) => total + parseFloat(d.valor || 0), 0);
      const orcamento = parseFloat(obra.orcamento || 0);
      
      return {
        id: obra.id,
        nome: obra.nome,
        orcamento,
        gastosReais: totalDespesas,
        saldo: orcamento - totalDespesas,
        percentualGasto: orcamento > 0 ? (totalDespesas / orcamento) * 100 : 0
      };
    });
    
    return { data: relatorio, error: null };
  } catch (error) {
    console.error('Erro ao gerar relatório de custos por obra:', error);
    return { data: null, error };
  }
};

/**
 * Busca contas a pagar/receber (transações pendentes)
 * @returns {Promise} Promise com os dados das contas
 */
export const getContasPendentes = async () => {
  try {
    // Buscar contas a pagar (despesas pendentes)
    const { data: contasPagar, error: errorPagar } = await supabase
      .from('despesas')
      .select(`
        *,
        obras (id, nome)
      `)
      .eq('status_pagamento', 'pendente')
      .eq('tipo', 'despesa')
      .order('data', { ascending: true });
    
    if (errorPagar) throw errorPagar;
    
    // Buscar contas a receber (receitas pendentes)
    const { data: contasReceber, error: errorReceber } = await supabase
      .from('despesas')
      .select(`
        *,
        obras (id, nome)
      `)
      .eq('status_pagamento', 'pendente')
      .eq('tipo', 'receita')
      .order('data', { ascending: true });
    
    if (errorReceber) throw errorReceber;
    
    return { 
      data: {
        contasPagar,
        contasReceber,
        totalPagar: contasPagar.reduce((total, conta) => total + parseFloat(conta.valor || 0), 0),
        totalReceber: contasReceber.reduce((total, conta) => total + parseFloat(conta.valor || 0), 0)
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Erro ao buscar contas pendentes:', error);
    return { data: null, error };
  }
};

/**
 * Cria uma despesa baseada em um material adicionado a uma etapa
 * @param {Object} materialData Dados do material
 * @returns {Promise} Promise com o resultado da operação
 */
export const createDespesaMaterial = async (materialData) => {
  try {
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) throw userError;
    
    // Buscar os detalhes do material para a descrição
    const { data: materialInfo, error: materialError } = await supabase
      .from('materiais')
      .select('nome, categoria')
      .eq('id', materialData.material_id)
      .single();
    
    if (materialError) throw materialError;
    
    // Buscar os detalhes da etapa para a descrição
    const { data: etapaInfo, error: etapaError } = await supabase
      .from('etapas_obra')
      .select('nome')
      .eq('id', materialData.etapa_id)
      .single();
    
    if (etapaError) throw etapaError;
    
    // Criar a descrição da despesa com detalhes do material e etapa
    const descricao = `Material: ${materialInfo.nome} - Etapa: ${etapaInfo.nome}`;
    
    // Montar os dados da transação
    const despesaData = {
      descricao,
      valor: materialData.valor_total,
      data: materialData.data_compra || new Date().toISOString().split('T')[0],
      categoria: 'material',
      obra_id: materialData.obra_id,
      tipo: 'despesa',
      status_pagamento: 'pendente', // Materiais começam como pendentes por padrão
      user_id: userData.user.id,
      etapa_id: materialData.etapa_id,
      material_id: materialData.material_id,
      created_at: new Date().toISOString(),
      nota_fiscal: materialData.nota_fiscal || null
    };
    
    // Inserir a despesa
    const { data, error } = await supabase
      .from('despesas')
      .insert([despesaData])
      .select();
    
    if (error) throw error;
    
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao criar despesa de material:', error);
    return { data: null, error };
  }
};

/**
 * Busca despesas específicas de materiais com detalhes
 * @param {Object} filters Filtros opcionais (obra_id, dataInicio, dataFim)
 * @returns {Promise} Promise com os dados das despesas de materiais
 */
export const getDespesasMateriais = async (filters = {}) => {
  try {
    let query = supabase
      .from('despesas')
      .select(`
        *,
        obras (id, nome),
        etapas_obra:etapa_id (id, nome),
        materiais:material_id (id, nome, categoria, unidade, preco_unitario)
      `)
      .not('material_id', 'is', null);
    
    // Aplicar filtros se fornecidos
    if (filters.obra_id) {
      query = query.eq('obra_id', filters.obra_id);
    }
    
    if (filters.dataInicio) {
      query = query.gte('data', filters.dataInicio);
    }
    
    if (filters.dataFim) {
      query = query.lte('data', filters.dataFim);
    }
    
    // Ordenar por data, mais recentes primeiro
    query = query.order('data', { ascending: false });
    
    const { data, error } = await query;
    
    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Erro ao buscar despesas de materiais:', error);
    return { data: null, error };
  }
}; 