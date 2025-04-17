import { supabase } from './supabaseClient';
import { getObras, getObrasComOrcamentoExcedido } from './obrasService';
import { getFluxoCaixa } from './financeiroService';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs/dist/exceljs.min.js';

/**
 * Formata um valor numérico para moeda brasileira (R$)
 * @param {number} valor Valor a ser formatado
 * @returns {string} Valor formatado como moeda
 */
const formatarMoeda = (valor) => {
  if (valor === null || valor === undefined) return 'R$ 0,00';
  return `R$ ${parseFloat(valor).toFixed(2).replace('.', ',').replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
};

/**
 * Formata uma data no formato brasileiro (DD/MM/YYYY)
 * @param {Date|string} data Data a ser formatada
 * @returns {string} Data formatada
 */
const formatarData = (data) => {
  if (!data) return '';
  const dataObj = data instanceof Date ? data : new Date(data);
  return dataObj.toLocaleDateString('pt-BR');
};

/**
 * Gera relatório de obras
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.dataInicio Data de início (YYYY-MM-DD)
 * @param {string} params.dataFim Data de fim (YYYY-MM-DD)
 * @param {string} params.obraId ID da obra (opcional)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do arquivo gerado
 */
export const gerarRelatorioObras = async (params) => {
  try {
    const { dataInicio, dataFim, obraId, formato } = params;
    
    // Buscar dados das obras
    let { data: obras, error } = await getObras();
    
    if (error) throw error;
    
    // Filtrar por obra específica se informado
    if (obraId) {
      obras = obras.filter(obra => obra.id === obraId);
    }
    
    // Para cada obra, buscar as despesas associadas
    for (let i = 0; i < obras.length; i++) {
      const { data: despesas, error: despesasError } = await supabase
        .from('despesas')
        .select('*')
        .eq('obra_id', obras[i].id)
        .gte('data', dataInicio || '1900-01-01')
        .lte('data', dataFim || '2100-12-31');
      
      if (despesasError) throw despesasError;
      
      // Calcular total de despesas
      const totalDespesas = despesas.reduce((total, despesa) => total + (parseFloat(despesa.valor) || 0), 0);
      
      // Adicionar informações ao objeto de obra
      obras[i].totalDespesas = totalDespesas;
      obras[i].orcamentoRestante = (obras[i].orcamento || 0) - totalDespesas;
      obras[i].statusOrcamento = totalDespesas > (obras[i].orcamento || 0) ? 'Excedido' : 'Dentro do orçamento';
    }
    
    // Gerar arquivo no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfObras(obras, dataInicio, dataFim);
      case 'excel':
        return gerarExcelObras(obras, dataInicio, dataFim);
      case 'csv':
        return gerarCsvObras(obras, dataInicio, dataFim);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório de obras:', error);
    throw error;
  }
};

/**
 * Gera relatório financeiro
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.dataInicio Data de início (YYYY-MM-DD)
 * @param {string} params.dataFim Data de fim (YYYY-MM-DD)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do arquivo gerado
 */
export const gerarRelatorioFinanceiro = async (params) => {
  try {
    const { dataInicio, dataFim, formato } = params;
    
    let fluxoCaixa = [];
    let despesasPorCategoria = [];
    
    try {
      // Buscar fluxo de caixa
      const fluxoResult = await getFluxoCaixa(dataInicio || '1900-01-01', dataFim || '2100-12-31');
      if (!fluxoResult.error) {
        fluxoCaixa = fluxoResult.data || [];
      }
    } catch (error) {
      console.warn('Erro ao buscar fluxo de caixa:', error);
      // Em caso de erro, retornar array vazio em vez de dados simulados
      fluxoCaixa = [];
    }
    
    try {
      // Buscar despesas por categoria
      const { data, error } = await supabase
        .from('despesas')
        .select('*')
        .gte('data', dataInicio || '1900-01-01')
        .lte('data', dataFim || '2100-12-31');
      
      if (!error) {
        despesasPorCategoria = data || [];
      }
    } catch (error) {
      console.warn('Erro ao buscar despesas:', error);
      // Em caso de erro, retornar array vazio em vez de categorias simuladas
      despesasPorCategoria = [];
    }
    
    // Agrupar despesas por categoria
    const categorias = {};
    
    // Se temos despesas reais
    if (despesasPorCategoria.length > 0 && despesasPorCategoria[0].categoria) {
      despesasPorCategoria.forEach(despesa => {
        const categoria = despesa.categoria || 'Sem categoria';
        if (!categorias[categoria]) {
          categorias[categoria] = 0;
        }
        categorias[categoria] += parseFloat(despesa.valor) || 0;
      });
    } else {
      // Em vez de usar categorias simuladas, deixar objeto vazio
      // (Nenhuma categoria será mostrada, indicando dados insuficientes)
    }
    
    const dadosCategoria = Object.entries(categorias).map(([categoria, valor]) => ({
      categoria,
      valor
    }));
    
    // Calcular totais
    const totalEntradas = fluxoCaixa.reduce((total, dia) => total + (dia.entradas || 0), 0);
    const totalSaidas = fluxoCaixa.reduce((total, dia) => total + (dia.saidas || 0), 0);
    const saldoFinal = totalEntradas - totalSaidas;
    
    const dados = {
      fluxoCaixa,
      categorias: dadosCategoria,
      totais: {
        entradas: totalEntradas,
        saidas: totalSaidas,
        saldo: saldoFinal
      }
    };
    
    // Gerar arquivo no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfFinanceiro(dados, dataInicio, dataFim);
      case 'excel':
        return gerarExcelFinanceiro(dados, dataInicio, dataFim);
      case 'csv':
        return gerarCsvFinanceiro(dados, dataInicio, dataFim);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório financeiro:', error);
    throw error;
  }
};

/**
 * Gera relatório de materiais
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.dataInicio Data de início (YYYY-MM-DD)
 * @param {string} params.dataFim Data de fim (YYYY-MM-DD)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do arquivo gerado
 */
export const gerarRelatorioMateriais = async (params) => {
  try {
    const { dataInicio, dataFim, formato } = params;
    
    // Buscar materiais
    const { data: materiais, error } = await supabase
      .from('materiais')
      .select('*')
      .order('nome');
    
    if (error) throw error;
    
    if (!materiais || materiais.length === 0) {
      throw new Error('Nenhum material cadastrado no sistema.');
    }
    
    // Verificar se a tabela requisicoes_materiais existe
    let requisicoes = [];
    let tabelaReqExiste = false;
    
    const { error: checkTableError } = await supabase
      .from('requisicoes_materiais')
      .select('count', { count: 'exact', head: true })
      .limit(1);
    
    if (!checkTableError) {
      tabelaReqExiste = true;
      // Buscar requisições de materiais no período se a tabela existir
      const { data: requisicoesData, error: erroRequisicoes } = await supabase
        .from('requisicoes_materiais')
        .select('*')
        .gte('data', dataInicio || '1900-01-01')
        .lte('data', dataFim || '2100-12-31');
      
      if (!erroRequisicoes) {
        requisicoes = requisicoesData || [];
      }
    }
    
    // Calcular estatísticas por material (apenas com dados reais)
    for (let i = 0; i < materiais.length; i++) {
      // Se temos requisições reais e a tabela existe
      if (requisicoes.length > 0 && tabelaReqExiste) {
        const requisicoesMaterial = requisicoes.filter(r => r.material_id === materiais[i].id);
        
        materiais[i].totalRequisicoes = requisicoesMaterial.length;
        materiais[i].quantidadeTotal = requisicoesMaterial.reduce((total, req) => total + (parseFloat(req.quantidade) || 0), 0);
        materiais[i].valorTotal = requisicoesMaterial.reduce((total, req) => total + (parseFloat(req.valor_unitario || materiais[i].preco_unitario) * parseFloat(req.quantidade) || 0), 0);
      } else {
        // Sem dados simulados, usar valores zero
        materiais[i].totalRequisicoes = 0;
        materiais[i].quantidadeTotal = 0;
        materiais[i].valorTotal = 0;
      }
    }
    
    // Gerar arquivo no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfMateriais(materiais, dataInicio, dataFim, tabelaReqExiste);
      case 'excel':
        return gerarExcelMateriais(materiais, dataInicio, dataFim, tabelaReqExiste);
      case 'csv':
        return gerarCsvMateriais(materiais, dataInicio, dataFim, tabelaReqExiste);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório de materiais:', error);
    throw error;
  }
};

/**
 * Gera relatório de desempenho
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.dataInicio Data de início (YYYY-MM-DD)
 * @param {string} params.dataFim Data de fim (YYYY-MM-DD)
 * @param {string} params.obraId ID da obra (opcional)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do arquivo gerado
 */
export const gerarRelatorioDesempenho = async (params) => {
  try {
    const { dataInicio, dataFim, obraId, formato } = params;
    
    // Buscar obras
    let { data: obras, error } = await getObras();
    
    if (error) throw error;
    
    // Filtrar por obra específica se informado
    if (obraId) {
      obras = obras.filter(obra => obra.id === obraId);
    }
    
    // Para cada obra, calcular métricas de desempenho
    for (let i = 0; i < obras.length; i++) {
      // Verificar se a tabela etapas existe
      const { error: checkTableError } = await supabase
        .from('etapas')
        .select('count', { count: 'exact', head: true })
        .limit(1);
      
      let etapas = [];
      
      if (!checkTableError) {
        // Buscar etapas da obra se a tabela existir
        const { data: etapasData, error: erroEtapas } = await supabase
          .from('etapas')
          .select('*')
          .eq('obra_id', obras[i].id)
          .order('data_inicio');
        
        if (!erroEtapas) {
          etapas = etapasData || [];
        }
      }
      
      // Calcular métricas apenas com dados reais
      const etapasConcluidas = etapas.filter(etapa => etapa.status === 'concluida').length;
      const totalEtapas = etapas.length;
      
      // Se não houver etapas, usar o campo progresso da obra ou zero
      const percentualConcluido = totalEtapas > 0 
        ? (etapasConcluidas / totalEtapas) * 100 
        : (obras[i].progresso || 0);
      
      // Calcular atraso médio (em dias)
      const etapasAtrasadas = etapas.filter(etapa => {
        if (etapa.data_fim_real && etapa.data_fim_prevista) {
          return new Date(etapa.data_fim_real) > new Date(etapa.data_fim_prevista);
        }
        return false;
      });
      
      let atrasoMedioDias = 0;
      if (etapasAtrasadas.length > 0) {
        const totalDiasAtraso = etapasAtrasadas.reduce((total, etapa) => {
          const dataFimReal = new Date(etapa.data_fim_real);
          const dataFimPrevista = new Date(etapa.data_fim_prevista);
          const diffTime = Math.abs(dataFimReal - dataFimPrevista);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          return total + diffDays;
        }, 0);
        
        atrasoMedioDias = totalDiasAtraso / etapasAtrasadas.length;
      }
      
      // Adicionar métricas ao objeto de obra
      obras[i].totalEtapas = totalEtapas;
      obras[i].etapasConcluidas = etapasConcluidas;
      obras[i].percentualConcluido = percentualConcluido;
      obras[i].etapasAtrasadas = etapasAtrasadas.length;
      obras[i].atrasoMedioDias = atrasoMedioDias;
    }
    
    // Gerar arquivo no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfDesempenho(obras, dataInicio, dataFim);
      case 'excel':
        return gerarExcelDesempenho(obras, dataInicio, dataFim);
      case 'csv':
        return gerarCsvDesempenho(obras, dataInicio, dataFim);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório de desempenho:', error);
    throw error;
  }
};

/**
 * Verifica se uma das tabelas de movimentação de materiais existe no banco de dados.
 * Tenta verificar ambos os nomes possíveis de tabela: movimentacao_materiais e movimentacoes_materiais.
 * @returns {Promise<Object>} Promise com o nome da tabela encontrada e um flag indicando se foi encontrada
 */
const verificarTabelaMovimentacoes = async () => {
  // Tentar a tabela no singular primeiro (movimentacao_materiais)
  const { error: errorSingular } = await supabase
    .from('movimentacao_materiais')
    .select('count', { count: 'exact', head: true })
    .limit(1);
    
  // Se não houve erro, a tabela no singular existe
  if (!errorSingular || !errorSingular.message || !errorSingular.message.includes('does not exist')) {
    return {
      tableExists: true,
      tableName: 'movimentacao_materiais'
    };
  }
  
  // Tentar a tabela no plural (movimentacoes_materiais)
  const { error: errorPlural } = await supabase
    .from('movimentacoes_materiais')
    .select('count', { count: 'exact', head: true })
    .limit(1);
    
  // Se não houve erro, a tabela no plural existe
  if (!errorPlural || !errorPlural.message || !errorPlural.message.includes('does not exist')) {
    return {
      tableExists: true,
      tableName: 'movimentacoes_materiais'
    };
  }
  
  // Nenhuma das tabelas existe
  return {
    tableExists: false,
    tableName: null,
    error: 'Nenhuma tabela de movimentações de materiais existe no banco de dados'
  };
};

/**
 * Gera relatório de movimentações de materiais
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.dataInicio Data de início do período
 * @param {string} params.dataFim Data de fim do período
 * @param {string} params.obraId ID da obra para filtrar (opcional)
 * @param {string} params.categoriaId ID da categoria para filtrar (opcional)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do relatório gerado
 */
export const gerarRelatorioMovimentacoesMateriaisV1 = async (params) => {
  try {
    const { dataInicio, dataFim, obraId, categoriaId, formato = 'pdf' } = params;
    
    // Verificar se alguma tabela de movimentações existe
    const { tableExists, tableName, error: tableError } = await verificarTabelaMovimentacoes();
    
    if (!tableExists) {
      throw new Error('A tabela de movimentações de materiais não existe no banco de dados. É necessário criá-la para gerar este relatório.');
    }

    // Iniciar a consulta básica com o nome da tabela encontrada
    let query = supabase
      .from(tableName)
      .select(`
        id,
        material_id,
        obra_id,
        data,
        quantidade,
        tipo,
        valor_unitario,
        responsavel,
        observacao
      `)
      .order('data', { ascending: false });
    
    // Aplicar filtros
    if (dataInicio) {
      query = query.gte('data', dataInicio);
    }
    
    if (dataFim) {
      query = query.lte('data', dataFim);
    }
    
    if (obraId) {
      query = query.eq('obra_id', obraId);
    }
    
    // Executar consulta
    const { data: movimentacoes, error } = await query;
    
    if (error) throw error;
    
    // Se não houver movimentações, retornar relatório vazio
    if (!movimentacoes || movimentacoes.length === 0) {
      const dadosVazios = {
        movimentacoes: [],
        resumo: {
          totalEntradas: 0,
          totalSaidas: 0,
          totalMovimentacoes: 0,
          saldoFinal: 0
        },
        resumoPorMaterial: []
      };
      
      switch (formato.toLowerCase()) {
        case 'pdf':
          return gerarPdfMovimentacoesMateriaisV1(dadosVazios, dataInicio, dataFim);
        case 'excel':
          return gerarExcelMovimentacoesMateriaisV1(dadosVazios, dataInicio, dataFim);
        case 'csv':
          return gerarCsvMovimentacoesMateriaisV1(dadosVazios, dataInicio, dataFim);
        default:
          throw new Error('Formato de relatório inválido');
      }
    }
    
    // Buscar materiais, obras e categorias relacionados
    const { data: materiais } = await supabase.from('materiais').select('*');
    const { data: obras } = await supabase.from('obras').select('id, nome');
    const { data: categoriasMateriais } = await supabase.from('categorias_materiais').select('*');
    
    // Processar dados para o relatório
    const dadosProcessados = movimentacoes.map(mov => {
      // Encontrar material relacionado
      const material = materiais ? materiais.find(m => m.id === mov.material_id) : null;
      
      // Encontrar obra relacionada
      const obra = obras ? obras.find(o => o.id === mov.obra_id) : null;
      
      // Encontrar categoria do material
      let categoria = 'Sem categoria';
      if (material && material.categoria_id && categoriasMateriais) {
        const catObj = categoriasMateriais.find(c => c.id === material.categoria_id);
        if (catObj) categoria = catObj.nome;
      }
      
      // Filtrar por categoria se especificado
      if (categoriaId && material && material.categoria_id !== categoriaId) {
        return null; // Será filtrado posteriormente
      }
      
      const valorUnitario = mov.valor_unitario || (material ? material.preco_unitario : 0);
      const valorTotal = (mov.quantidade || 0) * valorUnitario;
      
      return {
        id: mov.id,
        data: formatarData(mov.data),
        tipo: mov.tipo,
        material: material ? material.nome : 'Material não identificado',
        quantidade: mov.quantidade || 0,
        unidade: material ? material.unidade : 'un',
        valor_unitario: valorUnitario,
        valor_total: valorTotal.toFixed(2),
        obra: obra ? obra.nome : 'Obra não identificada',
        categoria: categoria,
        responsavel: mov.responsavel || 'Não informado',
        observacao: mov.observacao || ''
      };
    }).filter(item => item !== null); // Remover itens filtrados
    
    // Calcular totais
    const totalEntradas = dadosProcessados
      .filter(mov => mov.tipo === 'entrada')
      .reduce((sum, mov) => sum + parseFloat(mov.valor_total), 0);
      
    const totalSaidas = dadosProcessados
      .filter(mov => mov.tipo === 'saida')
      .reduce((sum, mov) => sum + parseFloat(mov.valor_total), 0);
    
    const totalMovimentacoes = dadosProcessados.length;
    const saldoFinal = totalEntradas - totalSaidas;
    
    // Agrupar por material
    const porMaterial = {};
    dadosProcessados.forEach(mov => {
      if (!porMaterial[mov.material]) {
        porMaterial[mov.material] = {
          material: mov.material,
          entradas: 0,
          saidas: 0,
          saldo: 0
        };
      }
      
      if (mov.tipo === 'entrada') {
        porMaterial[mov.material].entradas += parseFloat(mov.valor_total);
      } else if (mov.tipo === 'saida') {
        porMaterial[mov.material].saidas += parseFloat(mov.valor_total);
      }
      
      porMaterial[mov.material].saldo = 
        porMaterial[mov.material].entradas - porMaterial[mov.material].saidas;
    });
    
    const resumoPorMaterial = Object.values(porMaterial);
    
    const dados = {
      movimentacoes: dadosProcessados,
      resumo: {
        totalEntradas,
        totalSaidas,
        totalMovimentacoes,
        saldoFinal
      },
      resumoPorMaterial
    };
    
    // Gerar relatório no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfMovimentacoesMateriaisV1(dados, dataInicio, dataFim);
      case 'excel':
        return gerarExcelMovimentacoesMateriaisV1(dados, dataInicio, dataFim);
      case 'csv':
        return gerarCsvMovimentacoesMateriaisV1(dados, dataInicio, dataFim);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório de movimentações de materiais:', error);
    throw error;
  }
};

/**
 * Gera PDF de movimentações de materiais
 * @param {Object} dados Dados das movimentações
 * @param {string} dataInicio Data de início
 * @param {string} dataFim Data de fim
 * @returns {Promise<Blob>} Promise com o blob do PDF
 */
const gerarPdfMovimentacoesMateriaisV1 = async (dados, dataInicio, dataFim) => {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Movimentações de Materiais', 14, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 14, 30);
    
    // Resumo
    doc.setFontSize(14);
    doc.text('Resumo', 14, 40);
    
    const resumoData = [
      ['Total de Movimentações', dados.resumo.totalMovimentacoes.toString()],
      ['Total de Entradas', `R$ ${dados.resumo.totalEntradas.toFixed(2)}`],
      ['Total de Saídas', `R$ ${dados.resumo.totalSaidas.toFixed(2)}`],
      ['Saldo Final', `R$ ${dados.resumo.saldoFinal.toFixed(2)}`]
    ];
    
    autoTable(doc, {
      startY: 45,
      head: [['Indicador', 'Valor']],
      body: resumoData,
      theme: 'striped',
      headStyles: { fillColor: [66, 139, 202] }
    });
    
    // Resumo por Material
    doc.text('Resumo por Material', 14, doc.lastAutoTable.finalY + 10);
    
    // Verificar se há dados de resumo por material
    if (dados.resumoPorMaterial && dados.resumoPorMaterial.length > 0) {
      const resumoPorMaterialData = dados.resumoPorMaterial.map(item => [
        item.material,
        `R$ ${item.entradas}`,
        `R$ ${item.saidas}`,
        `R$ ${item.saldo}`
      ]);
      
      autoTable(doc, {
        startY: doc.lastAutoTable.finalY + 15,
        head: [['Material', 'Entradas', 'Saídas', 'Saldo']],
        body: resumoPorMaterialData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] }
      });
    } else {
      // Mostrar mensagem quando não houver dados
      doc.setFontSize(12);
      doc.text('Nenhuma movimentação de material encontrada no período.', 14, doc.lastAutoTable.finalY + 20);
    }
    
    // Se houver movimentações, adicionar página com detalhamento
    if (dados.movimentacoes && dados.movimentacoes.length > 0) {
      // Movimentações
      doc.addPage();
      doc.setFontSize(14);
      doc.text('Detalhamento das Movimentações', 14, 20);
      
      const movimentacoesData = dados.movimentacoes.map(mov => [
        mov.data,
        mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        mov.material,
        mov.quantidade + ' ' + mov.unidade,
        `R$ ${mov.valor_unitario}`,
        `R$ ${mov.valor_total}`,
        mov.obra
      ]);
      
      autoTable(doc, {
        startY: 25,
        head: [['Data', 'Tipo', 'Material', 'Qtd', 'Valor Unit.', 'Valor Total', 'Obra']],
        body: movimentacoesData,
        theme: 'striped',
        headStyles: { fillColor: [66, 139, 202] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 25 },
          3: { cellWidth: 20 },
          4: { cellWidth: 25 },
          5: { cellWidth: 25 }
        }
      });
    } else if (dados.movimentacoes.length === 0) {
      // Adicionar mensagem informativa quando não houver dados
      doc.setFontSize(12);
      doc.setTextColor(220, 53, 69);
      doc.text('Não foram encontradas movimentações de materiais no período selecionado.', 14, doc.lastAutoTable.finalY + 40);
      doc.text('Para visualizar movimentações, registre entradas e saídas de materiais no sistema.', 14, doc.lastAutoTable.finalY + 50);
      doc.setTextColor(0, 0, 0);
    }
    
    // Rodapé
    const totalPaginas = doc.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.text(`Relatório gerado em ${new Date().toLocaleString()}`, 14, 290);
      doc.text(`Página ${i} de ${totalPaginas}`, 180, 290);
    }
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF de movimentações:', error);
    // Retornar um blob vazio em caso de erro
    return new Blob(['Erro ao gerar relatório'], { type: 'text/plain' });
  }
};

/**
 * Gera Excel de movimentações de materiais
 * @param {Object} dados Dados das movimentações
 * @param {string} dataInicio Data de início
 * @param {string} dataFim Data de fim
 * @returns {Promise<Blob>} Promise com o blob do Excel
 */
const gerarExcelMovimentacoesMateriaisV1 = async (dados, dataInicio, dataFim) => {
  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar dados para o resumo
  const resumoData = [
    ['Relatório de Movimentações de Materiais'],
    [`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`],
    [''],
    ['Resumo'],
    ['Total de Entradas', dados.resumo.totalEntradas.toFixed(2)],
    ['Total de Saídas', dados.resumo.totalSaidas.toFixed(2)],
    ['Total de Movimentações', dados.resumo.totalMovimentacoes],
    ['Saldo Final', dados.resumo.saldoFinal.toFixed(2)]
  ];
  
  // Adicionar dados por material
  dados.resumoPorMaterial.forEach(item => {
    resumoData.push([
      item.material,
      item.entradas,
      item.saidas,
      item.saldo
    ]);
  });
  
  // Criar planilha de resumo
  const resumoWs = XLSX.utils.aoa_to_sheet(resumoData);
  XLSX.utils.book_append_sheet(wb, resumoWs, 'Resumo');
  
  // Planilha de Movimentações
  const movimentacoesData = [
    ['Detalhamento das Movimentações'],
    [],
    ['Data', 'Tipo', 'Material', 'Quantidade', 'Unidade', 'Valor Unitário', 'Valor Total', 'Obra', 'Categoria', 'Responsável', 'Observação']
  ];
  
  // Adicionar movimentações
  dados.movimentacoes.forEach(mov => {
    movimentacoesData.push([
      mov.data,
      mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      mov.material,
      mov.quantidade,
      mov.unidade,
      mov.valor_unitario,
      mov.valor_total,
      mov.obra,
      mov.categoria,
      mov.responsavel,
      mov.observacao
    ]);
  });
  
  // Criar planilha de movimentações
  const movimentacoesWs = XLSX.utils.aoa_to_sheet(movimentacoesData);
  XLSX.utils.book_append_sheet(wb, movimentacoesWs, 'Movimentações');
  
  // Gerar blob
  const wbout = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
};

/**
 * Gera CSV de movimentações de materiais
 * @param {Object} dados Dados das movimentações
 * @param {string} dataInicio Data de início
 * @param {string} dataFim Data de fim
 * @returns {Promise<Blob>} Promise com o blob do CSV
 */
const gerarCsvMovimentacoesMateriaisV1 = async (dados, dataInicio, dataFim) => {
  // Cabeçalho
  let csv = 'Data,Tipo,Material,Quantidade,Unidade,Valor Unitário,Valor Total,Obra,Categoria,Responsável,Observação\n';
  
  // Adicionar movimentações
  dados.movimentacoes.forEach(mov => {
    // Escapar campos que possam conter vírgulas
    const material = `"${mov.material.replace(/"/g, '""')}"`;
    const obra = `"${mov.obra.replace(/"/g, '""')}"`;
    const categoria = `"${mov.categoria.replace(/"/g, '""')}"`;
    const responsavel = `"${mov.responsavel.replace(/"/g, '""')}"`;
    const observacao = `"${(mov.observacao || '').replace(/"/g, '""')}"`;
    
    csv += `${mov.data},${mov.tipo === 'entrada' ? 'Entrada' : 'Saída'},${material},${mov.quantidade},${mov.unidade},${mov.valor_unitario},${mov.valor_total},${obra},${categoria},${responsavel},${observacao}\n`;
  });
  
  return new Blob([csv], { type: 'text/csv' });
};

