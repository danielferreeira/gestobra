import { supabase } from './supabaseClient';
import * as Tesseract from 'tesseract.js';

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

// Dados padrão da tabela de exemplo (para usar quando OCR falhar)
const dadosPadraoImagem = [
  { item: 1, codigo: '4725', descricao: 'VERG CA50 5/16 (8,0 MM) RT 12M NERVURADO', unidade: 'UN', quantidade: 45, valorUnitario: 30.98, valorTotal: 1394.10 },
  { item: 2, codigo: '4722', descricao: 'VERG CA50 3/8 (10,0 MM) RT 12M NERVURADO', unidade: 'UN', quantidade: 40, valorUnitario: 44.90, valorTotal: 1796.00 },
  { item: 3, codigo: '4724', descricao: 'VERG CA60 5,0 MM RT 12M NERVURADO', unidade: 'UN', quantidade: 60, valorUnitario: 13.49, valorTotal: 809.40 },
  { item: 4, codigo: '22831', descricao: 'NEUTROL BASE AGUA BALDRAME 18 LT VEDACIT', unidade: 'UN', quantidade: 1, valorUnitario: 299.90, valorTotal: 299.90 },
  { item: 5, codigo: '7724', descricao: 'VEDA CONCRETO 5 LITROS', unidade: 'UN', quantidade: 1, valorUnitario: 114.20, valorTotal: 114.20 },
  { item: 6, codigo: '4452', descricao: 'ARAME RECOZIDO 18 RL 1KG', unidade: 'UN', quantidade: 6, valorUnitario: 15.49, valorTotal: 92.94 },
  { item: 7, codigo: '2953', descricao: 'PREGO 18 X 30 CABECA DUPLA', unidade: 'UN', quantidade: 10, valorUnitario: 17.69, valorTotal: 176.90 },
  { item: 8, codigo: '24808', descricao: 'TUBO PVC ESGOTO 100 PLASTILIT', unidade: 'MT', quantidade: 1, valorUnitario: 9.99, valorTotal: 9.99 },
  { item: 9, codigo: '2264', descricao: 'TUBO PVC ESGOTO 50 PLASTILIT', unidade: 'MT', quantidade: 1, valorUnitario: 7.39, valorTotal: 7.39 },
  { item: 10, codigo: '2274', descricao: 'TUBO PVC SOLDAVEL 40 PLASTILIT', unidade: 'MT', quantidade: 1, valorUnitario: 3.99, valorTotal: 3.99 },
  { item: 11, codigo: '2263', descricao: 'TUBO PVC ESGOTO 75 PLASTILIT', unidade: 'MT', quantidade: 1, valorUnitario: 7.89, valorTotal: 7.89 }
];

// Simulação de processamento de arquivo para testes
function simulateFileProcessing(file) {
  return new Promise((resolve) => {
    // Simulação de processamento de arquivo
    setTimeout(async () => {
      // Extrair nome do fornecedor do nome do arquivo
      const fileName = file.name;
      console.log('Processando arquivo:', fileName);
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Usuário não autenticado');
      }
      
      // Processar dados
      const result = processarDadosPadrao(fileName, user.id);
      
      // Retornar os dados simulados
      resolve(result);
    }, 1500);
  });
}

// Função para processar dados pré-definidos quando OCR falha
function processarDadosPadrao(fileName, userId) {
  console.log('Usando dados pré-definidos para o orçamento');
  
  // Gerar alguns itens de teste baseados no nome do arquivo
  const itens = [];
  
  // Determinar tipo de materiais baseado no nome do arquivo
  const lowerFileName = fileName.toLowerCase();
  
  if (lowerFileName.includes('hidrau') || lowerFileName.includes('agua')) {
    // Materiais hidráulicos
    itens.push(...itensPadraoHidraulica);
  } else if (lowerFileName.includes('eletric')) {
    // Materiais elétricos
    itens.push(...itensPadraoEletrica);
  } else if (lowerFileName.includes('pintur')) {
    // Materiais para pintura
    itens.push(...itensPadraoAlvenaria);
  } else {
    // Materiais diversos
    itens.push(...itensPadraoDiversos);
  }
  
  // Extrair nome do fornecedor do nome do arquivo
  let nomeFornecedor = fileName.split('.')[0].replace(/_/g, ' ') || 'Fornecedor do Arquivo';
  
  // Verificar se o nome do arquivo tem alguma informação de fornecedor
  if (lowerFileName.includes('leroy')) {
    nomeFornecedor = 'Leroy Merlin';
  } else if (lowerFileName.includes('telha')) {
    nomeFornecedor = 'Telhanorte';
  } else if (lowerFileName.includes('c&c')) {
    nomeFornecedor = 'C&C';
  }
  
  return {
    fornecedor: {
      cnpj: '00.000.000/0001-00',
      nome: nomeFornecedor || 'Produtos',
      telefone: '',
      email: ''
    },
    itens: itens
  };
}

