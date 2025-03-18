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
    .order('created_at', { ascending: false });
  
  return { data, error };
};

// Buscar materiais por obra
export const getMaterialsByObraId = async (obraId) => {
  try {
    // Tentar buscar os materiais da etapa diretamente
    const { data, error } = await supabase
      .from('etapas_materiais')
      .select(`
        id,
        material_id,
        etapa_id,
        obra_id,
        quantidade,
        valor_total,
        materiais:material_id (
          id, 
          nome, 
          categoria, 
          unidade, 
          preco_unitario
        )
      `)
      .eq('obra_id', obraId);
    
    // Se ocorrer um erro de relação inválida ou tabela não existente
    if (error) {
      console.log('Erro ao buscar materiais por obra:', error);
      
      // Tentar uma abordagem alternativa com a tabela de movimentação
      const { data: movData, error: movError } = await supabase
        .from('movimentacao_materiais')
        .select(`
          id,
          material_id,
          obra_id,
          quantidade,
          tipo,
          data,
          descricao,
          materiais:material_id (
            id, 
            nome, 
            categoria, 
            unidade, 
            preco_unitario
          )
        `)
        .eq('obra_id', obraId);
      
      if (movError) {
        throw movError;
      }
      
      return { data: movData || [], error: null };
    }
    
    return { data: data || [], error: null };
  } catch (error) {
    console.error('Erro ao buscar materiais por obra:', error);
    return { data: [], error };
  }
};

// Buscar quantitativo total de materiais por obra
export const getQuantitativoMaterialsByObraId = async (obraId) => {
  try {
    // Primeiro, buscar todos os materiais associados a etapas da obra
    const { data: materiaisEtapas, error } = await getMaterialsByObraId(obraId);
    
    if (error) {
      throw error;
    }
    
    // Agrupar materiais por ID e somar quantidades
    const quantitativoMap = {};
    
    materiaisEtapas.forEach(item => {
      const material = item.materiais;
      
      if (!material) return;
      
      if (!quantitativoMap[material.id]) {
        quantitativoMap[material.id] = {
          id: material.id,
          nome: material.nome,
          categoria: material.categoria,
          unidade: material.unidade,
          preco_unitario: material.preco_unitario,
          quantidade_total: 0,
          valor_total: 0,
          etapas: []
        };
      }
      
      // Adicionar quantidade e valor
      const quantidade = parseFloat(item.quantidade || 0);
      quantitativoMap[material.id].quantidade_total += quantidade;
      
      // Calcular valor total (preço unitário * quantidade)
      const valorItem = quantidade * parseFloat(material.preco_unitario || 0);
      quantitativoMap[material.id].valor_total += valorItem;
      
      // Adicionar etapa se disponível e ainda não estiver na lista
      if (item.etapa_id && !quantitativoMap[material.id].etapas.some(e => e.id === item.etapa_id)) {
        quantitativoMap[material.id].etapas.push({
          id: item.etapa_id,
          nome: item.etapa_nome || `Etapa ${item.etapa_id}`
        });
      }
    });
    
    // Converter o mapa em array
    const quantitativo = Object.values(quantitativoMap);
    
    return { data: quantitativo, error: null };
  } catch (error) {
    console.error('Erro ao buscar quantitativo de materiais:', error);
    return { data: [], error };
  }
}; 