// Funções auxiliares para gerar PDF
const gerarPdfObras = (obras, dataInicio, dataFim) => {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Obras', 14, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 14, 30);
    
    // Tabela
    const tableData = obras.map(obra => [
      obra.nome,
      obra.status,
      `${obra.progresso}%`,
      `R$ ${obra.orcamento?.toFixed(2) || 0}`,
      `R$ ${obra.totalDespesas?.toFixed(2) || 0}`,
      `R$ ${obra.orcamentoRestante?.toFixed(2) || 0}`,
      obra.statusOrcamento
    ]);
    
    autoTable(doc, {
      head: [['Nome', 'Status', 'Progresso', 'Orçamento', 'Despesas', 'Saldo', 'Status Orçamento']],
      body: tableData,
      startY: 40,
      theme: 'grid',
      headStyles: { fillColor: [40, 100, 160], textColor: 255 }
    });
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF de obras:', error);
    return new Blob(['Erro ao gerar relatório de obras'], { type: 'text/plain' });
  }
};

// Funções auxiliares para gerar Excel
const gerarExcelObras = (obras, dataInicio, dataFim) => {
  // Converter dados para formato planilha
  const tableData = obras.map(obra => ({
    Nome: obra.nome,
    Status: obra.status,
    Progresso: `${obra.progresso}%`,
    Orçamento: obra.orcamento || 0,
    Despesas: obra.totalDespesas || 0,
    Saldo: obra.orcamentoRestante || 0,
    'Status Orçamento': obra.statusOrcamento
  }));
  
  // Criar planilha
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(tableData);
  
  // Adicionar título
  XLSX.utils.sheet_add_aoa(ws, [
    [`Relatório de Obras - Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`]
  ], { origin: 'A1' });
  
  // Adicionar planilha ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório de Obras');
  
  // Converter para blob
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
  const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
  
  return blob;
};