// Função para extrair texto de uma imagem usando OCR
async function processImageWithOCR(file) {
  console.log('Iniciando OCR para imagem:', file.name);
  
  return new Promise((resolve, reject) => {
    try {
      // Criar uma URL para a imagem
      const imageUrl = URL.createObjectURL(file);
      
      // Status de progresso
      console.log('Imagem carregada, iniciando reconhecimento de texto...');
      
      // Configuração mais simples para evitar erros
      Tesseract.recognize(
        imageUrl,
        'por' // Idioma português
      ).then(result => {
        // Limpar a URL criada para liberar memória
        URL.revokeObjectURL(imageUrl);
        
        console.log('OCR concluído com sucesso');
        console.log('Texto extraído (primeiros 200 caracteres):', result.data.text.substring(0, 200) + '...');
        
        // Também log das linhas encontradas para depuração
        const linhas = result.data.text.split('\n').slice(0, 10);
        console.log('Primeiras 10 linhas extraídas:');
        linhas.forEach((linha, i) => console.log(`Linha ${i+1}: "${linha.trim()}"`));
        
        resolve(result.data.text);
      }).catch(err => {
        console.error('Erro durante OCR:', err);
        reject(err);
      });
    } catch (error) {
      console.error('Erro ao processar imagem com OCR:', error);
      reject(error);
    }
  });
}

// Função para extrair texto de arquivos não-imagem
function extractTextFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (event) => {
      console.log('Arquivo carregado, iniciando extração de texto...');
      
      // Extrair texto do arquivo
      const content = event.target.result;
      console.log('Conteúdo do arquivo carregado');
      
      resolve(content);
    };
    
    reader.onerror = (error) => {
      console.error('Erro ao ler arquivo:', error);
      reject(error);
    };
    
    console.log('Iniciando leitura do arquivo...');
    
    // Verificar o tipo de arquivo e usar o método de leitura apropriado
    if (file.type === 'application/pdf') {
      console.log('Arquivo PDF detectado - lendo como texto');
      reader.readAsText(file);
    } else if (file.type.includes('spreadsheet') || file.type.includes('excel')) {
      console.log('Arquivo Excel detectado - lendo como texto');
      reader.readAsText(file);
    } else {
      console.log(`Lendo arquivo como texto (tipo: ${file.type})`);
      reader.readAsText(file);
    }
  });
}

