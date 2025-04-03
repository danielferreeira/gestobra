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
  getRelatorioCustosPorObra
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
  const calcularTotais = () => {
    // Verificar se há transações para evitar erros
    if (!transacoes || transacoes.length === 0) {
      return {
        totalDespesas: 0,
        totalReceitas: 0,
        saldo: 0
      };
    }

    try {
      // Calcular total de despesas com validação de tipo e valor
      const totalDespesas = transacoes
        .filter(t => t.tipo === 'despesa')
        .reduce((acc, curr) => {
          // Garantir que o valor seja um número válido
          const valor = typeof curr.valor === 'string' 
            ? parseFloat(curr.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
            : parseFloat(curr.valor || 0);
          
          return isNaN(valor) ? acc : acc + valor;
        }, 0);
      
      // Calcular total de receitas com validação de tipo e valor
      const totalReceitas = transacoes
        .filter(t => t.tipo === 'receita')
        .reduce((acc, curr) => {
          // Garantir que o valor seja um número válido
          const valor = typeof curr.valor === 'string' 
            ? parseFloat(curr.valor.replace(/[^\d.,]/g, '').replace(',', '.')) 
            : parseFloat(curr.valor || 0);
          
          return isNaN(valor) ? acc : acc + valor;
        }, 0);
      
      // Verificar se há transações sem tipo definido (legado)
      const transacoesSemTipo = transacoes.filter(t => !t.tipo);
      
      if (transacoesSemTipo.length > 0) {
        console.warn('Existem transações sem tipo definido:', transacoesSemTipo.length);
        
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
              : parseFloat(curr.valor || 0);
            
            return isNaN(valor) ? acc : acc + valor;
          }, 0);
        
        // Adicionar ao total de despesas
        return {
          totalDespesas: totalDespesas + despesasSemTipo,
          totalReceitas,
          saldo: totalReceitas - (totalDespesas + despesasSemTipo)
        };
      }
      
      return {
        totalDespesas,
        totalReceitas,
        saldo: totalReceitas - totalDespesas
      };
    } catch (error) {
      console.error('Erro ao calcular totais:', error);
      return {
        totalDespesas: 0,
        totalReceitas: 0,
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
        : parseFloat(formData.valor || 0);
      
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
      
      // Atualizar lista de transações
      const { data: updatedData } = await getTransacoes();
      setTransacoes(updatedData || []);
      
      // Recalcular totais explicitamente
      setTotaisCalculados(calcularTotais());
      
      closeModal();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar transação:', error);
      setError(error.message || 'Erro ao salvar transação');
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
      setTotaisCalculados(calcularTotais());
      
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

  if (loading && transacoes.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestão Financeira</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          disabled={loading}
        >
          <FaPlus className="mr-2" /> Nova Transação
        </button>
      </div>

      {/* Resumo financeiro */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border-l-4 border-red-500">
          <h2 className="text-gray-500 text-sm font-medium">Total de Despesas</h2>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-semibold text-red-600">
              {formatCurrency(totalDespesas)}
            </p>
            <p className="flex items-center text-sm text-gray-500">
              {filteredTransacoes.filter(t => t.tipo === 'despesa').length} lançamentos
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4 border-l-4 border-green-500">
          <h2 className="text-gray-500 text-sm font-medium">Total de Receitas</h2>
          <div className="mt-1 flex items-baseline justify-between">
            <p className="text-2xl font-semibold text-green-600">
              {formatCurrency(totalReceitas)}
            </p>
            <p className="flex items-center text-sm text-gray-500">
              {filteredTransacoes.filter(t => t.tipo === 'receita').length} lançamentos
            </p>
          </div>
        </div>
        
        <div className="bg-white shadow rounded-lg p-4 border-l-4 border-blue-500">
          <h2 className="text-gray-500 text-sm font-medium">Saldo</h2>
          <div className="mt-1 flex items-baseline justify-between">
            <p className={`text-2xl font-semibold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(saldo)}
            </p>
            <p className="flex items-center text-sm text-gray-500">
              {filteredTransacoes.length} lançamentos totais
            </p>
          </div>
        </div>
      </div>

      {/* Abas e barra de pesquisa */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex flex-wrap space-x-2 space-y-2 md:space-y-0">
          <button
            onClick={() => setActiveTab('todas')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'todas'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas Transações
          </button>
          <button
            onClick={() => setActiveTab('despesas')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'despesas'
                ? 'bg-red-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Despesas
          </button>
          <button
            onClick={() => setActiveTab('receitas')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'receitas'
                ? 'bg-green-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Receitas
          </button>
          <button
            onClick={() => setActiveTab('fluxoCaixa')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'fluxoCaixa'
                ? 'bg-purple-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FaChartBar className="inline mr-1" />
            Fluxo de Caixa
          </button>
          <button
            onClick={() => setActiveTab('pendentes')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'pendentes'
                ? 'bg-yellow-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FaFileInvoice className="inline mr-1" />
            Contas
          </button>
          <button
            onClick={() => setActiveTab('relatorios')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'relatorios'
                ? 'bg-blue-700 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            <FaTable className="inline mr-1" />
            Relatórios
          </button>
        </div>
        
        {['todas', 'despesas', 'receitas'].includes(activeTab) && (
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Buscar transações..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        )}
        
        {/* Filtro de obras */}
        {['todas', 'despesas', 'receitas'].includes(activeTab) && (
          <div className="relative w-full md:w-64 mt-2 md:mt-0 md:ml-2">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <FaBuilding className="text-gray-400" />
      </div>
            <select
              className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              value={filtroObra}
              onChange={(e) => setFiltroObra(e.target.value)}
            >
              <option value="todas">Todas as obras</option>
              {obras.map(obra => (
                <option key={obra.id} value={obra.id}>
                  {obra.nome}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {(activeTab === 'fluxoCaixa' || (activeTab === 'relatorios' && ['fluxoCaixa', 'porCategoria'].includes(activeRelatorio))) && (
          <div className="flex space-x-2">
            <div>
              <label htmlFor="dataInicio" className="sr-only">Data Início</label>
              <input
                type="date"
                id="dataInicio"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filtroData.dataInicio}
                onChange={(e) => setFiltroData(prev => ({ ...prev, dataInicio: e.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="dataFim" className="sr-only">Data Fim</label>
              <input
                type="date"
                id="dataFim"
                className="block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={filtroData.dataFim}
                onChange={(e) => setFiltroData(prev => ({ ...prev, dataFim: e.target.value }))}
              />
            </div>
          </div>
        )}
      </div>

      {/* Sub-navegação para Relatórios */}
      {activeTab === 'relatorios' && (
        <div className="bg-gray-100 p-3 rounded-lg mb-4">
          <div className="flex space-x-4">
            <button
              onClick={() => setActiveRelatorio('fluxoCaixa')}
              className={`px-3 py-1 rounded ${
                activeRelatorio === 'fluxoCaixa'
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaChartBar className="inline mr-1" />
              Fluxo de Caixa
            </button>
            <button
              onClick={() => setActiveRelatorio('porCategoria')}
              className={`px-3 py-1 rounded ${
                activeRelatorio === 'porCategoria'
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaTable className="inline mr-1" />
              Por Categoria
            </button>
            <button
              onClick={() => setActiveRelatorio('custosPorObra')}
              className={`px-3 py-1 rounded ${
                activeRelatorio === 'custosPorObra'
                  ? 'bg-blue-700 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-200'
              }`}
            >
              <FaBuilding className="inline mr-1" />
              Custos por Obra
            </button>
          </div>
        </div>
      )}

      {/* Conteúdo principal com condicionais para cada aba */}
      {/* Mostrar Lista de Transações apenas nas abas relevantes */}
      {['todas', 'despesas', 'receitas'].includes(activeTab) && (
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTransacoes.length > 0 ? (
            filteredTransacoes.map((transacao) => {
              // Verificar se o tipo está definido, caso contrário, inferir pelo contexto (categoria, descrição)
              let tipo = transacao.tipo || 'despesa';
              
              // Se a descrição contém palavras-chave de compra/pagamento, é provavelmente uma despesa
              if (transacao.descricao && 
                  (transacao.descricao.toLowerCase().includes('compra') || 
                   transacao.descricao.toLowerCase().includes('pagamento'))) {
                tipo = 'despesa';
              }
              
              // Se a descrição contém palavras-chave de venda/recebimento, é provavelmente uma receita
              if (transacao.descricao && 
                  (transacao.descricao.toLowerCase().includes('venda') || 
                   transacao.descricao.toLowerCase().includes('recebimento'))) {
                tipo = 'receita';
              }
              
              const transacaoColor = getTransacaoColor(tipo);
              const transacaoIcon = getTransacaoIcon(tipo);
              
              return (
                <li key={transacao.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className={`bg-${transacaoColor}-100 p-2 rounded-full`}>
                            <span className={`text-${transacaoColor}-600`}>{transacaoIcon}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{transacao.descricao}</h3>
                          <p className="text-sm text-gray-500">Categoria: {transacao.categoria}</p>
                          <p className="text-sm text-gray-500">Tipo: {tipo === 'despesa' ? 'Despesa' : 'Receita'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openModal(transacao)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                          disabled={loading}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(transacao.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Excluir"
                          disabled={loading}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Data: {formatDate(transacao.data)}
                        </p>
                        <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            Status: {getStatusText(transacao.status_pagamento, tipo)}
                        </p>
                          {transacao.obra_id && transacao.obras && (
                            <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                              <FaBuilding className="mr-1" /> Obra: {transacao.obras.nome}
                            </p>
                          )}
                      </div>
                      <div className="mt-2 flex items-center text-sm sm:mt-0">
                        <p className={`font-medium text-${transacaoColor}-600`}>
                          {tipo === 'despesa' ? '-' : '+'} {formatCurrency(transacao.valor)}
                        </p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-4 py-5 text-center text-gray-500">
              {searchTerm ? 'Nenhuma transação encontrada com os termos de busca.' : 'Nenhuma transação cadastrada.'}
            </li>
          )}
        </ul>
      </div>
      )}

      {/* Fluxo de Caixa */}
      {activeTab === 'fluxoCaixa' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Fluxo de Caixa</h3>
          
          {loading ? (
            <div className="py-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando fluxo de caixa...</p>
            </div>
          ) : relatorios.fluxoCaixa && relatorios.fluxoCaixa.length > 0 ? (
            <div>
              {/* Gráfico resumo */}
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <div className="flex justify-between items-center mb-2">
                  <div>
                    <h4 className="font-medium">Resumo</h4>
                    <p className="text-sm text-gray-500">
                      {formatDate(filtroData.dataInicio)} até {formatDate(filtroData.dataFim)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Saldo Final</p>
                    <p className={`text-lg font-bold ${relatorios.fluxoCaixa[relatorios.fluxoCaixa.length - 1]?.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(relatorios.fluxoCaixa[relatorios.fluxoCaixa.length - 1]?.saldoAcumulado || 0)}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Tabela de fluxo diário */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Data
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Entradas
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saídas
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo do Dia
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Saldo Acumulado
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {relatorios.fluxoCaixa.map((dia, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatDate(dia.data)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                          {formatCurrency(dia.entradas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                          {formatCurrency(dia.saidas)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={dia.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(dia.saldo)}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <span className={dia.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(dia.saldoAcumulado)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <p className="py-4 text-center text-gray-500">
              Nenhuma transação encontrada no período selecionado.
            </p>
          )}
        </div>
      )}

      {/* Contas Pendentes */}
      {activeTab === 'pendentes' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Contas Pendentes</h3>
          
          {loading ? (
            <div className="py-4 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
              <p className="mt-2 text-gray-500">Carregando contas pendentes...</p>
            </div>
          ) : relatorios.contasPendentes ? (
            <div>
              {/* Resumo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-red-50 p-4 rounded-md">
                  <h4 className="font-medium text-red-700 mb-2">Contas a Pagar</h4>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(relatorios.contasPendentes.totalPagar)}</p>
                  <p className="text-sm text-gray-500 mt-1">{relatorios.contasPendentes.contasPagar.length} transações pendentes</p>
                </div>
                <div className="bg-green-50 p-4 rounded-md">
                  <h4 className="font-medium text-green-700 mb-2">Contas a Receber</h4>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(relatorios.contasPendentes.totalReceber)}</p>
                  <p className="text-sm text-gray-500 mt-1">{relatorios.contasPendentes.contasReceber.length} transações pendentes</p>
                </div>
              </div>
              
              {/* Lista de Contas a Pagar */}
              {relatorios.contasPendentes.contasPagar.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-gray-700 mb-2">Contas a Pagar</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatorios.contasPendentes.contasPagar.map((conta) => (
                          <tr key={conta.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {conta.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {formatCurrency(conta.valor)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(conta.data)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {conta.categoria}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => openModal(conta)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              
              {/* Lista de Contas a Receber */}
              {relatorios.contasPendentes.contasReceber.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Contas a Receber</h4>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Descrição
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Valor
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Categoria
                          </th>
                          <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Ações
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatorios.contasPendentes.contasReceber.map((conta) => (
                          <tr key={conta.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {conta.descricao}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {formatCurrency(conta.valor)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatDate(conta.data)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {conta.categoria}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => openModal(conta)}
                                className="text-blue-600 hover:text-blue-900 mr-3"
                              >
                                Editar
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="py-4 text-center text-gray-500">
              Nenhuma conta pendente encontrada.
            </p>
          )}
        </div>
      )}

      {/* Relatórios */}
      {activeTab === 'relatorios' && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md p-4">
          {/* Relatório por Categoria */}
          {activeRelatorio === 'porCategoria' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatório por Categoria</h3>
              
              {loading ? (
                <div className="py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando relatório...</p>
                </div>
              ) : relatorios.porCategoria ? (
                <div>
                  {/* Resumo */}
                  <div className="bg-gray-50 p-4 rounded-md mb-4">
                    <div className="flex flex-col md:flex-row md:justify-between">
                      <div className="mb-4 md:mb-0">
                        <h4 className="font-medium">Resumo por Categorias</h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(filtroData.dataInicio)} até {formatDate(filtroData.dataFim)}
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row md:space-x-6">
                        <div className="mb-2 md:mb-0">
                          <p className="text-sm text-gray-500">Total Receitas</p>
                          <p className="text-lg font-bold text-green-600">
                            {formatCurrency(relatorios.porCategoria.totais.receitas)}
                          </p>
                        </div>
                        <div className="mb-2 md:mb-0">
                          <p className="text-sm text-gray-500">Total Despesas</p>
                          <p className="text-lg font-bold text-red-600">
                            {formatCurrency(relatorios.porCategoria.totais.despesas)}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-500">Saldo</p>
                          <p className={`text-lg font-bold ${relatorios.porCategoria.totais.saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(relatorios.porCategoria.totais.saldo)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabela de categorias */}
                  {relatorios.porCategoria.categorias.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Categoria
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Receitas
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Despesas
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Saldo
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {relatorios.porCategoria.categorias.map((categoria, index) => (
                            <tr key={index}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {categoria.categoria}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                {formatCurrency(categoria.receitas)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                {formatCurrency(categoria.despesas)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={categoria.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(categoria.saldo)}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-gray-500">
                      Nenhuma transação encontrada no período selecionado.
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  Nenhum dado disponível para o relatório.
                </p>
              )}
            </div>
          )}
          
          {/* Relatório de Custos por Obra */}
          {activeRelatorio === 'custosPorObra' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatório de Custos por Obra</h3>
              
              {loading ? (
                <div className="py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando relatório...</p>
                </div>
              ) : relatorios.custosPorObra ? (
                <div>
                  {/* Tabela de obras */}
                  {relatorios.custosPorObra.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Obra
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Orçamento
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Gastos Reais
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Saldo
                            </th>
                            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              % do Orçamento
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {relatorios.custosPorObra.map((obra) => (
                            <tr key={obra.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {obra.nome}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-medium">
                                {formatCurrency(obra.orcamento)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                                {formatCurrency(obra.gastosReais)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <span className={obra.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                                  {formatCurrency(obra.saldo)}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <div className="flex items-center">
                                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                                    <div 
                                      className={`h-2.5 rounded-full ${
                                        obra.percentualGasto > 100 
                                          ? 'bg-red-600' 
                                          : obra.percentualGasto > 80 
                                            ? 'bg-yellow-500' 
                                            : 'bg-green-600'
                                      }`}
                                      style={{ width: `${Math.min(100, obra.percentualGasto)}%` }}
                                    ></div>
                                  </div>
                                  <span className="ml-2 text-xs">
                                    {obra.percentualGasto.toFixed(1)}%
                                  </span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="py-4 text-center text-gray-500">
                      Nenhuma obra encontrada com dados financeiros.
                    </p>
                  )}
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  Nenhum dado disponível para o relatório.
                </p>
              )}
            </div>
          )}
          
          {/* Relatório de Fluxo de Caixa */}
          {activeRelatorio === 'fluxoCaixa' && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Relatório de Fluxo de Caixa</h3>
              
              {loading ? (
                <div className="py-4 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando relatório...</p>
                </div>
              ) : relatorios.fluxoCaixa && relatorios.fluxoCaixa.length > 0 ? (
                <div>
                  {/* Resumo */}
                  <div className="bg-gray-50 p-4 rounded-md mb-4">
                    <div className="flex justify-between items-center mb-2">
                      <div>
                        <h4 className="font-medium">Resumo do Fluxo de Caixa</h4>
                        <p className="text-sm text-gray-500">
                          {formatDate(filtroData.dataInicio)} até {formatDate(filtroData.dataFim)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">Saldo Final do Período</p>
                        <p className={`text-lg font-bold ${relatorios.fluxoCaixa[relatorios.fluxoCaixa.length - 1]?.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(relatorios.fluxoCaixa[relatorios.fluxoCaixa.length - 1]?.saldoAcumulado || 0)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                      <div className="p-3 bg-green-50 rounded-md">
                        <p className="text-sm text-gray-500">Total de Entradas</p>
                        <p className="text-lg font-bold text-green-600">
                          {formatCurrency(relatorios.fluxoCaixa.reduce((total, dia) => total + dia.entradas, 0))}
                        </p>
                      </div>
                      <div className="p-3 bg-red-50 rounded-md">
                        <p className="text-sm text-gray-500">Total de Saídas</p>
                        <p className="text-lg font-bold text-red-600">
                          {formatCurrency(relatorios.fluxoCaixa.reduce((total, dia) => total + dia.saidas, 0))}
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-md">
                        <p className="text-sm text-gray-500">Saldo do Período</p>
                        <p className={`text-lg font-bold ${
                          relatorios.fluxoCaixa.reduce((total, dia) => total + dia.saldo, 0) >= 0 
                          ? 'text-green-600' 
                          : 'text-red-600'
                        }`}>
                          {formatCurrency(relatorios.fluxoCaixa.reduce((total, dia) => total + dia.saldo, 0))}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Tabela de fluxo */}
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Data
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Entradas
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Saídas
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Saldo do Dia
                          </th>
                          <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Saldo Acumulado
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {relatorios.fluxoCaixa.map((dia, index) => (
                          <tr key={index}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {formatDate(dia.data)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                              {formatCurrency(dia.entradas)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                              {formatCurrency(dia.saidas)}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={dia.saldo >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(dia.saldo)}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <span className={dia.saldoAcumulado >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {formatCurrency(dia.saldoAcumulado)}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <p className="py-4 text-center text-gray-500">
                  Nenhuma transação encontrada no período selecionado.
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal para adicionar/editar transação */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentTransacao ? 'Editar Transação' : 'Adicionar Transação'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                  <input
                    type="text"
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="tipo" className="block text-sm font-medium text-gray-700">Tipo</label>
                    <select
                      id="tipo"
                      name="tipo"
                      value={formData.tipo}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="despesa">Despesa</option>
                      <option value="receita">Receita</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="valor" className="block text-sm font-medium text-gray-700">Valor (R$)</label>
                    <input
                      type="number"
                      id="valor"
                      name="valor"
                      value={formData.valor}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="data" className="block text-sm font-medium text-gray-700">Data</label>
                    <input
                      type="date"
                      id="data"
                      name="data"
                      value={formData.data}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="status_pagamento" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      id="status_pagamento"
                      name="status_pagamento"
                      value={formData.status_pagamento}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="pendente">Pendente</option>
                      <option value={formData.tipo === 'despesa' ? 'pago' : 'recebido'}>
                        {formData.tipo === 'despesa' ? 'Pago' : 'Recebido'}
                      </option>
                    </select>
                  </div>
                </div>
                
                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoria</label>
                  <input
                    type="text"
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="obra_id" className="block text-sm font-medium text-gray-700">
                    {formData.tipo === 'despesa' ? 'Vincular à Obra (Obrigatório)' : 'Vincular à Obra (Opcional)'}
                  </label>
                  <select
                    id="obra_id"
                    name="obra_id"
                    value={formData.obra_id || ""}
                    onChange={handleChange}
                    required={formData.tipo === 'despesa'}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="">Selecionar obra...</option>
                    {obras.map(obra => (
                      <option key={obra.id} value={obra.id}>
                        {obra.nome}
                      </option>
                    ))}
                  </select>
                  {formData.tipo === 'despesa' && (
                    <p className="mt-1 text-sm text-gray-500">
                      <FaBuilding className="inline mr-1" /> Importante: Toda despesa deve estar vinculada a uma obra para controle financeiro.
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  disabled={loading}
                >
                  Cancelar
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