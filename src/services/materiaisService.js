import { supabase } from './supabaseClient';

// Buscar todos os materiais
export const getMateriais = async () => {
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .order('nome');
  
  return { data, error };
};

// Buscar um material específico pelo ID
export const getMaterialById = async (id) => {
  const { data, error } = await supabase
    .from('materiais')
    .select(`
      *,
      movimentacao_materiais(*)
    `)
    .eq('id', id)
    .single();
  
  return { data, error };
};

// Criar um novo material
export const createMaterial = async (materialData) => {
  const { data, error } = await supabase
    .from('materiais')
    .insert([materialData])
    .select();
  
  return { data, error };
};

// Atualizar um material existente
export const updateMaterial = async (id, materialData) => {
  const { data, error } = await supabase
    .from('materiais')
    .update(materialData)
    .eq('id', id)
    .select();
  
  return { data, error };
};

// Excluir um material
export const deleteMaterial = async (id) => {
  const { error } = await supabase
    .from('materiais')
    .delete()
    .eq('id', id);
  
  return { error };
};

// Registrar entrada de material
export const registrarEntradaMaterial = async (materialId, obraId, quantidade, descricao) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    return { data: null, error: userError };
  }
  
  // Registrar movimentação
  const { data, error } = await supabase
    .from('movimentacao_materiais')
    .insert([{
      material_id: materialId,
      obra_id: obraId,
      tipo: 'entrada',
      quantidade,
      data: new Date().toISOString().split('T')[0],
      descricao,
      user_id: userData.user.id
    }])
    .select();
  
  if (error) {
    return { data: null, error };
  }
  
  // Atualizar quantidade em estoque
  const { data: material } = await getMaterialById(materialId);
  
  if (material) {
    const novaQuantidade = parseFloat(material.quantidade_estoque || 0) + parseFloat(quantidade);
    
    const { data: updatedMaterial, error: updateError } = await updateMaterial(materialId, {
      quantidade_estoque: novaQuantidade
    });
    
    if (updateError) {
      return { data: null, error: updateError };
    }
    
    return { data: updatedMaterial, error: null };
  }
  
  return { data, error: null };
};

// Registrar saída de material
export const registrarSaidaMaterial = async (materialId, obraId, quantidade, descricao) => {
  const { data: userData, error: userError } = await supabase.auth.getUser();
  
  if (userError) {
    return { data: null, error: userError };
  }
  
  // Verificar se há quantidade suficiente em estoque
  const { data: material } = await getMaterialById(materialId);
  
  if (!material || parseFloat(material.quantidade_estoque || 0) < parseFloat(quantidade)) {
    return { 
      data: null, 
      error: { message: 'Quantidade insuficiente em estoque' } 
    };
  }
  
  // Registrar movimentação
  const { data, error } = await supabase
    .from('movimentacao_materiais')
    .insert([{
      material_id: materialId,
      obra_id: obraId,
      tipo: 'saida',
      quantidade,
      data: new Date().toISOString().split('T')[0],
      descricao,
      user_id: userData.user.id
    }])
    .select();
  
  if (error) {
    return { data: null, error };
  }
  
  // Atualizar quantidade em estoque
  const novaQuantidade = parseFloat(material.quantidade_estoque) - parseFloat(quantidade);
  
  const { data: updatedMaterial, error: updateError } = await updateMaterial(materialId, {
    quantidade_estoque: novaQuantidade
  });
  
  if (updateError) {
    return { data: null, error: updateError };
  }
  
  return { data: updatedMaterial, error: null };
};

// Buscar materiais com estoque baixo
export const getMateriaisEstoqueBaixo = async () => {
  // Primeiro, buscar todos os materiais
  const { data, error } = await supabase
    .from('materiais')
    .select('*')
    .order('nome');
  
  if (error) {
    return { data: null, error };
  }
  
  // Filtrar materiais com estoque abaixo do mínimo
  const materiaisEstoqueBaixo = data.filter(material => 
    parseFloat(material.quantidade_estoque || 0) < parseFloat(material.estoque_minimo || 0)
  );
  
  return { data: materiaisEstoqueBaixo, error: null };
};

// Buscar histórico de movimentações de um material
export const getHistoricoMaterial = async (materialId) => {
  const { data, error } = await supabase
    .from('movimentacao_materiais')
    .select(`
      *,
      obras (id, nome)
    `)
    .eq('material_id', materialId)
    .order('data', { ascending: false });
  
  return { data, error };
}; 