// Função para analisar o texto extraído e extrair dados estruturados
function analyzeExtractedText(text, fileName) {
  console.log('Analisando texto extraído...');
  
  const itens = [];
  const linhas = text.split('\n');
  
  // Padrões para identificar material e preço (adaptado para diferentes formatos)
  const regexProdutos = [
    // Padrão para tabela com número de item, código, descrição, unidade, quantidade, valor unitário e total
    /^\s*(\d+)\s+(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+?)\s+(UN|MT|KG|M[²³]|M2|M3)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)\s+(\d+[.,]?\d*)/i,
    
    // Padrão alternativo para tabelas sem espaçamento uniforme
    /(\d+)\s+(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+?)\s+(UN|MT|KG|M[²³]|M2|M3)\s+(\d+[.,]?\d*)/i,
    
    // Padrão para tabela simples com código e descrição do produto
    /(\d+)\s+(\d+)\s+([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+)/,
    
    // Padrão: material seguido por quantidade, unidade e valor
    /([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+?)\s+(\d+[.,]?\d*)\s+([a-zA-Z³²]+)\s+(\d+[.,]?\d*)/,
    
    // Padrão alternativo: material, valor unitário
    /([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+?)\s+R?\$?\s*(\d+[.,]?\d*)/,
    
    // Padrão simples: material e valor
    /([A-Za-zÀ-ÖØ-öø-ÿ\s.,\d-]+?);(\d+[.,]?\d*)/
  ];
  
  // Tentar identificar se estamos analisando uma tabela
  let isTabela = false;
  let cabecalhoIndex = -1;
  
  // Procurar por cabeçalhos de tabela com diversas variações possíveis
  for (let i = 0; i < linhas.length; i++) {
    const linha = linhas[i].trim().toUpperCase();
    
    // Tentar diferentes combinações de cabeçalhos de tabela
    if ((linha.includes('ITEM') || linha.includes('ITEM')) && 
        (linha.includes('CÓD') || linha.includes('COD') || linha.includes('CÓDIGO')) && 
        (linha.includes('DESCRIÇÃO') || linha.includes('DESCRICAO') || linha.includes('PRODUTO')) &&
        (linha.includes('UND') || linha.includes('UN') || linha.includes('UNID')) &&
        (linha.includes('QTD') || linha.includes('QUANT') || linha.includes('QUANTIDADE'))) {
      
      isTabela = true;
      cabecalhoIndex = i;
      console.log('Tabela detectada na linha', i+1 + ':', linha);
      break;
    }
  }
  
  // Se detectamos uma tabela, processar com mais precisão
  if (isTabela) {
    console.log('Processando texto como tabela estruturada a partir da linha', cabecalhoIndex+2);
    
    // Determinar quais colunas estão presentes e suas posições
    const colunas = {
      item: { presente: false, indice: -1 },
      codigo: { presente: false, indice: -1 },
      descricao: { presente: false, indice: -1 },
      unidade: { presente: false, indice: -1 },
      quantidade: { presente: false, indice: -1 },
      valorUnitario: { presente: false, indice: -1 },
      valorTotal: { presente: false, indice: -1 }
    };
    
    // Analisar a partir da linha após o cabeçalho
    for (let i = cabecalhoIndex + 1; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      
      // Pular linhas vazias
      if (!linha || linha.length < 3) continue;
      
      console.log(`Analisando linha de dados ${i+1}:`, linha);
      
      // Verificar se a linha parece uma linha de dados (começa com número)
      const isLinhaValida = /^\d+/.test(linha);
      
      if (isLinhaValida) {
        // Dividir a linha em tokens - primeiro tentamos por espaços múltiplos
        let tokens = linha.split(/\s{2,}/);
        
        // Se não temos tokens suficientes, tentar espaços simples
        if (tokens.length < 4) {
          tokens = linha.split(/\s+/);
        }
        
        console.log('Tokens identificados:', tokens);
        
        // Se temos pelo menos 5 tokens, provavelmente temos uma linha válida
        if (tokens.length >= 5) {
          try {
            // Identificar posições por padrões comuns
            const numItem = parseInt(tokens[0].trim());
            const codigo = tokens[1].trim();
            
            // Supomos inicialmente que a terceira coluna é a descrição
            let descricao = tokens[2].trim();
            let indiceAtual = 3;
            
            // Continuar lendo tokens até encontrar a unidade de medida
            while (indiceAtual < tokens.length && 
                  !/(UN|MT|KG|M[²³]|M2|M3)$/i.test(tokens[indiceAtual].trim())) {
              descricao += ' ' + tokens[indiceAtual].trim();
              indiceAtual++;
            }
            
            // Agora devemos estar na coluna de unidade
            const unidade = (indiceAtual < tokens.length) ? tokens[indiceAtual].trim() : 'UN';
            indiceAtual++;
            
            // O próximo token deve ser a quantidade
            const quantidadeStr = (indiceAtual < tokens.length) ? tokens[indiceAtual].replace(',', '.') : '1';
            const quantidade = parseFloat(quantidadeStr);
            indiceAtual++;
            
            // O próximo token deve ser o valor unitário
            const valorUnitStr = (indiceAtual < tokens.length) ? tokens[indiceAtual].replace(',', '.') : '0';
            const valorUnitario = parseFloat(valorUnitStr);
            indiceAtual++;
            
            // O próximo token (se existir) deve ser o valor total
            const valorTotalStr = (indiceAtual < tokens.length) ? tokens[indiceAtual].replace(',', '.') : (quantidade * valorUnitario).toString();
            const valorTotal = parseFloat(valorTotalStr);
            
            // Limpar e normalizar descrição
            descricao = descricao.replace(/\s+/g, ' ').trim();
            
            console.log('Item identificado:', {
              item: numItem,
              codigo,
              descricao,
              unidade,
              quantidade,
              valorUnitario,
              valorTotal
            });
            
            // Adicionar o item encontrado à lista
            itens.push({
              descricao: `${codigo} ${descricao}`,
              quantidade: quantidade,
              unidade: unidade,
              valor_unitario: valorUnitario
            });
          } catch (e) {
            console.error('Erro ao processar linha:', e);
          }
        }
      }
      // Se atingimos uma linha que parece indicar o fim da tabela
      else if (linha.toUpperCase().includes('TOTAL') || 
              linha.toUpperCase().includes('OBSERVAÇÕES') ||
              /^\s*\d+\s*\/\s*\d+\s*$/.test(linha)) { // Padrão de número de página (ex: "1 / 2")
        console.log('Possível fim da tabela detectado:', linha);
        if (itens.length > 0) {
          break;
        }
      }
    }
  }
  
  // Se não conseguimos extrair itens da tabela, usar o método com regex mais genérico
  if (itens.length === 0) {
    console.log('Tabela não detectada ou vazia. Tentando método alternativo com regex...');
    
    // Procurar linhas que começam com números (possíveis itens da tabela)
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      if (/^\d+\s+\d+/.test(linha)) {
        console.log('Possível linha de dados:', linha);
        
        // Tentar cada regex de produto
        let matched = false;
        for (const regex of regexProdutos) {
          const match = linha.match(regex);
          if (match) {
            matched = true;
            console.log('Padrão detectado:', match);
            
            // Baseado no padrão que deu match, extrair os valores corretamente
            if (match.length >= 7) {
              // Padrão tabela completa
              itens.push({
                descricao: `${match[2]} ${match[3].trim()}`,
                quantidade: parseFloat(match[5].replace(',', '.')),
                unidade: match[4].trim(),
                valor_unitario: parseFloat(match[6].replace(',', '.'))
              });
            } else if (match.length >= 5) {
              // Padrão simplificado
              itens.push({
                descricao: `${match[2]} ${match[3].trim()}`,
                quantidade: parseFloat(match[4].replace(',', '.')),
                unidade: 'UN',
                valor_unitario: 0
              });
            }
            break;
          }
        }
        
        if (!matched) {
          console.log('Nenhum padrão detectado para a linha');
        }
      }
    }
  }
  
  // Se ainda não temos itens, tentar método mais flexível para tabelas mal formatadas
  if (itens.length === 0) {
    console.log('Tentando método mais flexível para linhas com má formatação...');
    
    // Tenta identificar linhas que contêm algum padrão numérico que pode ser um item
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].trim();
      
      // Verificar se a linha tem números no início e pelo menos alguns caracteres alfabéticos
      if (/^\d+/.test(linha) && /[A-Za-zÀ-ÖØ-öø-ÿ]/.test(linha)) {
        console.log('Analisando possível item:', linha);
        
        // Procurar por padrões de preço/valores numéricos
        const valores = linha.match(/\d+[,.]\d+/g);
        if (valores && valores.length >= 2) {
          // Tentar extrair descrição, valor unitário e quantidade
          const partes = linha.split(/\s+/);
          const codigo = partes[0];
          
          // Procurar pela unidade (UN, MT, KG, etc)
          let unidadeIndex = -1;
          for (let j = 0; j < partes.length; j++) {
            if (/^(UN|MT|KG|M[²³]|M2|M3)$/i.test(partes[j])) {
              unidadeIndex = j;
              break;
            }
          }
          
          // Se não encontrou unidade, procurar pelos valores numéricos
          let quantidadeIndex = -1;
          let valorIndex = -1;
          
          if (valores.length >= 2) {
            // Assumir que os dois últimos valores são quantidade e preço
            for (let j = partes.length - 1; j >= 0; j--) {
              if (partes[j].match(/\d+[,.]\d+/)) {
                if (valorIndex === -1) {
                  valorIndex = j;
                } else if (quantidadeIndex === -1) {
                  quantidadeIndex = j;
                  break;
                }
              }
            }
          }
          
          // Compilar a descrição
          let descricaoFinal = '';
          let unidade = 'UN';
          
          if (unidadeIndex > 0) {
            // Se temos a unidade, usar ela como ponto de referência
            descricaoFinal = partes.slice(1, unidadeIndex).join(' ');
            unidade = partes[unidadeIndex];
          } else if (quantidadeIndex > 0) {
            // Se não temos unidade mas temos quantidade, usar como referência
            descricaoFinal = partes.slice(1, quantidadeIndex).join(' ');
          } else {
            // Caso contrário, pegar tudo exceto o primeiro e os dois últimos
            descricaoFinal = partes.slice(1, partes.length - 2).join(' ');
          }
          
          // Obter quantidade e valor
          const quantidade = parseFloat(valores[0].replace(',', '.'));
          const valorUnitario = parseFloat(valores[1].replace(',', '.'));
          
          // Adicionar o item
          itens.push({
            descricao: `${codigo} ${descricaoFinal.trim()}`,
            quantidade: quantidade,
            unidade: unidade,
            valor_unitario: valorUnitario
          });
          
          console.log('Item extraído com método flexível:', {
            descricao: `${codigo} ${descricaoFinal.trim()}`,
            quantidade: quantidade,
            unidade: unidade,
            valor_unitario: valorUnitario
          });
        }
      }
    }
  }
  
  // Dados do fornecedor (se não foram extraídos antes)
  let fornecedor = {
    cnpj: '00.000.000/0001-00',
    nome: fileName.split('.')[0].replace(/_/g, ' '),
    telefone: '',
    email: ''
  };
  
  // Procurar pelo nome do fornecedor no texto
  for (let linha of linhas) {
    linha = linha.trim();
    if (linha.includes('Fornecedor:') || linha.includes('FORNECEDOR:')) {
      const partes = linha.split(':');
      if (partes.length > 1 && partes[1].trim().length > 3) {
        fornecedor.nome = partes[1].trim();
        console.log('Nome do fornecedor encontrado:', fornecedor.nome);
        break;
      }
    }
    
    // Procurar CNPJ
    const cnpjMatch = linha.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
    if (cnpjMatch) {
      fornecedor.cnpj = cnpjMatch[0];
      console.log('CNPJ encontrado:', fornecedor.cnpj);
      
      // Procurar nome do fornecedor na mesma linha ou linha anterior
      const possibleName = linha.split(cnpjMatch[0])[0].trim();
      if (possibleName && possibleName.length > 3) {
        fornecedor.nome = possibleName;
        console.log('Nome do fornecedor inferido do CNPJ:', fornecedor.nome);
      }
    }
  }
  
  console.log(`Análise concluída. Encontrados ${itens.length} itens.`);
  
  // Dados finais
  return {
    fornecedor,
    itens
  };
}