// Funções auxiliares para formatos específicos
// Função auxiliar para converter string para ArrayBuffer (para Excel)
function s2ab(s) {
  const buf = new ArrayBuffer(s.length);
  const view = new Uint8Array(buf);
  for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xFF;
  return buf;
}

// Implementações adicionais para os outros relatórios
// Estas implementações seriam expandidas conforme necessário

const gerarCsvObras = (obras, dataInicio, dataFim) => {
  // Converter dados para CSV
  let csvContent = 'Nome,Status,Progresso,Orçamento,Despesas,Saldo,Status Orçamento\n';
  
  obras.forEach(obra => {
    csvContent += `${obra.nome},${obra.status},${obra.progresso}%,${obra.orcamento || 0},${obra.totalDespesas || 0},${obra.orcamentoRestante || 0},${obra.statusOrcamento}\n`;
  });
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  return blob;
};

// Implementações simplificadas para os outros formatos de relatório
// Estas seriam expandidas em uma implementação completa

const gerarPdfFinanceiro = (dados, dataInicio, dataFim) => {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório Financeiro', 14, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 14, 30);
    
    // Resumo financeiro
    doc.setFontSize(14);
    doc.text('Resumo Financeiro', 14, 45);
    
    // Tabela de resumo
    autoTable(doc, {
      head: [['Descrição', 'Valor (R$)']],
      body: [
        ['Total de Entradas', dados.totais.entradas.toFixed(2)],
        ['Total de Saídas', dados.totais.saidas.toFixed(2)],
        ['Saldo Final', dados.totais.saldo.toFixed(2)]
      ],
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [40, 167, 69], textColor: 255 },
      foot: [['', '']],
      footStyles: { fillColor: [255, 255, 255] }
    });
    
    // Verificar se doc.lastAutoTable está definido
    let categoriaStartY = 120; // Valor padrão se previous não existir
    
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      categoriaStartY = doc.lastAutoTable.finalY + 20;
    }
    
    // Despesas por categoria
    doc.setFontSize(14);
    doc.text('Despesas por Categoria', 14, categoriaStartY - 10);
    
    // Tabela de categorias
    const categoriaData = dados.categorias.map(cat => [
      cat.categoria,
      `R$ ${cat.valor.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      head: [['Categoria', 'Valor (R$)']],
      body: categoriaData,
      startY: categoriaStartY,
      theme: 'grid',
      headStyles: { fillColor: [40, 100, 160], textColor: 255 }
    });
    
    // Verificar se doc.lastAutoTable está definido para fluxo de caixa
    let fluxoStartY = 200; // Valor padrão se previous não existir
    
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      fluxoStartY = doc.lastAutoTable.finalY + 20;
    }
    
    // Fluxo de caixa diário (últimos 10 registros para não sobrecarregar)
    const ultimosRegistros = dados.fluxoCaixa.slice(-10);
    
    doc.setFontSize(14);
    doc.text('Fluxo de Caixa Diário (Últimos 10 registros)', 14, fluxoStartY - 10);
    
    const fluxoData = ultimosRegistros.map(dia => [
      dia.data,
      `R$ ${dia.entradas.toFixed(2)}`,
      `R$ ${dia.saidas.toFixed(2)}`,
      `R$ ${dia.saldo.toFixed(2)}`,
      `R$ ${dia.saldoAcumulado.toFixed(2)}`
    ]);
    
    autoTable(doc, {
      head: [['Data', 'Entradas', 'Saídas', 'Saldo do Dia', 'Saldo Acumulado']],
      body: fluxoData,
      startY: fluxoStartY,
      theme: 'grid',
      headStyles: { fillColor: [40, 100, 160], textColor: 255 }
    });
    
    // Adicionar rodapé
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Página ${i} de ${totalPaginas} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF financeiro:', error);
    return new Blob(['Erro ao gerar relatório financeiro'], { type: 'text/plain' });
  }
};

const gerarExcelFinanceiro = (dados, dataInicio, dataFim) => {
  try {
    // Converter dados para formato planilha
    const resumoData = [
      ['Descrição', 'Valor (R$)'],
      ['Total de Entradas', dados.totais.entradas.toFixed(2)],
      ['Total de Saídas', dados.totais.saidas.toFixed(2)],
      ['Saldo Final', dados.totais.saldo.toFixed(2)]
    ];
    
    const categoriasData = [
      ['Categoria', 'Valor (R$)']
    ];
    
    dados.categorias.forEach(cat => {
      categoriasData.push([cat.categoria, cat.valor.toFixed(2)]);
    });
    
    // Criar planilha
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
    XLSX.utils.book_append_sheet(wb, resumoSheet, 'Resumo');
    
    const categoriasSheet = XLSX.utils.aoa_to_sheet(categoriasData);
    XLSX.utils.book_append_sheet(wb, categoriasSheet, 'Categorias');
    
    // Adicionar informações do período
    XLSX.utils.sheet_add_aoa(resumoSheet, [
      [`Relatório Financeiro - Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`]
    ], { origin: 'A1' });
    
    // Converter para blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    
    return blob;
  } catch (error) {
    console.error('Erro ao gerar Excel financeiro:', error);
    throw new Error('Falha ao gerar relatório Excel. Por favor, tente novamente.');
  }
};

const gerarCsvFinanceiro = (dados, dataInicio, dataFim) => {
  try {
    // Cabeçalho para o CSV
    let csvContent = 'Resumo Financeiro\n';
    csvContent += 'Descrição,Valor (R$)\n';
    csvContent += `Total de Entradas,${dados.totais.entradas.toFixed(2)}\n`;
    csvContent += `Total de Saídas,${dados.totais.saidas.toFixed(2)}\n`;
    csvContent += `Saldo Final,${dados.totais.saldo.toFixed(2)}\n\n`;
    
    // Despesas por categoria
    csvContent += 'Despesas por Categoria\n';
    csvContent += 'Categoria,Valor (R$)\n';
    
    dados.categorias.forEach(cat => {
      csvContent += `${cat.categoria},${cat.valor.toFixed(2)}\n`;
    });
    
    // Fluxo de caixa diário
    csvContent += '\nFluxo de Caixa Diário\n';
    csvContent += 'Data,Entradas,Saídas,Saldo do Dia,Saldo Acumulado\n';
    
    dados.fluxoCaixa.forEach(dia => {
      csvContent += `${dia.data},${dia.entradas.toFixed(2)},${dia.saidas.toFixed(2)},${dia.saldo.toFixed(2)},${dia.saldoAcumulado.toFixed(2)}\n`;
    });
    
    // Adicionar informações do período
    csvContent += `\nPeríodo: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}\n`;
    csvContent += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  } catch (error) {
    console.error('Erro ao gerar CSV financeiro:', error);
    throw new Error('Falha ao gerar relatório CSV. Por favor, tente novamente.');
  }
};

const gerarPdfMateriais = (materiais, dataInicio, dataFim, tabelaReqExiste) => {
  try {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Materiais', 14, 20);
    
    // Período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 14, 30);
    
    // Estatísticas gerais
    doc.setFontSize(14);
    doc.text('Estatísticas de Materiais', 14, 45);
    
    // Calcular estatísticas gerais
    const totalMateriais = materiais.length;
    const totalRequisicoes = materiais.reduce((total, material) => total + (material.totalRequisicoes || 0), 0);
    const valorTotal = materiais.reduce((total, material) => total + (material.valorTotal || 0), 0);
    
    // Tabela de estatísticas
    autoTable(doc, {
      head: [['Métrica', 'Valor']],
      body: [
        ['Total de Materiais', totalMateriais],
        ['Total de Requisições', totalRequisicoes],
        ['Valor Total de Requisições', `R$ ${valorTotal.toFixed(2)}`]
      ],
      startY: 50,
      theme: 'grid',
      headStyles: { fillColor: [255, 140, 0], textColor: 255 },
      foot: [['', '']],
      footStyles: { fillColor: [255, 255, 255] }
    });
    
    // Verificar se doc.lastAutoTable está definido
    let materiaisStartY = 120;
    
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      materiaisStartY = doc.lastAutoTable.finalY + 20;
    }
    
    // Lista de materiais com mais requisições
    doc.setFontSize(14);
    doc.text('Materiais mais Requisitados', 14, materiaisStartY - 10);
    
    // Ordenar materiais por quantidade de requisições (decrescente)
    const materiaisOrdenados = [...materiais]
      .sort((a, b) => (b.totalRequisicoes || 0) - (a.totalRequisicoes || 0))
      .filter(m => m.totalRequisicoes > 0) // Mostrar apenas materiais com requisições
      .slice(0, 10); // Pegar os top 10
    
    if (materiaisOrdenados.length > 0) {
      const materiaisData = materiaisOrdenados.map(material => [
        material.nome,
        material.unidade || '-',
        material.totalRequisicoes || 0,
        material.quantidadeTotal ? material.quantidadeTotal.toFixed(2) : '0.00',
        `R$ ${material.valorTotal ? material.valorTotal.toFixed(2) : '0.00'}`
      ]);
      
      autoTable(doc, {
        head: [['Material', 'Unidade', 'Requisições', 'Quantidade', 'Valor Total']],
        body: materiaisData,
        startY: materiaisStartY,
        theme: 'grid',
        headStyles: { fillColor: [255, 140, 0], textColor: 255 }
      });
    } else {
      // Mensagem quando não houver materiais requisitados
      doc.setFontSize(12);
      if (!tabelaReqExiste) {
        doc.text('A tabela de requisições de materiais não existe no banco de dados.', 14, materiaisStartY + 10);
      } else {
        doc.text('Nenhuma requisição de material encontrada no período selecionado.', 14, materiaisStartY + 10);
      }
    }
    
    // Verificar se doc.lastAutoTable está definido
    let estoqueStartY = 200;
    
    if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
      estoqueStartY = doc.lastAutoTable.finalY + 20;
    }
    
    // Materiais com estoque baixo (exemplo)
    doc.setFontSize(14);
    doc.text('Materiais com Estoque Baixo', 14, estoqueStartY - 10);
    
    // Filtrar materiais com estoque abaixo do mínimo
    const materiaisBaixoEstoque = materiais.filter(material => 
      (material.estoque_atual || 0) < (material.estoque_minimo || 0) && 
      material.estoque_minimo > 0
    );
    
    if (materiaisBaixoEstoque.length > 0) {
      const estoqueBaixoData = materiaisBaixoEstoque.map(material => [
        material.nome,
        material.estoque_atual || 0,
        material.estoque_minimo || 0,
        (material.estoque_atual || 0) - (material.estoque_minimo || 0)
      ]);
      
      autoTable(doc, {
        head: [['Material', 'Estoque Atual', 'Estoque Mínimo', 'Déficit']],
        body: estoqueBaixoData,
        startY: estoqueStartY,
        theme: 'grid',
        headStyles: { fillColor: [220, 53, 69], textColor: 255 }
      });
    } else {
      doc.setFontSize(12);
      doc.text('Nenhum material com estoque abaixo do mínimo.', 14, estoqueStartY + 10);
    }
    
    // Adicionar rodapé com informações sobre dados reais
    if (totalRequisicoes === 0) {
      doc.setFontSize(10);
      doc.setTextColor(220, 53, 69);
      
      if (!tabelaReqExiste) {
        doc.text('Observação: A tabela de requisições de materiais não foi encontrada no banco de dados.', 14, 270);
        doc.text('Para ter dados completos, é necessário criar a tabela de requisições no sistema.', 14, 280);
      } else {
        doc.text('Observação: Este relatório não possui dados de requisições para o período selecionado.', 14, 270);
        doc.text('Para ter dados completos, registre requisições de materiais no sistema.', 14, 280);
      }
      
      doc.setTextColor(0, 0, 0);
    }
    
    // Adicionar rodapé
    const totalPaginas = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPaginas; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Página ${i} de ${totalPaginas} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
        doc.internal.pageSize.getWidth() / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      );
    }
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF de materiais:', error);
    return new Blob(['Erro ao gerar relatório de materiais'], { type: 'text/plain' });
  }
};

const gerarExcelMateriais = (materiais, dataInicio, dataFim, tabelaReqExiste) => {
  try {
    // Preparar dados para estatísticas
    const totalMateriais = materiais.length;
    const totalRequisicoes = materiais.reduce((total, material) => total + (material.totalRequisicoes || 0), 0);
    const valorTotal = materiais.reduce((total, material) => total + (material.valorTotal || 0), 0);
    
    const estatisticasData = [
      ['Métrica', 'Valor'],
      ['Total de Materiais', totalMateriais],
      ['Total de Requisições', totalRequisicoes],
      ['Valor Total de Requisições', `${valorTotal.toFixed(2)}`]
    ];
    
    // Preparar dados de materiais
    const materiaisData = [
      ['Material', 'Unidade', 'Requisições', 'Quantidade', 'Valor Total']
    ];
    
    materiais.forEach(material => {
      materiaisData.push([
        material.nome,
        material.unidade || '-',
        material.totalRequisicoes || 0,
        material.quantidadeTotal ? material.quantidadeTotal.toFixed(2) : '0.00',
        material.valorTotal ? material.valorTotal.toFixed(2) : '0.00'
      ]);
    });
    
    // Criar planilha
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    const estatisticasSheet = XLSX.utils.aoa_to_sheet(estatisticasData);
    XLSX.utils.book_append_sheet(wb, estatisticasSheet, 'Estatísticas');
    
    const materiaisSheet = XLSX.utils.aoa_to_sheet(materiaisData);
    XLSX.utils.book_append_sheet(wb, materiaisSheet, 'Materiais');
    
    // Adicionar informações do período
    XLSX.utils.sheet_add_aoa(estatisticasSheet, [
      [`Relatório de Materiais - Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`]
    ], { origin: 'A1' });
    
    // Converter para blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    
    return blob;
  } catch (error) {
    console.error('Erro ao gerar Excel de materiais:', error);
    throw new Error('Falha ao gerar relatório Excel. Por favor, tente novamente.');
  }
};

const gerarCsvMateriais = (materiais, dataInicio, dataFim, tabelaReqExiste) => {
  try {
    // Cabeçalho para o CSV
    let csvContent = 'Relatório de Materiais\n';
    csvContent += 'Material,Unidade,Requisições,Quantidade,Valor Total\n';
    
    // Adicionar dados de cada material
    materiais.forEach(material => {
      csvContent += `${material.nome},`;
      csvContent += `${material.unidade || '-'},`;
      csvContent += `${material.totalRequisicoes || 0},`;
      csvContent += `${material.quantidadeTotal ? material.quantidadeTotal.toFixed(2) : '0.00'},`;
      csvContent += `${material.valorTotal ? material.valorTotal.toFixed(2) : '0.00'}\n`;
    });
    
    // Adicionar informações estatísticas
    const totalMateriais = materiais.length;
    const totalRequisicoes = materiais.reduce((total, material) => total + (material.totalRequisicoes || 0), 0);
    const valorTotal = materiais.reduce((total, material) => total + (material.valorTotal || 0), 0);
    
    csvContent += '\nEstatísticas Gerais\n';
    csvContent += 'Métrica,Valor\n';
    csvContent += `Total de Materiais,${totalMateriais}\n`;
    csvContent += `Total de Requisições,${totalRequisicoes}\n`;
    csvContent += `Valor Total de Requisições,R$ ${valorTotal.toFixed(2)}\n`;
    
    // Adicionar informações do período
    csvContent += `\nPeríodo: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}\n`;
    csvContent += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  } catch (error) {
    console.error('Erro ao gerar CSV de materiais:', error);
    throw new Error('Falha ao gerar relatório CSV. Por favor, tente novamente.');
  }
};

const gerarPdfDesempenho = (obras, dataInicio, dataFim) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(18);
  doc.text('Relatório de Desempenho', 14, 20);
  
  // Período
  doc.setFontSize(12);
  doc.text(`Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`, 14, 30);
  
  // Estatísticas gerais
  doc.setFontSize(14);
  doc.text('Estatísticas de Desempenho', 14, 45);
  
  // Calcular estatísticas gerais
  const totalObras = obras.length;
  const obrasEmAndamento = obras.filter(obra => obra.status === 'em_andamento').length;
  const obrasConcluidas = obras.filter(obra => obra.status === 'concluida').length;
  const mediaConclusao = obras.reduce((total, obra) => total + (obra.percentualConcluido || 0), 0) / (totalObras || 1);
  const mediaAtraso = obras.reduce((total, obra) => total + (obra.atrasoMedioDias || 0), 0) / (totalObras || 1);
  
  // Tabela de estatísticas
  autoTable(doc, {
    head: [['Métrica', 'Valor']],
    body: [
      ['Total de Obras', totalObras],
      ['Obras em Andamento', obrasEmAndamento],
      ['Obras Concluídas', obrasConcluidas],
      ['Média de Conclusão', `${mediaConclusao.toFixed(2)}%`],
      ['Média de Atraso', `${mediaAtraso.toFixed(1)} dias`]
    ],
    startY: 50,
    theme: 'grid',
    headStyles: { fillColor: [111, 66, 193], textColor: 255 },
    foot: [['', '']],
    footStyles: { fillColor: [255, 255, 255] }
  });
  
  // Verificar se doc.lastAutoTable está definido
  let obrasStartY = 120;
  
  if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
    obrasStartY = doc.lastAutoTable.finalY + 20;
  }
  
  // Tabela de desempenho por obra
  doc.setFontSize(14);
  doc.text('Desempenho por Obra', 14, obrasStartY - 10);
  
  const obrasData = obras.map(obra => [
    obra.nome,
    obra.status || '-',
    `${obra.progresso || 0}%`,
    `${obra.percentualConcluido?.toFixed(2) || '0.00'}%`,
    obra.totalEtapas || 0,
    obra.etapasConcluidas || 0,
    obra.etapasAtrasadas || 0,
    obra.atrasoMedioDias?.toFixed(1) || '0.0'
  ]);
  
  autoTable(doc, {
    head: [
      ['Nome', 'Status', 'Progresso', 'Conclusão', 'Total Etapas', 'Concluídas', 'Atrasadas', 'Atraso Médio (dias)']
    ],
    body: obrasData,
    startY: obrasStartY,
    theme: 'grid',
    headStyles: { fillColor: [111, 66, 193], textColor: 255 },
    columnStyles: {
      0: { cellWidth: 30 },
      1: { cellWidth: 20 }
    },
    styles: { fontSize: 8 }
  });
  
  // Verificar se doc.lastAutoTable está definido
  let atrasadasStartY = 200;
  
  if (doc.lastAutoTable && doc.lastAutoTable.finalY) {
    atrasadasStartY = doc.lastAutoTable.finalY + 20;
  }
  
  // Obras com mais atrasos (top 5)
  doc.setFontSize(14);
  doc.text('Obras com Mais Atrasos', 14, atrasadasStartY - 10);
  
  // Ordenar obras por número de etapas atrasadas (decrescente)
  const obrasAtrasadas = [...obras]
    .filter(obra => (obra.etapasAtrasadas || 0) > 0)
    .sort((a, b) => (b.etapasAtrasadas || 0) - (a.etapasAtrasadas || 0))
    .slice(0, 5); // Pegar as top 5
  
  if (obrasAtrasadas.length > 0) {
    const atrasadasData = obrasAtrasadas.map(obra => [
      obra.nome,
      obra.status || '-',
      obra.totalEtapas || 0,
      obra.etapasAtrasadas || 0,
      obra.atrasoMedioDias?.toFixed(1) || '0.0',
      obra.etapasAtrasadas > 0 ? ((obra.etapasAtrasadas / obra.totalEtapas) * 100).toFixed(2) + '%' : '0%'
    ]);
    
    autoTable(doc, {
      head: [
        ['Nome', 'Status', 'Total Etapas', 'Etapas Atrasadas', 'Atraso Médio (dias)', '% Atrasada']
      ],
      body: atrasadasData,
      startY: atrasadasStartY,
      theme: 'grid',
      headStyles: { fillColor: [220, 53, 69], textColor: 255 }
    });
  } else {
    doc.setFontSize(12);
    doc.text('Nenhuma obra com etapas atrasadas.', 14, atrasadasStartY + 10);
  }
  
  // Adicionar rodapé
  const totalPaginas = doc.internal.getNumberOfPages();
  for (let i = 1; i <= totalPaginas; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(
      `Página ${i} de ${totalPaginas} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
      doc.internal.pageSize.getWidth() / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: 'center' }
    );
  }
  
  return doc.output('blob');
};

