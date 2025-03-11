import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaMoneyBillWave, FaArrowUp, FaArrowDown } from 'react-icons/fa';
import { getDespesas, createDespesa, updateDespesa, deleteDespesa } from '../services/despesasService';

const Financeiro = () => {
  const [transacoes, setTransacoes] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentTransacao, setCurrentTransacao] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('todas'); // 'todas', 'despesas', 'receitas'
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: '',
    categoria: '',
    obra_id: '',
    tipo: 'despesa', // 'despesa' ou 'receita'
    status: 'pendente', // 'pendente', 'pago', 'recebido'
    observacao: ''
  });

  // Carregar transações do Supabase
  useEffect(() => {
    const fetchTransacoes = async () => {
      try {
        setLoading(true);
        const { data, error } = await getDespesas();
        
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

  // Filtrar transações com base no termo de pesquisa e na aba ativa
  const filteredTransacoes = transacoes.filter(transacao => {
    const matchesSearch = 
      transacao.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
      transacao.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeTab === 'todas') return matchesSearch;
    if (activeTab === 'despesas') return matchesSearch && transacao.tipo === 'despesa';
    if (activeTab === 'receitas') return matchesSearch && transacao.tipo === 'receita';
    
    return matchesSearch;
  });

  // Calcular totais
  const calcularTotais = () => {
    const totalDespesas = transacoes
      .filter(t => t.tipo === 'despesa')
      .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    
    const totalReceitas = transacoes
      .filter(t => t.tipo === 'receita')
      .reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
    
    return {
      totalDespesas,
      totalReceitas,
      saldo: totalReceitas - totalDespesas
    };
  };

  const { totalDespesas, totalReceitas, saldo } = calcularTotais();

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
        status: transacao.status,
        observacao: transacao.observacao || ''
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
        status: 'pendente',
        observacao: ''
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
      
      const transacaoData = {
        ...formData,
        valor: parseFloat(formData.valor) || 0
      };
      
      let result;
      
      if (currentTransacao) {
        // Atualizar transação existente
        result = await updateDespesa(currentTransacao.id, transacaoData);
      } else {
        // Adicionar nova transação
        result = await createDespesa(transacaoData);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Atualizar lista de transações
      const { data: updatedTransacoes } = await getDespesas();
      setTransacoes(updatedTransacoes || []);
      
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
    if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
      try {
        setLoading(true);
        
        const { error } = await deleteDespesa(id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar lista de transações
        setTransacoes(transacoes.filter(transacao => transacao.id !== id));
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao excluir transação:', error);
        setError(error.message || 'Erro ao excluir transação');
        setLoading(false);
      }
    }
  };

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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Total de Despesas</h3>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDespesas)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Total de Receitas</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalReceitas)}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-700 mb-2">Saldo</h3>
          <p className={`text-2xl font-bold ${saldo >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(saldo)}
          </p>
        </div>
      </div>

      {/* Abas e barra de pesquisa */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('todas')}
            className={`px-4 py-2 rounded-md ${
              activeTab === 'todas'
                ? 'bg-blue-500 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todas
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
        </div>
        
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
      </div>

      {/* Lista de Transações */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredTransacoes.length > 0 ? (
            filteredTransacoes.map((transacao) => {
              const transacaoColor = getTransacaoColor(transacao.tipo);
              const transacaoIcon = getTransacaoIcon(transacao.tipo);
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
                          Status: {getStatusText(transacao.status, transacao.tipo)}
                        </p>
                      </div>
                      <div className="mt-2 flex items-center text-sm sm:mt-0">
                        <p className={`font-medium text-${transacaoColor}-600`}>
                          {transacao.tipo === 'despesa' ? '-' : '+'} {formatCurrency(transacao.valor)}
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
                    <label htmlFor="status" className="block text-sm font-medium text-gray-700">Status</label>
                    <select
                      id="status"
                      name="status"
                      value={formData.status}
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
                  <label htmlFor="obra_id" className="block text-sm font-medium text-gray-700">ID da Obra (opcional)</label>
                  <input
                    type="text"
                    id="obra_id"
                    name="obra_id"
                    value={formData.obra_id}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="observacao" className="block text-sm font-medium text-gray-700">Observação</label>
                  <textarea
                    id="observacao"
                    name="observacao"
                    value={formData.observacao}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
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