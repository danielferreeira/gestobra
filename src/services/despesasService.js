import { supabase } from './supabaseClient';

// Buscar todas as despesas
export const getDespesas = async () => {
  const { data, error } = await supabase
    .from('despesas')
    .select(`
      *,
      obras (id, nome)
    `)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Buscar despesas de uma obra específica
export const getDespesasByObraId = async (obraId) => {
  const { data, error } = await supabase
    .from('despesas')
    .select('*')
    .eq('obra_id', obraId)
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Buscar uma despesa específica pelo ID
export const getDespesaById = async (id) => {
  const { data, error } = await supabase
    .from('despesas')
    .select(`
      *,
      obras (id, nome)
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
};

// Criar uma nova despesa
export const createDespesa = async (despesaData) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    return { data: null, error: userError };
  }
  
  const { data, error } = await supabase
    .from('despesas')
    .insert([
      { ...despesaData, user_id: userData.user.id }
    ])
    .select();
  
  return { data, error };
};

// Atualizar uma despesa existente
export const updateDespesa = async (id, despesaData) => {
  const { data, error } = await supabase
    .from('despesas')
    .update(despesaData)
    .eq('id', id)
    .select();
  
  return { data, error };
};

// Excluir uma despesa
export const deleteDespesa = async (id) => {
  const { error } = await supabase
    .from('despesas')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Upload de comprovante de pagamento
export const uploadComprovante = async (file, obraId, despesaId) => {
  const fileExt = file.name.split('.').pop();
  const fileName = `${obraId}/${despesaId}-${Math.random().toString(36).substring(2)}.${fileExt}`;
  const filePath = `${fileName}`;
  
  const { data, error } = await supabase.storage
    .from('comprovantes')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: false
    });
  
  if (error) {
    return { data: null, error };
  }
  
  // Obter URL pública do arquivo
  const { data: urlData } = supabase.storage
    .from('comprovantes')
    .getPublicUrl(filePath);
  
  return { data: urlData, error: null };
};

// Buscar estatísticas de despesas
export const getEstatisticasDespesas = async () => {
  const { data: despesas, error } = await supabase
    .from('despesas')
    .select('*');
  
  if (error) {
    return { data: null, error };
  }
  
  // Calcular estatísticas
  const totalDespesas = despesas.length;
  const valorTotal = despesas.reduce((total, despesa) => total + parseFloat(despesa.valor || 0), 0);
  
  // Despesas por categoria
  const categorias = ['material', 'mao_de_obra', 'equipamento', 'servico', 'imposto', 'outro'];
  const despesasPorCategoria = {};
  
  categorias.forEach(categoria => {
    const despesasCategoria = despesas.filter(despesa => despesa.categoria === categoria);
    despesasPorCategoria[categoria] = {
      quantidade: despesasCategoria.length,
      valor: despesasCategoria.reduce((total, despesa) => total + parseFloat(despesa.valor || 0), 0)
    };
  });
  
  // Despesas por status de pagamento
  const despesasPendentes = despesas.filter(despesa => despesa.status_pagamento === 'pendente');
  const despesasPagas = despesas.filter(despesa => despesa.status_pagamento === 'pago');
  
  const valorPendente = despesasPendentes.reduce((total, despesa) => total + parseFloat(despesa.valor || 0), 0);
  const valorPago = despesasPagas.reduce((total, despesa) => total + parseFloat(despesa.valor || 0), 0);
  
  return { 
    data: {
      totalDespesas,
      valorTotal,
      despesasPorCategoria,
      despesasPendentes: {
        quantidade: despesasPendentes.length,
        valor: valorPendente
      },
      despesasPagas: {
        quantidade: despesasPagas.length,
        valor: valorPago
      }
    }, 
    error: null 
  };
}; 