const gerarExcelDesempenho = (obras, dataInicio, dataFim) => {
  try {
    // Calcular estatísticas gerais
    const totalObras = obras.length;
    const obrasEmAndamento = obras.filter(obra => obra.status === 'em_andamento').length;
    const obrasConcluidas = obras.filter(obra => obra.status === 'concluida').length;
    const mediaConclusao = obras.reduce((total, obra) => total + (obra.percentualConcluido || 0), 0) / (totalObras || 1);
    const mediaAtraso = obras.reduce((total, obra) => total + (obra.atrasoMedioDias || 0), 0) / (totalObras || 1);
    
    // Preparar dados
    const estatisticasData = [
      ['Métrica', 'Valor'],
      ['Total de Obras', totalObras],
      ['Obras em Andamento', obrasEmAndamento],
      ['Obras Concluídas', obrasConcluidas],
      ['Média de Conclusão', `${mediaConclusao.toFixed(2)}%`],
      ['Média de Atraso', `${mediaAtraso.toFixed(1)} dias`]
    ];
    
    const obrasData = [
      ['Nome', 'Status', 'Progresso', 'Conclusão', 'Total Etapas', 'Concluídas', 'Atrasadas', 'Atraso Médio (dias)']
    ];
    
    obras.forEach(obra => {
      obrasData.push([
        obra.nome,
        obra.status || '-',
        `${obra.progresso || 0}%`,
        `${obra.percentualConcluido?.toFixed(2) || '0.00'}%`,
        obra.totalEtapas || 0,
        obra.etapasConcluidas || 0,
        obra.etapasAtrasadas || 0,
        obra.atrasoMedioDias?.toFixed(1) || '0.0'
      ]);
    });
    
    // Criar planilha
    const wb = XLSX.utils.book_new();
    
    // Adicionar planilhas
    const estatisticasSheet = XLSX.utils.aoa_to_sheet(estatisticasData);
    XLSX.utils.book_append_sheet(wb, estatisticasSheet, 'Estatísticas');
    
    const obrasSheet = XLSX.utils.aoa_to_sheet(obrasData);
    XLSX.utils.book_append_sheet(wb, obrasSheet, 'Obras');
    
    // Adicionar informações do período
    XLSX.utils.sheet_add_aoa(estatisticasSheet, [
      [`Relatório de Desempenho - Período: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}`]
    ], { origin: 'A1' });
    
    // Converter para blob
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'binary' });
    const blob = new Blob([s2ab(wbout)], { type: 'application/octet-stream' });
    
    return blob;
  } catch (error) {
    console.error('Erro ao gerar Excel de desempenho:', error);
    throw new Error('Falha ao gerar relatório Excel. Por favor, tente novamente.');
  }
};

