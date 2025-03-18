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

// Processar arquivo de orçamento
export const processarArquivoOrcamento = async (file) => {
  try {
    console.log("Iniciando processamento do arquivo de orçamento");
    
    // Verificar buckets disponíveis
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    
    if (bucketsError) {
      console.error('Erro ao listar buckets:', bucketsError);
      return { 
        success: false, 
        error: bucketsError,
        message: 'Erro ao verificar buckets de armazenamento.'
      };
    }
    
    if (!buckets || buckets.length === 0) {
      console.error('Não há buckets disponíveis para upload');
      return {
        success: false,
        error: { message: 'Não há buckets de armazenamento disponíveis' },
        message: 'Não há buckets de armazenamento disponíveis. Entre em contato com o administrador.'
      };
    }
    
    // Usar o primeiro bucket disponível ou procurar por buckets específicos como 'documentos' ou 'comprovantes'
    let bucketToUse = buckets[0].name;
    
    // Verificar se existem buckets específicos que poderíamos usar
    const preferredBuckets = ['arquivos', 'documentos', 'comprovantes'];
    for (const preferred of preferredBuckets) {
      const foundBucket = buckets.find(b => b.name === preferred);
      if (foundBucket) {
        bucketToUse = foundBucket.name;
        break;
      }
    }
    
    console.log(`Usando bucket '${bucketToUse}' para upload do arquivo`);
    
    // Criar um FormData para enviar o arquivo
    const formData = new FormData();
    formData.append('arquivo', file);
    
    // Enviar o arquivo para o servidor através da Storage do Supabase
    const timestamp = Date.now();
    const fileName = `orcamentos/${timestamp}_${file.name}`;
    
    console.log(`Enviando arquivo para o bucket '${bucketToUse}':`, fileName);
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from(bucketToUse)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
    
    if (uploadError) {
      console.error(`Erro ao fazer upload do arquivo para bucket '${bucketToUse}':`, uploadError);
      return { 
        success: false, 
        error: uploadError,
        message: `Erro ao fazer upload do arquivo para bucket '${bucketToUse}': ${uploadError.message}`
      };
    }
    
    // Obter URL pública do arquivo
    const { data: urlData } = await supabase
      .storage
      .from(bucketToUse)
      .getPublicUrl(fileName);
    
    const fileUrl = urlData.publicUrl;
    
    // Iniciar o processamento do arquivo no servidor
    // Aqui simularemos a extração de dados do arquivo
    // Em um sistema real, você usaria um serviço de OCR ou parser específico
    
    // Simular processamento
    // Em um sistema real, isso seria substituído por uma chamada a uma API de processamento
    const processedData = simulateFileProcessing(file);
    
    return {
      success: true,
      data: {
        fornecedor: processedData.fornecedor,
        itens: processedData.itens,
        arquivo_url: fileUrl
      }
    };
    
  } catch (error) {
    console.error('Erro ao processar arquivo de orçamento:', error);
    return {
      success: false,
      error,
      message: 'Erro ao processar o arquivo de orçamento.'
    };
  }
};

// Função para simular a extração de dados do arquivo
// Em uma implementação real, esta seria substituída por OCR ou outro método
function simulateFileProcessing(file) {
  // Aqui estamos apenas retornando dados fictícios para demonstração
  // Em um sistema real, você usaria alguma biblioteca ou API de OCR
  
  return {
    fornecedor: {
      cnpj: '12.345.678/0001-90',
      nome: 'Fornecedor Exemplo',
      telefone: '(11) 1234-5678',
      email: 'contato@fornecedor.com'
    },
    itens: [
      {
        descricao: 'Cimento Portland CP II 50kg',
        unidade: 'sc',
        quantidade: 1,
        valor_unitario: 32.50
      },
      {
        descricao: 'Areia média lavada',
        unidade: 'm³',
        quantidade: 1,
        valor_unitario: 120.00
      },
      {
        descricao: 'Brita nº 1',
        unidade: 'm³',
        quantidade: 1,
        valor_unitario: 95.00
      }
    ]
  };
}

