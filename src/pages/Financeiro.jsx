import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMoneyBillWave, FaArrowUp, FaArrowDown, FaCalendarAlt, FaTable, FaChartBar, FaFileInvoice, FaBuilding } from 'react-icons/fa';
import { 
  getTransacoes, 
  createTransacao, 
  updateTransacao, 
  deleteTransacao,
  getFluxoCaixa,
  getContasPendentes,
  getRelatorioPorCategoria,
  getRelatorioCustosPorObra,
  getDespesasMateriais
} from '../services/financeiroService';
import { getObras } from '../services/obrasService';

const Financeiro = () => {
  const [transacoes, setTransacoes] = useState([]);
  const [obras, setObras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentTransacao, setCurrentTransacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('todas'); // 'todas', 'despesas', 'receitas', 'fluxoCaixa', 'pendentes', 'relatorios'
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: '',
    categoria: '',
    obra_id: '',
    tipo: 'despesa', // 'despesa' ou 'receita'
    status_pagamento: 'pendente' // 'pendente', 'pago', 'recebido'
  });
  const [relatorios, setRelatorios] = useState({
    fluxoCaixa: null,
    contasPendentes: null,
    porCategoria: null,
    custosPorObra: null
  });
  const [filtroData, setFiltroData] = useState({
    dataInicio: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0], // Primeiro dia do mês
    dataFim: new Date().toISOString().split('T')[0] // Hoje
  });
  const [activeRelatorio, setActiveRelatorio] = useState('fluxoCaixa'); // 'fluxoCaixa', 'porCategoria', 'custosPorObra'
  const [filtroObra, setFiltroObra] = useState('todas'); // 'todas' ou ID da obra
  const [totaisCalculados, setTotaisCalculados] = useState({
    totalDespesas: 0,
    totalReceitas: 0,
    saldo: 0
  });
  const [filtros, setFiltros] = useState({
    tipo: 'todos', // adicionar 'material' como opção
    categoria: '',
    dataInicio: '',
    dataFim: '',
    obraId: ''
  });

  // Carregar transações do Supabase
  useEffect(() => {
    const fetchTransacoes = async () => {
      try {
        setLoading(true);
        const { data, error } = await getTransacoes();
        
        if (error) {
          throw error;
        }
        
        setTransacoes(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar transações:', error);
        setError(error.message || 'Erro ao carregar transações');
        setLoading(false);
      }
    };
    
    fetchTransacoes();
  }, []);

  // Atualizar totais quando as transações ou filtros mudarem
  useEffect(() => {
    console.log('Atualizando totais calculados...');
    setTotaisCalculados(calcularTotais());
  }, [transacoes, activeTab, filtroObra, searchTerm]);

  // Carregar obras do Supabase
  useEffect(() => {
    const fetchObras = async () => {
      try {
        const { data, error } = await getObras();
        
        if (error) {
          throw error;
        }
        
        setObras(data || []);
      } catch (error) {
        console.error('Erro ao carregar obras:', error);
        setError(error.message || 'Erro ao carregar obras');
      }
    };
    
    fetchObras();
  }, []);

  // Filtrar transações com base no termo de pesquisa e na aba ativa
  const filteredTransacoes = transacoes.filter(transacao => {
    const matchesSearch = 
      transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesTab = 
      activeTab === 'todas' || 
      (activeTab === 'despesas' && transacao.tipo === 'despesa') ||
      (activeTab === 'receitas' && transacao.tipo === 'receita');
    
    const matchesObra = 
      filtroObra === 'todas' || 
      transacao.obra_id === filtroObra;
    
    return matchesSearch && matchesTab && matchesObra;
  });

  // Calcular totais
  const calcularTotais = (transacoesParam) => {
    // Usar os dados passados como parâmetro ou as transações globais
    const transacoesParaCalcular = transacoesParam || transacoes;
    
    // Verificar se há transações para evitar erros
    if (!transacoesParaCalcular || transacoesParaCalcular.length === 0) {
      return {
        totalReceitas: 0,
        totalDespesas: 0,
        saldo: 0
      };
    }

    try {
      // Calcular total de despesas com validação de tipo e valor
      // Considerar apenas despesas com status "pago"
      const totalDespesas = transacoesParaCalcular
        .filter(t => t.tipo === 'despesa' && t.status_pagamento === 'pago')
        .reduce((acc, curr) => {
          // Garantir que o valor seja um número válido
          const valor = typeof curr.valor === 'string' 
            ? parseFloat(curr.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
            : typeof curr.valor === 'number'
              ? curr.valor
              : parseFloat(String(curr.valor || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
          
          return isNaN(valor) ? acc : acc + valor;
        }, 0);
      
      // Calcular total de receitas com validação de tipo e valor
      // Considerar apenas receitas com status "pago"
      const totalReceitas = transacoesParaCalcular
        .filter(t => t.tipo === 'receita' && t.status_pagamento === 'pago')
        .reduce((acc, curr) => {
          // Garantir que o valor seja um número válido
          const valor = typeof curr.valor === 'string' 
            ? parseFloat(curr.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
            : typeof curr.valor === 'number'
              ? curr.valor
              : parseFloat(String(curr.valor || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
          
          return isNaN(valor) ? acc : acc + valor;
        }, 0);
      
      // Verificar se há transações sem tipo definido (legado)
      const transacoesSemTipo = transacoesParaCalcular.filter(t => !t.tipo && t.status_pagamento === 'pago');
      
      if (transacoesSemTipo.length > 0) {
        console.warn(`Existem transações sem tipo definido: ${transacoesSemTipo.length}`);
        
        // Detectar tipo com base na descrição
        const despesasSemTipo = transacoesSemTipo
          .filter(t => 
            t.descricao &&
            (t.descricao.toLowerCase().includes('compra') || 
             t.descricao.toLowerCase().includes('pagamento'))
          )
          .reduce((acc, curr) => {
            const valor = typeof curr.valor === 'string' 
              ? parseFloat(curr.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
              : typeof curr.valor === 'number'
                ? curr.valor
                : parseFloat(String(curr.valor || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
            
            return isNaN(valor) ? acc : acc + valor;
          }, 0);
        
        // Adicionar ao total de despesas
        return {
          totalReceitas,
          totalDespesas: totalDespesas + despesasSemTipo,
          saldo: totalReceitas - (totalDespesas + despesasSemTipo)
        };
      }
      
      return {
        totalReceitas,
        totalDespesas,
        saldo: totalReceitas - totalDespesas
      };
    } catch (error) {
      console.error('Erro ao calcular totais:', error);
      return {
        totalReceitas: 0,
        totalDespesas: 0,
        saldo: 0
      };
    }
  };

  // Usar os totais calculados em vez de recalcular a cada renderização
  const { totalDespesas, totalReceitas, saldo } = totaisCalculados;

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  // Abrir modal para adicionar/editar transação
  const openModal = (transacao = null) => {
    if (transacao) {
      setCurrentTransacao(transacao);
      setFormData({
        descricao: transacao.descricao,
        valor: transacao.valor,
        data: transacao.data,
        categoria: transacao.categoria,
        obra_id: transacao.obra_id || '',
        tipo: transacao.tipo,
        status_pagamento: transacao.status_pagamento
      });
    } else {
      setCurrentTransacao(null);
      setFormData({
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        categoria: '',
        obra_id: '',
        tipo: 'despesa',
        status_pagamento: 'pendente'
      });
    }
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentTransacao(null);
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar transação
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      // Verificar tipo do lançamento
      if (!formData.tipo || !['despesa', 'receita'].includes(formData.tipo)) {
        console.warn('Tipo inválido, definindo padrão como despesa');
        formData.tipo = 'despesa';
      }

      // Garantir que o valor seja um número válido
      const valorNumerico = typeof formData.valor === 'string' 
        ? parseFloat(formData.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
        : typeof formData.valor === 'number'
          ? formData.valor
          : parseFloat(String(formData.valor || '0').replace(/[^\d.,]/g, '').replace(',', '.'));
      
      // Verificar campo obra_id - Se for receita e estiver vazio, definir como null
      const obra_id = formData.tipo === 'receita' && !formData.obra_id ? null : formData.obra_id;
      
      const transacaoData = {
        ...formData,
        obra_id,
        valor: isNaN(valorNumerico) ? 0 : valorNumerico
      };

      // Criar ou atualizar transação
      let result;
      
      if (currentTransacao) {
        result = await updateTransacao(currentTransacao.id, transacaoData);
      } else {
        result = await createTransacao(transacaoData);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Recarregar todas as transações para garantir dados atualizados
      await loadTransacoes();
      
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      setError(error.message || 'Erro ao salvar transação');
    } finally {
      setLoading(false);
    }
  };

  // Excluir transação
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await deleteTransacao(id);
      
      if (error) {
        throw error;
      }
      
      // Atualizar lista de transações
      const { data: updatedData } = await getTransacoes();
      setTransacoes(updatedData || []);
      
      // Recalcular totais explicitamente
      setTotaisCalculados(calcularTotais(updatedData));
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao excluir transação:', error);
      setError(error.message || 'Erro ao excluir transação');
      setLoading(false);
    }
  };

  // Carregar fluxo de caixa
  const carregarFluxoCaixa = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getFluxoCaixa(
        filtroData.dataInicio, 
        filtroData.dataFim
      );
      
      if (error) {
        throw error;
      }
      
      setRelatorios(prev => ({ ...prev, fluxoCaixa: data }));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar fluxo de caixa:', error);
      setError(error.message || 'Erro ao carregar fluxo de caixa');
      setLoading(false);
    }
  };

  // Carregar contas pendentes
  const carregarContasPendentes = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getContasPendentes();
      
      if (error) {
        throw error;
      }
      
      setRelatorios(prev => ({ ...prev, contasPendentes: data }));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar contas pendentes:', error);
      setError(error.message || 'Erro ao carregar contas pendentes');
      setLoading(false);
    }
  };

  // Carregar relatório por categoria
  const carregarRelatorioPorCategoria = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getRelatorioPorCategoria(
        filtroData.dataInicio, 
        filtroData.dataFim
      );
      
      if (error) {
        throw error;
      }
      
      setRelatorios(prev => ({ ...prev, porCategoria: data }));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar relatório por categoria:', error);
      setError(error.message || 'Erro ao carregar relatório por categoria');
      setLoading(false);
    }
  };

  // Carregar relatório de custos por obra
  const carregarRelatorioCustosPorObra = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await getRelatorioCustosPorObra();
      
      if (error) {
        throw error;
      }
      
      setRelatorios(prev => ({ ...prev, custosPorObra: data }));
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar relatório de custos por obra:', error);
      setError(error.message || 'Erro ao carregar relatório de custos por obra');
      setLoading(false);
    }
  };

  // Carregar relatórios quando a tab mudar
  useEffect(() => {
    if (activeTab === 'fluxoCaixa' && !relatorios.fluxoCaixa) {
      carregarFluxoCaixa();
    } else if (activeTab === 'pendentes' && !relatorios.contasPendentes) {
      carregarContasPendentes();
    } else if (activeTab === 'relatorios') {
      if (activeRelatorio === 'fluxoCaixa' && !relatorios.fluxoCaixa) {
        carregarFluxoCaixa();
      } else if (activeRelatorio === 'porCategoria' && !relatorios.porCategoria) {
        carregarRelatorioPorCategoria();
      } else if (activeRelatorio === 'custosPorObra' && !relatorios.custosPorObra) {
        carregarRelatorioCustosPorObra();
      }
    }
  }, [activeTab, activeRelatorio]);

  // Atualizar relatórios quando o filtro de data mudar
  useEffect(() => {
    if (activeTab === 'fluxoCaixa' || (activeTab === 'relatorios' && activeRelatorio === 'fluxoCaixa')) {
      carregarFluxoCaixa();
    } else if (activeTab === 'relatorios' && activeRelatorio === 'porCategoria') {
      carregarRelatorioPorCategoria();
    }
  }, [filtroData]);

  // Obter cor com base no tipo de transação
  const getTransacaoColor = (tipo) => {
    return tipo === 'despesa' ? 'red' : 'green';
  };

  // Obter ícone com base no tipo de transação
  const getTransacaoIcon = (tipo) => {
    return tipo === 'despesa' ? <FaArrowDown /> : <FaArrowUp />;
  };

  // Obter texto do status
  const getStatusText = (status, tipo) => {
    if (tipo === 'despesa') {
      return status === 'pendente' ? 'Pendente' : 'Pago';
    } else {
      return status === 'pendente' ? 'Pendente' : 'Recebido';
    }
  };

  // Função de carregamento com suporte a filtro de materiais
  const loadTransacoes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data;
      
      // Se estiver filtrando apenas materiais, usar a função específica
      if (filtros.tipo === 'material') {
        const filters = {
          obra_id: filtros.obraId || undefined,
          dataInicio: filtros.dataInicio || undefined,
          dataFim: filtros.dataFim || undefined
        };
        
        const result = await getDespesasMateriais(filters);
        if (result.error) throw result.error;
        data = result.data;
      } else {
        // Buscar todas as transações normalmente
        const { data: transacoesData, error } = await getTransacoes();
        if (error) throw error;
        data = transacoesData;
      }
      
      // Aplicar filtros adicionais (que não foram aplicados na query)
      let transacoesFiltradas = data;
      
      if (filtros.tipo && filtros.tipo !== 'todos' && filtros.tipo !== 'material') {
        transacoesFiltradas = transacoesFiltradas.filter(t => t.tipo === filtros.tipo);
      }
      
      if (filtros.categoria) {
        transacoesFiltradas = transacoesFiltradas.filter(t => t.categoria === filtros.categoria);
      }
      
      if (filtros.obraId && filtros.tipo !== 'material') { // Para material isso já foi filtrado na query
        transacoesFiltradas = transacoesFiltradas.filter(t => t.obra_id === filtros.obraId);
      }
      
      if (filtros.dataInicio && filtros.tipo !== 'material') { // Para material isso já foi filtrado na query
        transacoesFiltradas = transacoesFiltradas.filter(t => t.data >= filtros.dataInicio);
      }
      
      if (filtros.dataFim && filtros.tipo !== 'material') { // Para material isso já foi filtrado na query
        transacoesFiltradas = transacoesFiltradas.filter(t => t.data <= filtros.dataFim);
      }
      
      // Atualizar a lista de transações filtradas para a exibição
      setTransacoes(transacoesFiltradas);
      
      // Buscar novamente todas as transações para cálculo correto dos totais
      const { data: allTransactions, error: allError } = await getTransacoes();
      if (allError) throw allError;
      
      // Calcular totais com base em TODAS as transações, não apenas as filtradas
      setTotaisCalculados(calcularTotais(allTransactions));
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar transações:', error);
      setError(error.message || 'Erro ao carregar transações');
      setLoading(false);
    }
  };

  // Manipular mudanças nos filtros
  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({ ...prev, [name]: value }));
  };

  // Aplicar filtros
  const aplicarFiltros = () => {
    setLoading(true);
    loadTransacoes();
  };

  // Limpar filtros
  const limparFiltros = () => {
    setFiltros({
      tipo: 'todos',
      categoria: '',
      dataInicio: '',
      dataFim: '',
      obraId: ''
    });
    
    // Recarregar transações após limpar os filtros
    setTimeout(() => {
      loadTransacoes();
    }, 100);
  };

  // Efeito para carregar transações e outras dependências iniciais
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Carregar obras para seleção no filtro e no formulário
        const { data: obrasData, error: obrasError } = await getObras();
        
        if (obrasError) throw obrasError;
        
        setObras(obrasData || []);
        
        // Carregar transações
        await loadTransacoes();
      } catch (error) {
        console.error('Erro ao carregar dados iniciais:', error);
        setError(error.message || 'Erro ao carregar dados');
      }
    };
    
    fetchData();
  }, []);
  
  // Efeito para recarregar quando os filtros mudarem
  useEffect(() => {
    loadTransacoes();
  }, [filtros.tipo, filtros.categoria, filtros.dataInicio, filtros.dataFim, filtros.obraId]);

  // Renderização de transações com informações adicionais para materiais
  const renderTransacoes = () => {
    if (loading) {
      return (
        <div className="flex justify-center p-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      );
    }
    
    if (transacoes.length === 0) {
      return (
        <div className="bg-gray-50 p-8 text-center border border-gray-200 rounded-md">
          <h3 className="text-lg font-medium text-gray-500">Nenhuma transação encontrada</h3>
          <p className="text-gray-400 mt-2">Utilize o botão "Nova Transação" para adicionar.</p>
        </div>
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrição</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Obra</th>
              {filtros.tipo === 'material' && (
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etapa
                </th>
              )}
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transacoes.map((transacao) => (
              <tr key={transacao.id} className={transacao.tipo === 'receita' ? 'bg-green-50' : 'bg-white'}>
                <td className="px-4 py-3 whitespace-normal">
                  <div className="text-sm font-medium text-gray-900 max-w-xs break-words">
                    {transacao.descricao}
                    {transacao.material_id && transacao.materiais && (
                      <div className="text-xs text-gray-500 mt-1">
                        Material: {transacao.materiais.nome} ({transacao.materiais.categoria})
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className={`text-sm font-bold ${transacao.tipo === 'receita' ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(transacao.valor)}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-500">{formatDate(transacao.data)}</div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {transacao.categoria || 'Geral'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {transacao.obras?.nome || (transacao.obra_id ? 'Obra não encontrada' : '-')}
                  </div>
                </td>
                {filtros.tipo === 'material' && (
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {transacao.etapas_obra?.nome || 'Não especificada'}
                    </div>
                  </td>
                )}
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    transacao.status_pagamento === 'pago' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {transacao.status_pagamento || 'Pendente'}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {!transacao.material_id && (
                      <>
                        <button
                          onClick={() => openModal(transacao)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(transacao.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                      </>
                    )}
                    {transacao.material_id && (
                      <div className="text-xs text-gray-400 italic">
                        Gerenciado via Materiais
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  // Renderização do componente de filtros
  const renderFiltros = () => {
    return (
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h3 className="text-lg font-medium mb-3">Filtros</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tipo
            </label>
            <select
              name="tipo"
              value={filtros.tipo}
              onChange={handleFiltroChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="todos">Todos os tipos</option>
              <option value="despesa">Apenas Despesas</option>
              <option value="receita">Apenas Receitas</option>
              <option value="material">Materiais</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Categoria
            </label>
            <select
              name="categoria"
              value={filtros.categoria}
              onChange={handleFiltroChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Todas as categorias</option>
              <option value="material">Material</option>
              <option value="mao_de_obra">Mão de Obra</option>
              <option value="servico">Serviço</option>
              <option value="equipamento">Equipamento</option>
              <option value="outro">Outro</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Obra
            </label>
            <select
              name="obraId"
              value={filtros.obraId}
              onChange={handleFiltroChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="">Todas as obras</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>{obra.nome}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Início
            </label>
            <input
              type="date"
              name="dataInicio"
              value={filtros.dataInicio}
              onChange={handleFiltroChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Data Fim
            </label>
            <input
              type="date"
              name="dataFim"
              value={filtros.dataFim}
              onChange={handleFiltroChange}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            />
          </div>
          
          <div className="flex items-end">
            <div className="flex space-x-2">
              <button
                onClick={aplicarFiltros}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Aplicar Filtros
              </button>
              <button
                onClick={limparFiltros}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Limpar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  if (loading && transacoes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">Financeiro</h1>
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Total de Receitas</h2>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(totaisCalculados.totalReceitas)}</div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Total de Despesas</h2>
            <div className="text-2xl font-bold text-red-600">{formatCurrency(totaisCalculados.totalDespesas)}</div>
          </div>
          
          <div className="p-4 bg-white rounded-lg shadow-sm">
            <h2 className="text-sm font-medium text-gray-500 mb-1">Saldo</h2>
            <div className={`text-2xl font-bold ${totaisCalculados.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totaisCalculados.saldo)}
            </div>
          </div>
        </div>
      </div>
      
      {/* Filtros de busca */}
      {renderFiltros()}
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <strong className="font-bold">Erro: </strong>
          <span>{error}</span>
        </div>
      )}
      
      <div className="mb-4 flex justify-between items-center">
        <div className="flex">
          <button
            onClick={() => setActiveTab('todas')}
            className={`px-4 py-2 mr-2 rounded-t-md ${activeTab === 'todas' ? 'bg-white text-blue-600 font-medium' : 'bg-gray-100'}`}
          >
            Todas
          </button>
          <button
            onClick={() => setActiveTab('despesas')}
            className={`px-4 py-2 mr-2 rounded-t-md ${activeTab === 'despesas' ? 'bg-white text-blue-600 font-medium' : 'bg-gray-100'}`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('receitas')}
            className={`px-4 py-2 mr-2 rounded-t-md ${activeTab === 'receitas' ? 'bg-white text-blue-600 font-medium' : 'bg-gray-100'}`}
          >
            Receitas
          </button>
        </div>
        
        <div className="flex items-center">
          <input
            type="text"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="relative">
            <button
              onClick={() => {/* Implementar busca avançada */}}
              className="px-3 py-2 bg-blue-600 text-white rounded-r-md hover:bg-blue-700"
            >
              <FaSearch />
            </button>
          </div>
          
          <button
            onClick={() => openModal()}
            className="ml-4 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center"
          >
            <FaPlus className="mr-2" /> Nova Transação
          </button>
        </div>
      </div>
      
      {/* Lista de transações */}
      {['todas', 'despesas', 'receitas'].includes(activeTab) && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          {renderTransacoes()}
        </div>
      )}
      
      {/* Modal para adicionar/editar transação */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {currentTransacao ? 'Editar Transação' : 'Nova Transação'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <input
                  type="text"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Valor (R$)</label>
                <input
                  type="number"
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  step="0.01"
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  required
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                <select
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  <option value="material">Material</option>
                  <option value="mao_de_obra">Mão de Obra</option>
                  <option value="servico">Serviço</option>
                  <option value="equipamento">Equipamento</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex items-center space-x-4">
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="tipo"
                      value="despesa"
                      checked={formData.tipo === 'despesa'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Despesa</span>
                  </label>
                  <label className="inline-flex items-center">
                    <input
                      type="radio"
                      name="tipo"
                      value="receita"
                      checked={formData.tipo === 'receita'}
                      onChange={handleChange}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                    />
                    <span className="ml-2 text-gray-700">Receita</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status_pagamento"
                  value={formData.status_pagamento}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">Obra (opcional)</label>
                <select
                  name="obra_id"
                  value={formData.obra_id}
                  onChange={handleChange}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Selecione...</option>
                  {obras.map(obra => (
                    <option key={obra.id} value={obra.id}>{obra.nome}</option>
                  ))}
                </select>
              </div>
              
              <div className="flex justify-end mt-6 space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Financeiro; 