const gerarCsvDesempenho = (obras, dataInicio, dataFim) => {
  try {
    // Cabeçalho para o CSV
    let csvContent = 'Nome,Status,Progresso,Conclusão,Total Etapas,Concluídas,Atrasadas,Atraso Médio (dias)\n';
    
    // Adicionar dados de cada obra
    obras.forEach(obra => {
      csvContent += `${obra.nome},`;
      csvContent += `${obra.status || '-'},`;
      csvContent += `${obra.progresso || 0}%,`;
      csvContent += `${obra.percentualConcluido?.toFixed(2) || '0.00'}%,`;
      csvContent += `${obra.totalEtapas || 0},`;
      csvContent += `${obra.etapasConcluidas || 0},`;
      csvContent += `${obra.etapasAtrasadas || 0},`;
      csvContent += `${obra.atrasoMedioDias?.toFixed(1) || '0.0'}\n`;
    });
    
    // Adicionar informações gerais no final
    csvContent += '\nEstatísticas Gerais\n';
    csvContent += 'Métrica,Valor\n';
    
    // Calcular estatísticas
    const totalObras = obras.length;
    const obrasEmAndamento = obras.filter(obra => obra.status === 'em_andamento').length;
    const obrasConcluidas = obras.filter(obra => obra.status === 'concluida').length;
    const mediaConclusao = obras.reduce((total, obra) => total + (obra.percentualConcluido || 0), 0) / (totalObras || 1);
    const mediaAtraso = obras.reduce((total, obra) => total + (obra.atrasoMedioDias || 0), 0) / (totalObras || 1);
    
    csvContent += `Total de Obras,${totalObras}\n`;
    csvContent += `Obras em Andamento,${obrasEmAndamento}\n`;
    csvContent += `Obras Concluídas,${obrasConcluidas}\n`;
    csvContent += `Média de Conclusão,${mediaConclusao.toFixed(2)}%\n`;
    csvContent += `Média de Atraso,${mediaAtraso.toFixed(1)} dias\n`;
    
    // Adicionar informações do período
    csvContent += `\nPeríodo: ${dataInicio || 'Início'} até ${dataFim || 'Hoje'}\n`;
    csvContent += `Gerado em: ${new Date().toLocaleString('pt-BR')}\n`;
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    return blob;
  } catch (error) {
    console.error('Erro ao gerar CSV de desempenho:', error);
    throw new Error('Falha ao gerar relatório CSV. Por favor, tente novamente.');
  }
};

/**
 * Gera relatório de materiais por obra
 * @param {Object} params Parâmetros do relatório
 * @param {string} params.obraId ID da obra (obrigatório)
 * @param {string} params.formato Formato do relatório (pdf, excel, csv)
 * @returns {Promise<Blob>} Promise com o blob do arquivo gerado
 */