// Adicionar fornecedor a partir dos dados de orçamento
export const adicionarFornecedorFromOrcamento = async (fornecedorData) => {
  try {
    // Verificar se o fornecedor já existe pelo CNPJ
    const { data: fornecedorExistente, error: checkError } = await supabase
      .from('fornecedores')
      .select('id')
      .eq('cnpj', fornecedorData.cnpj)
      .maybeSingle();
      
    if (checkError) {
      throw checkError;
    }
    
    // Se o fornecedor já existe, retornar o ID existente
    if (fornecedorExistente) {
      return {
        success: true,
        data: { id: fornecedorExistente.id },
        message: 'Fornecedor já cadastrado'
      };
    }
    
    // Caso contrário, inserir o novo fornecedor
    const { data, error } = await supabase
      .from('fornecedores')
      .insert([{
        nome: fornecedorData.nome,
        cnpj: fornecedorData.cnpj,
        telefone: fornecedorData.telefone,
        email: fornecedorData.email
      }])
      .select()
      .single();
      
    if (error) {
      throw error;
    }
    
    return {
      success: true,
      data,
      message: 'Fornecedor cadastrado com sucesso'
    };
    
  } catch (error) {
    console.error('Erro ao adicionar fornecedor:', error);
    return {
      success: false,
      error,
      message: 'Erro ao cadastrar fornecedor'
    };
  }
};

// Adicionar materiais a partir dos dados de orçamento
export const adicionarMateriaisFromOrcamento = async (itens, fornecedorId, etapaId = null, obraId = null) => {
  try {
    const resultados = [];
    const erros = [];
    
    for (const item of itens) {
      try {
        // Verificar se o material já existe com a mesma descrição
        const { data: materialExistente, error: checkError } = await supabase
          .from('materiais')
          .select('id')
          .eq('nome', item.descricao)
          .eq('fornecedor_id', fornecedorId)
          .maybeSingle();
          
        if (checkError) throw checkError;
        
        let materialId;
        
        if (materialExistente) {
          // Atualizar material existente
          const { data: updatedMaterial, error: updateError } = await supabase
            .from('materiais')
            .update({
              preco_unitario: item.valor_unitario,
              unidade: item.unidade
            })
            .eq('id', materialExistente.id)
            .select()
            .single();
            
          if (updateError) throw updateError;
          
          materialId = materialExistente.id;
          resultados.push({
            ...updatedMaterial,
            status: 'atualizado'
          });
        } else {
          // Inserir novo material
          const { data: newMaterial, error: insertError } = await supabase
            .from('materiais')
            .insert([{
              nome: item.descricao,
              fornecedor_id: fornecedorId,
              categoria: 'Orçamento Importado',
              unidade: item.unidade,
              preco_unitario: item.valor_unitario,
              quantidade_estoque: 0, // Início sem estoque
              quantidade_minima: 0, // Valor padrão
              descricao: ''
            }])
            .select()
            .single();
            
          if (insertError) throw insertError;
          
          materialId = newMaterial.id;
          resultados.push({
            ...newMaterial,
            status: 'novo'
          });
        }
        
        // Se temos uma etapa e obra específicas, adicionar o material à etapa
        if (etapaId && obraId && materialId) {
          const { error: etapaError } = await supabase
            .from('etapas_materiais')
            .insert([{
              etapa_id: etapaId,
              obra_id: obraId,
              material_id: materialId,
              quantidade: item.quantidade || 1,
              valor_total: (item.quantidade || 1) * item.valor_unitario,
              data_compra: new Date().toISOString().split('T')[0],
              nota_fiscal: 'Orçamento importado',
              observacoes: 'Material adicionado automaticamente a partir de orçamento'
            }]);
            
          if (etapaError) {
            console.error(`Erro ao vincular material ${materialId} à etapa ${etapaId}:`, etapaError);
          }
        }
      } catch (error) {
        console.error(`Erro ao processar item ${item.descricao}:`, error);
        erros.push({
          item,
          error: error.message
        });
      }
    }
    
    return {
      success: erros.length === 0,
      data: resultados,
      erros,
      parcial: erros.length > 0 && resultados.length > 0,
      message: erros.length === 0 
        ? `${resultados.length} materiais processados com sucesso` 
        : `${resultados.length} materiais processados, ${erros.length} com erro`
    };
    
  } catch (error) {
    console.error('Erro ao adicionar materiais:', error);
    return {
      success: false,
      error,
      message: 'Erro ao processar materiais'
    };
  }
}; 