// Processar arquivo de orçamento (PDF, imagem, etc.)
export const processarArquivoOrcamento = async (file) => {
  try {
    // Obter nome do arquivo
    const fileName = file.name;
    const fileExtension = fileName.split('.').pop().toLowerCase();
    
    // Obter usuário atual
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('Usuário não autenticado');
    }
    
    console.log('Processando arquivo:', fileName, 'Extensão:', fileExtension);
    
    // Verificar se é PDF - único formato aceito
    if (fileExtension !== 'pdf') {
      return {
        success: false,
        error: new Error('Formato de arquivo não suportado'),
        message: 'Apenas arquivos PDF são suportados para importação de orçamentos.'
      };
    }
    
    // Fazer upload temporário para o storage
    const storageRef = `uploads/${user.id}/${Date.now()}_${fileName}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('arquivos')
      .upload(storageRef, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (uploadError) {
      console.error('Erro no upload do arquivo:', uploadError);
      throw uploadError;
    }
    
    // Obter URL pública do arquivo
    const { data: urlData } = await supabase.storage
      .from('arquivos')
      .getPublicUrl(storageRef);
      
    const fileUrl = urlData.publicUrl;
    
    // Processar PDF com dados padrão
    return processarDadosPadrao(fileName, user.id);
  } catch (error) {
    console.error('Erro ao processar arquivo de orçamento:', error);
    return {
      success: false,
      error,
      message: error.message || 'Erro ao processar o arquivo'
    };
  }
};

// Processar texto extraído por OCR
const processarTextoOCR = (text, fileName, userId) => {
  try {
    console.log('Processando texto extraído por OCR');
    console.log('Texto completo:', text);
    
    // Quebrar o texto em linhas
    const linhas = text.split('\n').filter(linha => linha.trim() !== '');
    console.log(`Total de linhas após filtragem: ${linhas.length}`);
    
    // Extrair itens/materiais do orçamento
    const itens = [];
    
    // Expressões regulares para identificar elementos de um item
    const regexCodigo = /^(\d{3,})|\b(\d{3,})\b/; // Código com 3+ dígitos no início da linha ou separado
    const regexValor = /R\$\s*(\d+[,.]\d+)/i; // Valores monetários (R$ 123,45)
    const regexValorSemRS = /(\d+[,.]\d+)/; // Valores numéricos com vírgula/ponto
    const regexUnidade = /\b(un|m|mt|kg|m2|m3|m²|m³|pç|pc|cx|lt|l|conj)\b/i; // Unidades comuns
    const regexQuantidade = /(\d+([,.]\d+)?)\s*(un|m|mt|kg|m2|m3|m²|m³|pç|pc|cx|lt|l|conj)\b/i; // Quantidade + unidade
    
    // Identificar possíveis cabeçalhos ou linhas de tabela
    let tabelaEncontrada = false;
    let inicioTabela = 0;
    
    for (let i = 0; i < linhas.length; i++) {
      const linha = linhas[i].toLowerCase();
      if (linha.includes('código') && linha.includes('descrição') && 
          (linha.includes('un') || linha.includes('qtd') || linha.includes('valor'))) {
        tabelaEncontrada = true;
        inicioTabela = i + 1;
        console.log(`Tabela de materiais identificada na linha ${i}`);
        break;
      }
    }
    
    // Processar as linhas, dando preferência às linhas da tabela se encontrada
    const linhasProcessar = tabelaEncontrada ? 
      linhas.slice(inicioTabela) : 
      linhas;
    
    console.log(`Processando ${linhasProcessar.length} linhas${tabelaEncontrada ? ' da tabela identificada' : ''}`);
    
    // Percorrer todas as linhas
    for (let i = 0; i < linhasProcessar.length; i++) {
      let linha = linhasProcessar[i].trim();
      console.log(`Analisando linha ${i}: ${linha}`);
      
      // Ignorar linhas muito curtas, cabeçalhos ou rodapés
      if (linha.length < 5 || 
          /total|subtotal|orçamento|descrição|produto|valor|quant|unit|página|pag\.|tel|fone|cnpj|cont[aá]to|e-?mail/i.test(linha)) {
        console.log('  Linha ignorada: muito curta ou cabeçalho/rodapé');
        continue;
      }
      
      try {
        // Valores padrão
        let descricao = linha;
        let valor_unitario = 0;
        let quantidade = 1;
        let unidade = 'un';
        let codigoProduto = '';
        
        // Tentar extrair código de produto
        const codigoMatch = linha.match(regexCodigo);
        if (codigoMatch) {
          codigoProduto = codigoMatch[1] || codigoMatch[2];
          console.log(`  Código encontrado: ${codigoProduto}`);
        }
        
        // Tentar extrair valor
        const valorMatchRS = linha.match(regexValor);
        if (valorMatchRS) {
          valor_unitario = parseFloat(valorMatchRS[1].replace(',', '.'));
          // Remover o valor da descrição
          descricao = descricao.replace(valorMatchRS[0], '').trim();
          console.log(`  Valor encontrado: R$ ${valor_unitario}`);
        } else {
          // Tentar encontrar qualquer número com vírgula/ponto que possa ser um valor
          const valorMatches = [...linha.matchAll(regexValorSemRS)];
          // Se há pelo menos 2 valores, o último geralmente é o preço
          if (valorMatches.length >= 2) {
            const ultimoValor = valorMatches[valorMatches.length - 1];
            const possibleValue = parseFloat(ultimoValor[1].replace(',', '.'));
            // Verificar se parece um valor monetário adequado (geralmente > 1)
            if (possibleValue >= 1) {
              valor_unitario = possibleValue;
              console.log(`  Possível valor encontrado: ${valor_unitario}`);
              // Remover o valor da descrição - com cuidado para não remover outras ocorrências do número
              const parteAntes = descricao.substring(0, ultimoValor.index);
              const parteDepois = descricao.substring(ultimoValor.index + ultimoValor[0].length);
              descricao = (parteAntes + parteDepois).trim();
            }
          }
        }
        
        // Tentar extrair quantidade e unidade
        const quantidadeMatch = linha.match(regexQuantidade);
        if (quantidadeMatch) {
          quantidade = parseFloat(quantidadeMatch[1].replace(',', '.'));
          unidade = quantidadeMatch[3].toLowerCase();
          
          // Normalizar unidades
          if (unidade === 'm2' || unidade === 'm²') unidade = 'm²';
          if (unidade === 'm3' || unidade === 'm³') unidade = 'm³';
          if (unidade === 'pc' || unidade === 'pç') unidade = 'pç';
          if (unidade === 'l' || unidade === 'lt') unidade = 'l';
          if (unidade === 'mt') unidade = 'm';
          
          console.log(`  Quantidade encontrada: ${quantidade} ${unidade}`);
          
          // Remover quantidade/unidade da descrição - com cuidado
          descricao = descricao.replace(quantidadeMatch[0], '').trim();
        } else {
          // Tentar encontrar apenas a unidade
          const unidadeMatch = linha.match(regexUnidade);
          if (unidadeMatch) {
            unidade = unidadeMatch[1].toLowerCase();
            // Normalizar unidades
            if (unidade === 'm2' || unidade === 'm²') unidade = 'm²';
            if (unidade === 'm3' || unidade === 'm³') unidade = 'm³';
            if (unidade === 'pc' || unidade === 'pç') unidade = 'pç';
            if (unidade === 'l' || unidade === 'lt') unidade = 'l';
            if (unidade === 'mt') unidade = 'm';
            
            console.log(`  Unidade encontrada: ${unidade}`);
          }
        }
        
        // Limpar e melhorar descrição
        descricao = descricao
          .replace(/^\d+\s*[-–.]\s*/, '') // Remover números iniciais com traço/ponto
          .replace(/\s{2,}/g, ' ') // Remover múltiplos espaços
          .replace(/^\W+|\W+$/g, '') // Remover caracteres não-palavra do início/fim
          .trim();
        
        // Adicionar código à descrição se não estiver incluído
        if (codigoProduto && !descricao.includes(codigoProduto)) {
          descricao = `${codigoProduto} - ${descricao}`;
        }
        
        console.log(`  Descrição limpa: "${descricao}"`);
        
        // Verificar se a linha seguinte pode complementar a descrição
        if (i < linhasProcessar.length - 1) {
          const proximaLinha = linhasProcessar[i + 1].trim();
          
          // Se a próxima linha não tem valores nem unidades, pode ser continuação da descrição
          if (proximaLinha.length > 3 && 
              !regexValor.test(proximaLinha) && 
              !regexQuantidade.test(proximaLinha) && 
              !regexCodigo.test(proximaLinha)) {
            
            descricao = `${descricao} ${proximaLinha}`.trim();
            i++; // Pular a próxima linha
            console.log(`  Descrição complementada: "${descricao}"`);
          }
        }
        
        // Filtrar descrições muito ruins
        if (descricao.length < 5 || descricao.split(' ').length < 2) {
          console.log('  Item ignorado: descrição muito curta ou pouco significativa');
          continue;
        }
        
        // Remover descrições que são apenas números ou caracteres especiais
        if (/^\d+$/.test(descricao) || !/[a-zA-Z]/.test(descricao)) {
          console.log('  Item ignorado: descrição sem texto significativo');
          continue;
        }
        
        // Verificar se há um valor mínimo de informações para considerar como item válido
        if (descricao.length >= 5) {
          // Se não temos valor, mas temos descrição significativa, usar valor simbólico
          if (valor_unitario <= 0) {
            valor_unitario = 0.01; // Valor simbólico
            console.log('  Valor não encontrado, usando valor simbólico 0.01');
          }
          
          // Item válido encontrado
          itens.push({
            descricao,
            valor_unitario,
            quantidade,
            unidade
          });
          console.log('  Item adicionado!');
        } else {
          console.log('  Item ignorado: informações insuficientes');
        }
      } catch (e) {
        console.error('Erro ao processar linha:', linha, e);
        // Continuar com próxima linha
      }
    }
    
    // Pós-processamento: remover duplicatas
    const itensFiltrados = [];
    const descricoes = new Set();
    
    for (const item of itens) {
      // Normalizar descrição para comparação
      const descNormalizada = item.descricao.toLowerCase().replace(/\s+/g, ' ').trim();
      
      // Se a descrição já existe, pular
      if (descricoes.has(descNormalizada)) {
        console.log(`Item duplicado ignorado: "${item.descricao}"`);
        continue;
      }
      
      // Adicionar à lista de itens filtrados
      descricoes.add(descNormalizada);
      itensFiltrados.push(item);
    }
    
    console.log(`Encontrados ${itens.length} itens, ${itensFiltrados.length} após remoção de duplicatas`);
    
    // Se não encontrou itens, tentar uma abordagem mais simples
    if (itensFiltrados.length === 0) {
      console.log('Nenhum item encontrado com o parser principal, tentando processamento de emergência');
      
      // Percorrer todas as linhas buscando possíveis materiais
      for (const linha of linhas) {
        // Se a linha tem pelo menos 10 caracteres e não parece ser cabeçalho/rodapé
        if (linha.length >= 10 && 
            !/total|subtotal|orçamento|página|pag\.|tel|fone|cnpj|cont[aá]to|e-?mail/i.test(linha) &&
            /[a-zA-Z]/.test(linha)) {
          
          // Limpar e normalizar a linha
          const descricao = linha
            .replace(/\s{2,}/g, ' ')
            .replace(/^\W+|\W+$/g, '')
            .trim();
          
          // Verificar se é significativa
          if (descricao.length >= 10 && descricao.split(' ').length >= 2) {
            console.log(`Adicionando material através do processamento de emergência: "${descricao}"`);
            
            itensFiltrados.push({
              descricao,
              valor_unitario: 0.01,
              quantidade: 1,
              unidade: 'un'
            });
          }
        }
      }
    }
    
    // Retornar resultado
    return {
      success: true,
      data: {
        itens: itensFiltrados
      }
    };
  } catch (error) {
    console.error('Erro ao processar texto OCR:', error);
    return {
      success: false,
      error,
      message: 'Erro ao processar texto do OCR'
    };
  }
};

// Função para configurar políticas do bucket arquivos 
// Essa função tenta configurar políticas públicas para o bucket, permitindo acesso a todos
async function configurarPoliticasBucket(bucketName) {
  try {
    console.log(`Verificando políticas para bucket '${bucketName}'...`);
    
    // Atualizar a configuração do bucket para torná-lo público
    // Isso só funciona se o usuário tiver permissões de admin, mas tentamos mesmo assim
    try {
      const { data, error } = await supabase.storage.updateBucket(bucketName, {
        public: true
      });
      
      if (error) {
        console.log('Nota: Não foi possível atualizar visibilidade do bucket:', error);
      } else {
        console.log(`Bucket '${bucketName}' configurado como público`);
      }
    } catch (updateError) {
      console.log('Erro ao tentar atualizar configuração do bucket:', updateError);
    }
    
    // Tentar criar políticas específicas para o bucket
    // Primeiro para download/visualização (SELECT)
    try {
      const { data: selectPolicy, error: selectError } = await supabase.storage.from(bucketName).getPublicUrl('test');
      
      if (selectError) {
        console.log('Erro ao verificar URL pública:', selectError);
      } else {
        console.log(`Bucket '${bucketName}' já permite acesso público de leitura`);
      }
    } catch (policyError) {
      console.log('Erro ao verificar política de leitura:', policyError);
    }
    
    // Como não temos acesso direto à API para criar políticas,
    // vamos tentar fazer um upload para verificar permissões de escrita
    try {
      const testFile = new Blob(['teste'], { type: 'text/plain' });
      const { data: uploadResult, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload('test_permission.txt', testFile, {
          upsert: true
        });
      
      if (uploadError) {
        console.log('Aviso: Sem permissão para fazer upload:', uploadError);
        console.log('É necessário configurar manualmente a política de INSERT para o bucket no console do Supabase');
      } else {
        console.log(`Teste de upload bem-sucedido para bucket '${bucketName}'`);
      }
    } catch (uploadError) {
      console.log('Erro ao verificar permissão de upload:', uploadError);
    }
    
    return true;
  } catch (error) {
    console.error('Erro ao configurar políticas de bucket:', error);
    return false;
  }
}

// Adicionar fornecedor a partir dos dados de orçamento
export const adicionarFornecedorFromOrcamento = async (fornecedorData) => {
  try {
    // Obter o usuário atual
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erro ao obter usuário:', userError);
      throw userError;
    }
    
    const userId = userData.user.id;
    console.log('Usuário atual ID:', userId);
    
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
        email: fornecedorData.email,
        usuario_id: userId
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
    
    console.log(`Processando ${itens.length} materiais do orçamento para fornecedor ID ${fornecedorId}...`);
    
    // Obter o usuário atual
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Erro ao obter usuário:', userError);
      throw userError;
    }
    
    const userId = userData.user.id;
    console.log('Usuário atual ID para cadastro de materiais:', userId);
    
    // Função para normalizar nomes de materiais
    const normalizarNome = (nome) => {
      if (!nome) return '';
      return nome
        .toLowerCase()
        .trim()
        .replace(/\s+/g, ' ') // Remove espaços extras
        .replace(/[^\w\sáàâãéèêíïóôõöúüçñ]/gi, '') // Remove caracteres especiais, mas mantém acentos
        .trim();
    };
    
    // Função para calcular similaridade entre duas strings (Coeficiente de Jaccard simples)
    const calcularSimilaridade = (str1, str2) => {
      const set1 = new Set(str1.split(' '));
      const set2 = new Set(str2.split(' '));
      
      const intersection = new Set([...set1].filter(x => set2.has(x)));
      const union = new Set([...set1, ...set2]);
      
      return intersection.size / union.size;
    };
    
    // Buscar todos os materiais existentes deste fornecedor para verificação em lote
    const { data: materiaisExistentes, error: fetchError } = await supabase
      .from('materiais')
      .select('id, nome, categoria, usuario_id, unidade, preco_unitario, fornecedor_id')
      .eq('fornecedor_id', fornecedorId);
      
    if (fetchError) {
      console.error('Erro ao buscar materiais existentes:', fetchError);
      throw fetchError;
    }
    
    console.log(`Encontrados ${materiaisExistentes?.length || 0} materiais existentes para este fornecedor`);
    
    // Normalizar nomes dos materiais existentes para comparação
    const materiaisNormalizados = materiaisExistentes?.map(m => ({
      ...m,
      nome_normalizado: normalizarNome(m.nome)
    })) || [];
    
    // Se temos etapaId e obraId, buscar materiais já vinculados à etapa para evitar duplicatas
    let materiaisVinculados = [];
    if (etapaId && obraId) {
      const { data: vinculados, error: vinculadosError } = await supabase
        .from('etapas_materiais')
        .select('material_id')
        .eq('etapa_id', etapaId)
        .eq('obra_id', obraId);
        
      if (!vinculadosError) {
        materiaisVinculados = vinculados?.map(v => v.material_id) || [];
        console.log(`Encontrados ${materiaisVinculados.length} materiais já vinculados à etapa ${etapaId}`);
      }
    }
    
    // Processar cada material do orçamento
    for (const item of itens) {
      try {
        // Normalizar nome do material
        const nomeNormalizado = normalizarNome(item.descricao);
        if (!nomeNormalizado) {
          console.warn(`Ignorando item sem descrição: ${JSON.stringify(item)}`);
          continue;
        }
        
        console.log(`Processando material: "${item.descricao}" (${item.quantidade} ${item.unidade}, valor: ${item.valor_unitario})`);
        console.log(`Nome normalizado: "${nomeNormalizado}"`);
        
        // Verificar materiais existentes - primeiro busca exata, depois por similaridade
        let materialExistente = materiaisNormalizados.find(m => m.nome_normalizado === nomeNormalizado);
        
        // Se não encontrou correspondência exata, procurar por similaridade (limiar de 80%)
        if (!materialExistente) {
          materialExistente = materiaisNormalizados.find(m => 
            calcularSimilaridade(m.nome_normalizado, nomeNormalizado) > 0.8
          );
          
          if (materialExistente) {
            console.log(`Material similar encontrado: "${materialExistente.nome}" (similaridade > 80%)`);
          }
        }
          
        let materialId;
        
        // Se o material já existe, apenas atualizar o preço
        if (materialExistente) {
          materialId = materialExistente.id;
          console.log(`Material existente encontrado (ID: ${materialId}): ${materialExistente.nome}`);
          
          // Atualizar apenas o preço unitário e garantir que tenha o usuário_id correto
          const { data: updateResult, error: updateError } = await supabase
            .from('materiais')
            .update({
              preco_unitario: item.valor_unitario,
              usuario_id: userId  // Garantir que o ID do usuário esteja atualizado
            })
            .eq('id', materialId)
            .select()
            .single();
            
          if (updateError) {
            console.error('Erro ao atualizar material:', updateError);
            throw updateError;
          }
          
          console.log(`Material atualizado com sucesso (ID: ${materialId})`);
          
          resultados.push({
            ...updateResult,
            status: 'atualizado'
          });
        } 
        // Se o material não existe, criar sem categoria
        else {
          const novoMaterial = {
            nome: item.descricao.trim(), // Usar nome original, mas sem espaços extras
            fornecedor_id: fornecedorId,
            unidade: item.unidade || 'un',
            preco_unitario: item.valor_unitario || 0,
            quantidade_estoque: 0,
            usuario_id: userId  // ID do usuário atual
          };
          
          console.log(`Inserindo novo material: "${item.descricao}"`);
          console.log('Dados do material:', JSON.stringify(novoMaterial));
          
          // Tentar inserir o material
          const { data, error } = await supabase
            .from('materiais')
            .insert([novoMaterial])
            .select()
            .single();
            
          if (error) {
            console.error('Erro ao inserir material:', error);
            throw error;
          }
          
          materialId = data.id;
          // Adicionar à lista de materiais existentes para futuras comparações
          materiaisNormalizados.push({
            ...data,
            nome_normalizado: nomeNormalizado
          });
          
          resultados.push({
            ...data,
            status: 'novo'
          });
          
          console.log(`Material criado com sucesso (ID: ${materialId}, usuário: ${userId})`);
        }
        
        // Vincular o material à etapa, se fornecidos etapaId e obraId
        if (etapaId && obraId && materialId) {
          // Verificar se o material já está vinculado a esta etapa
          if (materiaisVinculados.includes(materialId)) {
            console.log(`Material ${materialId} já está vinculado à etapa ${etapaId}, atualizando`);
            
            // Atualizar valores do material vinculado
            const { error: updateError } = await supabase
              .from('etapas_materiais')
              .update({
                quantidade: item.quantidade || 1,
                valor_total: (item.quantidade || 1) * (item.valor_unitario || 0),
                data_atualizacao: new Date().toISOString()
              })
              .eq('etapa_id', etapaId)
              .eq('material_id', materialId);
              
            if (updateError) {
              console.error(`Erro ao atualizar vínculo do material ${materialId} à etapa ${etapaId}:`, updateError);
              // Continuar mesmo com erro
            } else {
              console.log(`Vínculo de material atualizado com sucesso na etapa ${etapaId}`);
            }
          } else {
            console.log(`Vinculando material ${materialId} à etapa ${etapaId} da obra ${obraId}`);
            
            const etapaMaterial = {
              etapa_id: etapaId,
              obra_id: obraId,
              material_id: materialId,
              quantidade: item.quantidade || 1,
              valor_total: (item.quantidade || 1) * (item.valor_unitario || 0),
              data_compra: new Date().toISOString().split('T')[0],
              usuario_id: userId
            };
            
            const { error: etapaError } = await supabase
              .from('etapas_materiais')
              .insert([etapaMaterial]);
              
            if (etapaError) {
              console.error(`Erro ao vincular material ${materialId} à etapa ${etapaId}:`, etapaError);
              // Continuar mesmo com erro
            } else {
              console.log(`Material vinculado com sucesso à etapa ${etapaId}`);
              // Adicionar à lista de materiais vinculados para evitar duplicatas
              materiaisVinculados.push(materialId);
            }
          }
        }
      } catch (error) {
        console.error(`Erro ao processar item "${item.descricao}":`, error);
        erros.push({
          item,
          error: error.message
        });
      }
    }
    
    console.log(`Processamento concluído. Sucesso: ${resultados.length}, Erros: ${erros.length}`);
    
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