const gerarRelatorioMateriaisPorObraAntigo = async (params) => {
  // Implementação antiga mantida como referência, renomeada para evitar conflito
  try {
    const { obraId, formato } = params;
    
    if (!obraId) {
      throw new Error('ID da obra é obrigatório para este relatório');
    }
    
    // Buscar obra
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .single();
    
    if (obraError) throw obraError;
    
    // Buscar movimentações de materiais da obra
    const { data: movimentacoes, error: movError } = await supabase
      .from('movimentacoes_materiais')
      .select(`
        *,
        material:materiais(id, nome, unidade, preco_unitario, categoria_id),
        categoria:categorias_materiais(id, nome)
      `)
      .eq('obra_id', obraId)
      .order('data', { ascending: false });
    
    if (movError) throw movError;
    
    // Agrupar por material
    const materiaisPorObra = {};
    
    movimentacoes.forEach(mov => {
      const materialId = mov.material?.id;
      
      if (!materialId) return;
      
      if (!materiaisPorObra[materialId]) {
        materiaisPorObra[materialId] = {
          id: materialId,
          nome: mov.material.nome,
          unidade: mov.material.unidade,
          preco_unitario: mov.material.preco_unitario,
          categoria: mov.categoria?.nome || 'Sem categoria',
          entrada: 0,
          saida: 0,
          saldo: 0,
          valor_total: 0
        };
      }
      
      const valor = parseFloat(mov.quantidade) || 0;
      
      if (mov.tipo === 'entrada') {
        materiaisPorObra[materialId].entrada += valor;
      } else if (mov.tipo === 'saida') {
        materiaisPorObra[materialId].saida += valor;
      }
    });
    
    // Calcular saldo e valor total
    const dadosProcessados = Object.values(materiaisPorObra).map(material => {
      material.saldo = material.entrada - material.saida;
      material.valor_total = material.saldo * material.preco_unitario;
      return material;
    });
    
    // Agrupar por categoria
    const categorias = {};
    dadosProcessados.forEach(material => {
      if (!categorias[material.categoria]) {
        categorias[material.categoria] = {
          categoria: material.categoria,
          quantidade_itens: 0,
          valor_total: 0
        };
      }
      
      categorias[material.categoria].quantidade_itens += 1;
      categorias[material.categoria].valor_total += material.valor_total;
    });
    
    const resumoPorCategoria = Object.values(categorias);
    
    // Calcular valor total geral
    const valorTotalGeral = dadosProcessados.reduce((total, material) => 
      total + material.valor_total, 0);
    
    const dados = {
      obra,
      materiais: dadosProcessados,
      categorias: resumoPorCategoria,
      total: {
        quantidade_materiais: dadosProcessados.length,
        valor_total: valorTotalGeral
      }
    };
    
    // Gerar arquivo no formato solicitado
    switch (formato.toLowerCase()) {
      case 'pdf':
        return gerarPdfMateriaisPorObra(dados);
      case 'excel':
        return gerarExcelMateriaisPorObra(dados);
      case 'csv':
        return gerarCsvMateriaisPorObra(dados);
      default:
        throw new Error('Formato de relatório inválido');
    }
  } catch (error) {
    console.error('Erro ao gerar relatório de materiais por obra:', error);
    throw error;
  }
};

/**
 * Gera um PDF para o relatório de materiais por obra
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do PDF
 */
const gerarPdfMateriaisPorObra = async (dados) => {
  try {
    const { obra, materiais, categorias, total } = dados;
    
    const doc = new jsPDF();
    
    // Configurações iniciais
    doc.setFontSize(16);
    doc.text('Relatório de Materiais por Obra', 105, 15, { align: 'center' });
    
    // Informações da obra
    doc.setFontSize(12);
    doc.text(`Obra: ${obra.nome}`, 14, 30);
    doc.text(`Endereço: ${obra.endereco || 'N/A'}`, 14, 40);
    doc.text(`Data do relatório: ${formatarData(new Date())}`, 14, 50);
    
    // Resumo por categoria
    doc.setFontSize(14);
    doc.text('Resumo por Categoria', 14, 70);
    
    const headersCategorias = ['Categoria', 'Qtd. Itens', 'Valor Total (R$)'];
    const rowsCategorias = categorias.map(cat => [
      cat.categoria,
      cat.quantidade_itens.toString(),
      formatarMoeda(cat.valor_total)
    ]);
    
    // Adiciona tabela de categorias
    autoTable(doc, {
      startY: 75,
      head: [headersCategorias],
      body: rowsCategorias,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244], textColor: 255 }
    });
    
    // Total geral
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total de materiais: ${total.quantidade_materiais}`, 14, finalY);
    doc.text(`Valor total na obra: ${formatarMoeda(total.valor_total)}`, 14, finalY + 10);
    
    // Lista de materiais
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Lista de Materiais', 14, 15);
    
    const headersMateriais = ['Material', 'Unidade', 'Entradas', 'Saídas', 'Saldo', 'Valor Unit.', 'Valor Total'];
    const rowsMateriais = materiais.map(mat => [
      mat.nome,
      mat.unidade,
      mat.entrada.toString(),
      mat.saida.toString(),
      mat.saldo.toString(),
      formatarMoeda(mat.preco_unitario),
      formatarMoeda(mat.valor_total)
    ]);
    
    // Adiciona tabela de materiais
    autoTable(doc, {
      startY: 20,
      head: [headersMateriais],
      body: rowsMateriais,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244], textColor: 255 }
    });
    
    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
      doc.text('GestObra - Sistema de Gestão de Obras', 105, 292, { align: 'center' });
    }
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    // Retornar um blob vazio em caso de erro
    return new Blob(['Erro ao gerar relatório de materiais por obra'], { type: 'text/plain' });
  }
};

/**
 * Gera um arquivo Excel para o relatório de materiais por obra
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do Excel
 */
const gerarExcelMateriaisPorObra = async (dados) => {
  return new Promise((resolve, reject) => {
    try {
      const { obra, materiais, categorias } = dados;
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GestObra';
      workbook.lastModifiedBy = 'GestObra';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Aba de resumo
      const resumoSheet = workbook.addWorksheet('Resumo');
      
      // Título
      resumoSheet.mergeCells('A1:C1');
      const titleCell = resumoSheet.getCell('A1');
      titleCell.value = 'Relatório de Materiais por Obra';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };
      
      // Informações da obra
      resumoSheet.getCell('A3').value = 'Obra:';
      resumoSheet.getCell('B3').value = obra.nome;
      resumoSheet.getCell('A4').value = 'Endereço:';
      resumoSheet.getCell('B4').value = obra.endereco || 'N/A';
      resumoSheet.getCell('A5').value = 'Data do relatório:';
      resumoSheet.getCell('B5').value = formatarData(new Date());
      
      // Resumo por categoria
      resumoSheet.getCell('A7').value = 'Resumo por Categoria';
      resumoSheet.getCell('A7').font = { bold: true, size: 14 };
      
      // Cabeçalhos
      resumoSheet.getCell('A9').value = 'Categoria';
      resumoSheet.getCell('B9').value = 'Quantidade de Itens';
      resumoSheet.getCell('C9').value = 'Valor Total (R$)';
      
      // Estilo dos cabeçalhos
      ['A9', 'B9', 'C9'].forEach(cell => {
        resumoSheet.getCell(cell).font = { bold: true };
        resumoSheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4285F4' }
        };
        resumoSheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFF' } };
      });
      
      // Dados das categorias
      categorias.forEach((categoria, index) => {
        const row = index + 10;
        resumoSheet.getCell(`A${row}`).value = categoria.categoria;
        resumoSheet.getCell(`B${row}`).value = categoria.quantidade_itens;
        resumoSheet.getCell(`C${row}`).value = categoria.valor_total;
        resumoSheet.getCell(`C${row}`).numFmt = '"R$"#,##0.00';
      });
      
      // Aba de materiais
      const materiaisSheet = workbook.addWorksheet('Materiais');
      
      // Título
      materiaisSheet.mergeCells('A1:G1');
      const materiaisTitleCell = materiaisSheet.getCell('A1');
      materiaisTitleCell.value = 'Lista de Materiais';
      materiaisTitleCell.font = { bold: true, size: 16 };
      materiaisTitleCell.alignment = { horizontal: 'center' };
      
      // Cabeçalhos
      materiaisSheet.getCell('A3').value = 'Material';
      materiaisSheet.getCell('B3').value = 'Unidade';
      materiaisSheet.getCell('C3').value = 'Entradas';
      materiaisSheet.getCell('D3').value = 'Saídas';
      materiaisSheet.getCell('E3').value = 'Saldo';
      materiaisSheet.getCell('F3').value = 'Valor Unitário';
      materiaisSheet.getCell('G3').value = 'Valor Total';
      
      // Estilo dos cabeçalhos
      ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(cell => {
        materiaisSheet.getCell(cell).font = { bold: true };
        materiaisSheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4285F4' }
        };
        materiaisSheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFF' } };
      });
      
      // Dados dos materiais
      materiais.forEach((material, index) => {
        const row = index + 4;
        materiaisSheet.getCell(`A${row}`).value = material.nome;
        materiaisSheet.getCell(`B${row}`).value = material.unidade;
        materiaisSheet.getCell(`C${row}`).value = material.entrada;
        materiaisSheet.getCell(`D${row}`).value = material.saida;
        materiaisSheet.getCell(`E${row}`).value = material.saldo;
        materiaisSheet.getCell(`F${row}`).value = material.preco_unitario;
        materiaisSheet.getCell(`G${row}`).value = material.valor_total;
        
        // Formatação monetária
        materiaisSheet.getCell(`F${row}`).numFmt = '"R$"#,##0.00';
        materiaisSheet.getCell(`G${row}`).numFmt = '"R$"#,##0.00';
      });
      
      // Ajustar largura das colunas
      [resumoSheet, materiaisSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
      });
      
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        resolve(blob);
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      reject(error);
    }
  });
};

/**
 * Gera um arquivo CSV para o relatório de materiais por obra
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do CSV
 */
const gerarCsvMateriaisPorObra = async (dados) => {
  return new Promise((resolve) => {
    try {
      const { materiais } = dados;
      
      // Cabeçalhos
      const headers = [
        'Material',
        'Categoria',
        'Unidade',
        'Entradas',
        'Saídas',
        'Saldo',
        'Valor Unitário (R$)',
        'Valor Total (R$)'
      ].join(',');
      
      // Linhas de dados
      const rows = materiais.map(mat => [
        `"${mat.nome.replace(/"/g, '""')}"`,
        `"${mat.categoria.replace(/"/g, '""')}"`,
        mat.unidade,
        mat.entrada,
        mat.saida,
        mat.saldo,
        mat.preco_unitario,
        mat.valor_total
      ].join(','));
      
      // Montar CSV
      const csv = [headers, ...rows].join('\n');
      
      // Criar blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      resolve(blob);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      reject(error);
    }
  });
};

/**
 * Gera um relatório de materiais por obra
 * @param {number} obraId ID da obra para gerar o relatório
 * @param {string} formato Formato do relatório: 'pdf', 'excel' ou 'csv'
 * @returns {Promise<Blob>} Promise com o blob do relatório
 */
export const gerarRelatorioMateriaisPorObra = async (obraId, formato = 'pdf') => {
  if (!obraId) {
    throw new Error('ID da obra é obrigatório');
  }

  try {
    // Obter dados da obra
    const { data: obra, error: obraError } = await supabase
      .from('obras')
      .select('*')
      .eq('id', obraId)
      .single();

    if (obraError) throw obraError;
    if (!obra) throw new Error('Obra não encontrada');
    
    // Verificar se alguma tabela de movimentações existe
    const { tableExists, tableName, error: tableError } = await verificarTabelaMovimentacoes();
    
    if (!tableExists) {
      throw new Error('A tabela de movimentações de materiais não existe no banco de dados. É necessário criá-la para gerar este relatório.');
    }

    // Buscar movimentações de materiais para a obra com o nome da tabela correto
    const { data: movimentacoes, error: movError } = await supabase
      .from(tableName)
      .select('*')
      .eq('obra_id', obraId)
      .order('data', { ascending: false });

    if (movError) throw movError;

    // Se não houver movimentações, retornar relatório vazio
    if (!movimentacoes || movimentacoes.length === 0) {
      const dadosVazios = {
        obra,
        materiais: [],
        categorias: [],
        total: {
          quantidade_materiais: 0,
          valor_total: 0
        }
      };
      
      // Gerar relatório vazio no formato solicitado
      let blob;
      let contentType;
      let extensao;
      
      switch (formato.toLowerCase()) {
        case 'excel':
          blob = await gerarExcelMateriaisPorObra(dadosVazios);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extensao = 'xlsx';
          break;
        case 'csv':
          blob = await gerarCsvMateriaisPorObra(dadosVazios);
          contentType = 'text/csv';
          extensao = 'csv';
          break;
        case 'pdf':
        default:
          blob = await gerarPdfMateriaisPorObra(dadosVazios);
          contentType = 'application/pdf';
          extensao = 'pdf';
          break;
      }
      
      // Nome do arquivo
      const dataFormatada = new Date().toISOString().split('T')[0];
      const nomeArquivo = `relatorio_materiais_${obra.nome.replace(/\s+/g, '_').toLowerCase()}_${dataFormatada}.${extensao}`;
      
      return {
        blob,
        nome: nomeArquivo,
        contentType
      };
    }

    // Buscar materiais em uma consulta separada
    const { data: materiaisData } = await supabase.from('materiais').select('*');
    
    // Processar dados para o relatório
    const materiaisPorId = {};
    
    // Processar movimentações
    movimentacoes.forEach(mov => {
      if (!mov.material_id) return;
      
      // Encontrar o material correspondente
      const material = materiaisData ? materiaisData.find(m => m.id === mov.material_id) : null;
      if (!material) return;
      
      const id = material.id;
      
      if (!materiaisPorId[id]) {
        materiaisPorId[id] = {
          id,
          nome: material.nome,
          unidade: material.unidade,
          categoria: material.categoria || 'Sem categoria',
          preco_unitario: material.preco_unitario || 0,
          entrada: 0,
          saida: 0,
          saldo: 0,
          valor_total: 0
        };
      }
      
      // Calcular entradas e saídas
      if (mov.tipo === 'entrada') {
        materiaisPorId[id].entrada += mov.quantidade;
      } else if (mov.tipo === 'saida') {
        materiaisPorId[id].saida += mov.quantidade;
      }
    });
    
    // Calcular saldos e valores totais
    const materiais = Object.values(materiaisPorId).map(material => {
      material.saldo = material.entrada - material.saida;
      material.valor_total = material.saldo * material.preco_unitario;
      return material;
    });
    
    // Agrupar por categoria
    const categoriaMap = {};
    materiais.forEach(material => {
      if (!material.categoria) material.categoria = 'Sem categoria';
      
      if (!categoriaMap[material.categoria]) {
        categoriaMap[material.categoria] = {
          categoria: material.categoria,
          quantidade_itens: 0,
          valor_total: 0
        };
      }
      
      categoriaMap[material.categoria].quantidade_itens++;
      categoriaMap[material.categoria].valor_total += material.valor_total;
    });
    
    const categorias = Object.values(categoriaMap);
    
    // Calcular total geral
    const total = {
      quantidade_materiais: materiais.length,
      valor_total: materiais.reduce((sum, material) => sum + material.valor_total, 0)
    };
    
    // Dados processados para o relatório
    const dadosRelatorio = {
      obra,
      materiais,
      categorias,
      total
    };
    
    // Gerar relatório no formato solicitado
    let blob;
    let contentType;
    let extensao;
    
    switch (formato.toLowerCase()) {
      case 'excel':
        blob = await gerarExcelMateriaisPorObra(dadosRelatorio);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extensao = 'xlsx';
        break;
      case 'csv':
        blob = await gerarCsvMateriaisPorObra(dadosRelatorio);
        contentType = 'text/csv';
        extensao = 'csv';
        break;
      case 'pdf':
      default:
        blob = await gerarPdfMateriaisPorObra(dadosRelatorio);
        contentType = 'application/pdf';
        extensao = 'pdf';
        break;
    }
    
    // Nome do arquivo
    const dataFormatada = new Date().toISOString().split('T')[0];
    const nomeArquivo = `relatorio_materiais_${obra.nome.replace(/\s+/g, '_').toLowerCase()}_${dataFormatada}.${extensao}`;
    
    return {
      blob,
      nome: nomeArquivo,
      contentType
    };
  } catch (error) {
    console.error('Erro ao gerar relatório de materiais por obra:', error);
    throw error;
  }
};

/**
 * Gera um PDF para o relatório de movimentações de materiais
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do PDF
 */
const gerarPdfMovimentacoesMateriais2 = async (dados) => {
  try {
    const { 
      dataInicio, 
      dataFim, 
      movimentacoes, 
      categorias,
      totalEntradas, 
      totalSaidas, 
      saldoQuantidade,
      valorTotal 
    } = dados;
    
    const doc = new jsPDF();
    
    // Configurações iniciais
    doc.setFontSize(16);
    doc.text('Relatório de Movimentações de Materiais', 105, 15, { align: 'center' });
    
    // Informações do período
    doc.setFontSize(12);
    doc.text(`Período: ${dataInicio} a ${dataFim}`, 14, 30);
    doc.text(`Data do relatório: ${formatarData(new Date())}`, 14, 40);
    
    // Resumo por categoria
    doc.setFontSize(14);
    doc.text('Resumo por Categoria', 14, 60);
    
    const headersCategorias = ['Categoria', 'Entradas', 'Saídas', 'Saldo', 'Valor Total (R$)'];
    const rowsCategorias = categorias.map(cat => [
      cat.categoria,
      cat.entradas.toFixed(2),
      cat.saidas.toFixed(2),
      cat.saldo.toFixed(2),
      formatarMoeda(cat.valor)
    ]);
    
    // Adiciona tabela de categorias
    autoTable(doc, {
      startY: 65,
      head: [headersCategorias],
      body: rowsCategorias,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244], textColor: 255 }
    });
    
    // Total geral
    const finalY = doc.lastAutoTable.finalY + 10;
    doc.text(`Total de entradas: ${totalEntradas.toFixed(2)}`, 14, finalY);
    doc.text(`Total de saídas: ${totalSaidas.toFixed(2)}`, 14, finalY + 8);
    doc.text(`Saldo: ${saldoQuantidade.toFixed(2)}`, 14, finalY + 16);
    doc.text(`Valor total: ${formatarMoeda(valorTotal)}`, 14, finalY + 24);
    
    // Lista de movimentações
    doc.addPage();
    doc.setFontSize(14);
    doc.text('Lista de Movimentações', 14, 15);
    
    const headersMovimentacoes = ['Data', 'Material', 'Categoria', 'Obra', 'Tipo', 'Quantidade', 'Valor (R$)'];
    const rowsMovimentacoes = movimentacoes.map(mov => [
      mov.data,
      mov.material,
      mov.categoria,
      mov.obra,
      mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
      mov.quantidade.toFixed(2),
      formatarMoeda(mov.valor)
    ]);
    
    // Adiciona tabela de movimentações
    autoTable(doc, {
      startY: 20,
      head: [headersMovimentacoes],
      body: rowsMovimentacoes,
      theme: 'grid',
      headStyles: { fillColor: [66, 133, 244], textColor: 255 },
      columnStyles: {
        5: { halign: 'right' },
        6: { halign: 'right' }
      }
    });
    
    // Rodapé
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Página ${i} de ${pageCount}`, 105, 287, { align: 'center' });
      doc.text('GestObra - Sistema de Gestão de Obras', 105, 292, { align: 'center' });
    }
    
    // Gerar o blob como um binário
    const pdfOutput = doc.output('arraybuffer');
    return new Blob([pdfOutput], { type: 'application/pdf' });
  } catch (error) {
    console.error('Erro ao gerar PDF:', error);
    // Retornar um blob vazio em caso de erro
    return new Blob(['Erro ao gerar relatório de movimentações de materiais'], { type: 'text/plain' });
  }
};

/**
 * Gera um Excel para o relatório de movimentações de materiais
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do Excel
 */
const gerarExcelMovimentacoesMateriais2 = async (dados) => {
  return new Promise((resolve, reject) => {
    try {
      const { 
        dataInicio, 
        dataFim, 
        movimentacoes, 
        categorias,
        totalEntradas, 
        totalSaidas, 
        saldoQuantidade,
        valorTotal 
      } = dados;
      
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'GestObra';
      workbook.lastModifiedBy = 'GestObra';
      workbook.created = new Date();
      workbook.modified = new Date();
      
      // Aba de resumo
      const resumoSheet = workbook.addWorksheet('Resumo');
      
      // Título
      resumoSheet.mergeCells('A1:E1');
      const titleCell = resumoSheet.getCell('A1');
      titleCell.value = 'Relatório de Movimentações de Materiais';
      titleCell.font = { bold: true, size: 16 };
      titleCell.alignment = { horizontal: 'center' };
      
      // Informações do período
      resumoSheet.getCell('A3').value = 'Período:';
      resumoSheet.getCell('B3').value = `${dataInicio} a ${dataFim}`;
      resumoSheet.getCell('A4').value = 'Data do relatório:';
      resumoSheet.getCell('B4').value = formatarData(new Date());
      
      // Resumo por categoria
      resumoSheet.getCell('A6').value = 'Resumo por Categoria';
      resumoSheet.getCell('A6').font = { bold: true, size: 14 };
      
      // Cabeçalhos
      resumoSheet.getCell('A8').value = 'Categoria';
      resumoSheet.getCell('B8').value = 'Entradas';
      resumoSheet.getCell('C8').value = 'Saídas';
      resumoSheet.getCell('D8').value = 'Saldo';
      resumoSheet.getCell('E8').value = 'Valor Total (R$)';
      
      // Estilo dos cabeçalhos
      ['A8', 'B8', 'C8', 'D8', 'E8'].forEach(cell => {
        resumoSheet.getCell(cell).font = { bold: true };
        resumoSheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4285F4' }
        };
        resumoSheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFF' } };
      });
      
      // Dados das categorias
      categorias.forEach((categoria, index) => {
        const row = index + 9;
        resumoSheet.getCell(`A${row}`).value = categoria.categoria;
        resumoSheet.getCell(`B${row}`).value = categoria.entradas;
        resumoSheet.getCell(`C${row}`).value = categoria.saidas;
        resumoSheet.getCell(`D${row}`).value = categoria.saldo;
        resumoSheet.getCell(`E${row}`).value = categoria.valor;
        
        // Formato de número para valores
        resumoSheet.getCell(`B${row}`).numFmt = '#,##0.00';
        resumoSheet.getCell(`C${row}`).numFmt = '#,##0.00';
        resumoSheet.getCell(`D${row}`).numFmt = '#,##0.00';
        resumoSheet.getCell(`E${row}`).numFmt = '"R$"#,##0.00';
      });
      
      // Totais
      const totalRow = categorias.length + 10;
      resumoSheet.getCell(`A${totalRow}`).value = 'TOTAIS';
      resumoSheet.getCell(`A${totalRow}`).font = { bold: true };
      resumoSheet.getCell(`B${totalRow}`).value = totalEntradas;
      resumoSheet.getCell(`C${totalRow}`).value = totalSaidas;
      resumoSheet.getCell(`D${totalRow}`).value = saldoQuantidade;
      resumoSheet.getCell(`E${totalRow}`).value = valorTotal;
      
      // Formato de número para totais
      resumoSheet.getCell(`B${totalRow}`).numFmt = '#,##0.00';
      resumoSheet.getCell(`C${totalRow}`).numFmt = '#,##0.00';
      resumoSheet.getCell(`D${totalRow}`).numFmt = '#,##0.00';
      resumoSheet.getCell(`E${totalRow}`).numFmt = '"R$"#,##0.00';
      
      // Aba de movimentações
      const movimentacoesSheet = workbook.addWorksheet('Movimentações');
      
      // Título
      movimentacoesSheet.mergeCells('A1:G1');
      const movTitleCell = movimentacoesSheet.getCell('A1');
      movTitleCell.value = 'Lista de Movimentações de Materiais';
      movTitleCell.font = { bold: true, size: 16 };
      movTitleCell.alignment = { horizontal: 'center' };
      
      // Cabeçalhos
      movimentacoesSheet.getCell('A3').value = 'Data';
      movimentacoesSheet.getCell('B3').value = 'Material';
      movimentacoesSheet.getCell('C3').value = 'Categoria';
      movimentacoesSheet.getCell('D3').value = 'Obra';
      movimentacoesSheet.getCell('E3').value = 'Tipo';
      movimentacoesSheet.getCell('F3').value = 'Quantidade';
      movimentacoesSheet.getCell('G3').value = 'Valor (R$)';
      
      // Estilo dos cabeçalhos
      ['A3', 'B3', 'C3', 'D3', 'E3', 'F3', 'G3'].forEach(cell => {
        movimentacoesSheet.getCell(cell).font = { bold: true };
        movimentacoesSheet.getCell(cell).fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: '4285F4' }
        };
        movimentacoesSheet.getCell(cell).font = { bold: true, color: { argb: 'FFFFFF' } };
      });
      
      // Dados das movimentações
      movimentacoes.forEach((mov, index) => {
        const row = index + 4;
        movimentacoesSheet.getCell(`A${row}`).value = mov.data;
        movimentacoesSheet.getCell(`B${row}`).value = mov.material;
        movimentacoesSheet.getCell(`C${row}`).value = mov.categoria;
        movimentacoesSheet.getCell(`D${row}`).value = mov.obra;
        movimentacoesSheet.getCell(`E${row}`).value = mov.tipo === 'entrada' ? 'Entrada' : 'Saída';
        movimentacoesSheet.getCell(`F${row}`).value = mov.quantidade;
        movimentacoesSheet.getCell(`G${row}`).value = mov.valor;
        
        // Formatos
        movimentacoesSheet.getCell(`F${row}`).numFmt = '#,##0.00';
        movimentacoesSheet.getCell(`G${row}`).numFmt = '"R$"#,##0.00';
      });
      
      // Ajustar largura das colunas
      [resumoSheet, movimentacoesSheet].forEach(sheet => {
        sheet.columns.forEach(column => {
          let maxLength = 0;
          column.eachCell({ includeEmpty: true }, cell => {
            const length = cell.value ? cell.value.toString().length : 10;
            if (length > maxLength) {
              maxLength = length;
            }
          });
          column.width = maxLength < 10 ? 10 : maxLength + 2;
        });
      });
      
      workbook.xlsx.writeBuffer().then(buffer => {
        const blob = new Blob([buffer], { 
          type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        });
        resolve(blob);
      });
    } catch (error) {
      console.error('Erro ao gerar Excel:', error);
      reject(error);
    }
  });
};

/**
 * Gera um CSV para o relatório de movimentações de materiais
 * @param {Object} dados Dados processados do relatório
 * @returns {Promise<Blob>} Promise com o blob do CSV
 */
const gerarCsvMovimentacoesMateriais2 = async (dados) => {
  return new Promise((resolve, reject) => {
    try {
      const { movimentacoes } = dados;
      
      // Cabeçalhos
      const headers = [
        'Data',
        'Material',
        'Categoria',
        'Obra',
        'Tipo',
        'Quantidade',
        'Valor (R$)',
        'Observação'
      ].join(',');
      
      // Linhas de dados
      const rows = movimentacoes.map(mov => [
        mov.data,
        `"${mov.material.replace(/"/g, '""')}"`,
        `"${mov.categoria.replace(/"/g, '""')}"`,
        `"${mov.obra.replace(/"/g, '""')}"`,
        mov.tipo === 'entrada' ? 'Entrada' : 'Saída',
        mov.quantidade,
        mov.valor,
        `"${(mov.observacao || '').replace(/"/g, '""')}"`
      ].join(','));
      
      // Montar CSV
      const csv = [headers, ...rows].join('\n');
      
      // Criar blob
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      resolve(blob);
    } catch (error) {
      console.error('Erro ao gerar CSV:', error);
      reject(error);
    }
  });
};

export const gerarRelatorioMovimentacoesMateriais2 = async (categoriaId, dateRange, formato = 'pdf') => {
  try {
    // Verificar se alguma tabela de movimentações existe
    const { tableExists, tableName, error: tableError } = await verificarTabelaMovimentacoes();
    
    if (!tableExists) {
      throw new Error('A tabela de movimentações de materiais não existe no banco de dados. É necessário criá-la para gerar este relatório.');
    }
    
    // Iniciar a consulta básica com o nome da tabela encontrada
    let query = supabase
      .from(tableName)
      .select(`
        id,
        material_id,
        obra_id,
        data,
        quantidade,
        tipo,
        observacao,
        materiais:material_id(id, nome, unidade, categoria, preco_unitario),
        obras:obra_id(id, nome)
      `)
      .order('data', { ascending: false });
    
    // Aplicar filtro de data
    if (dateRange?.dataInicio) {
      query = query.gte('data', dateRange.dataInicio);
    }
    
    if (dateRange?.dataFim) {
      query = query.lte('data', dateRange.dataFim);
    }
    
    // Executar consulta
    const { data: movimentacoes, error } = await query;
    
    if (error) throw error;
    
    // Se não houver movimentações, retornar relatório vazio
    if (!movimentacoes || movimentacoes.length === 0) {
      const dadosVazios = {
        movimentacoes: [],
        categorias: [],
        totalEntradas: 0,
        totalSaidas: 0,
        saldoQuantidade: 0,
        valorTotal: 0
      };
      
      // Gerar relatório vazio no formato solicitado
      let blob;
      let contentType;
      let extensao;
      
      switch (formato.toLowerCase()) {
        case 'excel':
          blob = await gerarExcelMovimentacoesMateriais2(dadosVazios);
          contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
          extensao = 'xlsx';
          break;
        case 'csv':
          blob = await gerarCsvMovimentacoesMateriais2(dadosVazios);
          contentType = 'text/csv';
          extensao = 'csv';
          break;
        case 'pdf':
        default:
          blob = await gerarPdfMovimentacoesMateriais2(dadosVazios);
          contentType = 'application/pdf';
          extensao = 'pdf';
          break;
      }
      
      // Nome do arquivo
      const dataFormatada = new Date().toISOString().split('T')[0];
      const nomeArquivo = `relatorio_movimentacoes_materiais_${categoriaId}_${dateRange.dataInicio}_${dateRange.dataFim}.${extensao}`;
      
      return {
        blob,
        nome: nomeArquivo,
        contentType
      };
    }

    // Processar dados para o relatório
    const categorias = [];
    const totalEntradas = 0;
    const totalSaidas = 0;
    const saldoQuantidade = 0;
    const valorTotal = 0;
    
    movimentacoes.forEach(mov => {
      if (!categorias.some(cat => cat.categoria === mov.categoria)) {
        categorias.push({ categoria: mov.categoria, entradas: 0, saidas: 0, saldo: 0, valor: 0 });
      }
      
      const categoriaIndex = categorias.findIndex(cat => cat.categoria === mov.categoria);
      
      if (mov.tipo === 'entrada') {
        categorias[categoriaIndex].entradas += mov.quantidade;
        totalEntradas += mov.quantidade;
      } else if (mov.tipo === 'saida') {
        categorias[categoriaIndex].saidas += mov.quantidade;
        totalSaidas += mov.quantidade;
      }
      
      categorias[categoriaIndex].saldo = categorias[categoriaIndex].entradas - categorias[categoriaIndex].saidas;
      categorias[categoriaIndex].valor = categorias[categoriaIndex].saldo * categorias[categoriaIndex].preco_unitario;
      
      saldoQuantidade += categorias[categoriaIndex].saldo;
      valorTotal += categorias[categoriaIndex].valor;
    });
    
    // Dados processados para o relatório
    const dadosRelatorio = {
      movimentacoes,
      categorias,
      totalEntradas,
      totalSaidas,
      saldoQuantidade,
      valorTotal
    };
    
    // Gerar relatório no formato solicitado
    let blob;
    let contentType;
    let extensao;
    
    switch (formato.toLowerCase()) {
      case 'excel':
        blob = await gerarExcelMovimentacoesMateriais2(dadosRelatorio);
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        extensao = 'xlsx';
        break;
      case 'csv':
        blob = await gerarCsvMovimentacoesMateriais2(dadosRelatorio);
        contentType = 'text/csv';
        extensao = 'csv';
        break;
      case 'pdf':
      default:
        blob = await gerarPdfMovimentacoesMateriais2(dadosRelatorio);
        contentType = 'application/pdf';
        extensao = 'pdf';
        break;
    }
    
    // Nome do arquivo
    const dataFormatada = new Date().toISOString().split('T')[0];
    const nomeArquivo = `relatorio_movimentacoes_materiais_${categoriaId}_${dateRange.dataInicio}_${dateRange.dataFim}.${extensao}`;
    
    return {
      blob,
      nome: nomeArquivo,
      contentType
    };
  } catch (error) {
    console.error('Erro ao gerar relatório de movimentações de materiais:', error);
    throw error;
  }
};