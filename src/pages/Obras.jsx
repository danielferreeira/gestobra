import React, { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaBuilding, FaFilter, FaSort, FaThList, FaTh, FaCalendarAlt, FaMoneyBillWave, FaMapMarkerAlt, FaTools, FaCheckCircle, FaHourglass } from 'react-icons/fa';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';
import { useAuth } from '../context/AuthContext';

const Obras = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [obras, setObras] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentObra, setCurrentObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    orcamento: '',
    data_inicio: '',
    data_previsao_termino: '',
    status: 'planejada',
    descricao: '',
    area_construida: '',
    responsavel: '',
    cliente: ''
  });
  
  // Novos estados para filtros e visualização
  const [statusFilter, setStatusFilter] = useState('todas');
  const [sortBy, setSortBy] = useState('data_inicio');
  const [sortOrder, setSortOrder] = useState('desc');
  const [viewMode, setViewMode] = useState('cards'); // 'table' ou 'cards'

  // Carregar obras do Supabase
  useEffect(() => {
    const fetchObras = async () => {
      try {
        setLoading(true);
        
        let query = supabase
          .from('obras')
          .select('*');
        
        // Aplicar ordenação
        query = query.order(sortBy, { ascending: sortOrder === 'asc' });
        
        const { data, error } = await query;
        
        if (error) {
          throw error;
        }
        
        setObras(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar obras:', error);
        setError(error.message || 'Erro ao carregar obras');
        setLoading(false);
      }
    };
    
    fetchObras();
  }, [sortBy, sortOrder]);

  // Filtrar obras com base no termo de pesquisa e filtro de status
  const filteredObras = obras.filter(obra => {
    const matchesSearch = 
      obra.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.endereco?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      obra.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'todas' || obra.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'Não definida';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  // Traduzir status
  const getStatusInfo = (status) => {
    const statusMap = {
      'planejada': { 
        label: 'Planejada', 
        color: 'bg-yellow-100 text-yellow-800 border-yellow-200',
        icon: <FaHourglass className="mr-1" />
      },
      'em_andamento': { 
        label: 'Em andamento', 
        color: 'bg-blue-100 text-blue-800 border-blue-200',
        icon: <FaTools className="mr-1" />
      },
      'concluida': { 
        label: 'Concluída', 
        color: 'bg-green-100 text-green-800 border-green-200',
        icon: <FaCheckCircle className="mr-1" />
      },
      'pausada': { 
        label: 'Pausada', 
        color: 'bg-red-100 text-red-800 border-red-200',
        icon: <FaTools className="mr-1" />
      }
    };
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800 border-gray-200', icon: null };
  };

  // Abrir modal para adicionar/editar obra
  const openModal = (obra = null) => {
    setCurrentObra(obra);
    if (obra) {
      setFormData({
        nome: obra.nome || '',
        endereco: obra.endereco || '',
        orcamento: obra.orcamento || '',
        data_inicio: obra.data_inicio || '',
        data_previsao_termino: obra.data_previsao_termino || '',
        status: obra.status || 'planejada',
        descricao: obra.descricao || '',
        area_construida: obra.area_construida || '',
        responsavel: obra.responsavel || '',
        cliente: obra.cliente || ''
      });
    } else {
      setFormData({
        nome: '',
        endereco: '',
        orcamento: '',
        data_inicio: '',
        data_previsao_termino: '',
        status: 'planejada',
        descricao: '',
        area_construida: '',
        responsavel: '',
        cliente: ''
      });
    }
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentObra(null);
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar obra
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Verificar se o usuário está autenticado
      if (!user) {
        throw new Error('Usuário não autenticado. Faça login novamente.');
      }
      
      const obraData = {
        ...formData,
        orcamento: formData.orcamento === '' ? null : parseFloat(formData.orcamento || 0),
        area_construida: formData.area_construida === '' ? null : parseFloat(formData.area_construida || 0),
        progresso: currentObra?.progresso || 0
      };
      
      let result;
      
      if (currentObra) {
        // Atualizar obra existente
        result = await supabase
          .from('obras')
          .update(obraData)
          .eq('id', currentObra.id);
      } else {
        // Adicionar nova obra - incluir user_id para satisfazer a política RLS
        result = await supabase
          .from('obras')
          .insert([{
            ...obraData,
            user_id: user.id
          }]);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Atualizar lista de obras
      const { data: updatedObras } = await supabase
        .from('obras')
        .select('*')
        .order(sortBy, { ascending: sortOrder === 'asc' });
      
      setObras(updatedObras || []);
      
      closeModal();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar obra:', error);
      setError(error.message || 'Erro ao salvar obra');
      setLoading(false);
    }
  };

  // Excluir obra
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir esta obra?')) {
      try {
        setLoading(true);
        
        const { error } = await supabase
          .from('obras')
          .delete()
          .eq('id', id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar lista de obras
        setObras(obras.filter(obra => obra.id !== id));
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao excluir obra:', error);
        setError(error.message || 'Erro ao excluir obra');
        setLoading(false);
      }
    }
  };

  // Navegar para a página de detalhes da obra
  const navigateToDetalheObra = (id) => {
    navigate(`/obras/${id}`);
  };

  // Alternar ordenação
  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading && obras.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Obras</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" /> Nova Obra
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        {/* Barra de pesquisa e filtros */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
              placeholder="Buscar obras..."
              className="pl-10 pr-4 py-2 border rounded-md w-full"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

          <div className="flex items-center">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FaFilter className="text-gray-400" />
              </div>
              <select
                className="pl-10 pr-4 py-2 border rounded-md w-full appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="todas">Todos os status</option>
                <option value="planejada">Planejada</option>
                <option value="em_andamento">Em andamento</option>
                <option value="concluida">Concluída</option>
                <option value="pausada">Pausada</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-md ${viewMode === 'table' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="Visualização em tabela"
            >
              <FaThList />
            </button>
            <button
              onClick={() => setViewMode('cards')}
              className={`p-2 rounded-md ${viewMode === 'cards' ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
              title="Visualização em cards"
            >
              <FaTh />
            </button>
          </div>
        </div>

        {loading && obras.length > 0 ? (
          <div className="flex justify-center p-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          </div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
            {error}
          </div>
        ) : filteredObras.length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            {searchTerm || statusFilter !== 'todas' ? 'Nenhuma obra encontrada com esses filtros.' : 'Nenhuma obra cadastrada.'}
          </div>
        ) : viewMode === 'table' ? (
          // Visualização em tabela
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('nome')}
                  >
                    <div className="flex items-center">
                      Nome
                      {sortBy === 'nome' && (
                        <FaSort className={`ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Endereço
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('orcamento')}
                  >
                    <div className="flex items-center">
                      Orçamento
                      {sortBy === 'orcamento' && (
                        <FaSort className={`ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('data_inicio')}
                  >
                    <div className="flex items-center">
                      Data de Início
                      {sortBy === 'data_inicio' && (
                        <FaSort className={`ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('status')}
                  >
                    <div className="flex items-center">
                      Status
                      {sortBy === 'status' && (
                        <FaSort className={`ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                    onClick={() => toggleSort('progresso')}
                  >
                    <div className="flex items-center">
                      Progresso
                      {sortBy === 'progresso' && (
                        <FaSort className={`ml-1 ${sortOrder === 'asc' ? 'transform rotate-180' : ''}`} />
                      )}
                    </div>
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredObras.map((obra) => {
                  const statusInfo = getStatusInfo(obra.status);
              return (
                    <tr key={obra.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-500">
                            <FaBuilding />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{obra.nome}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{obra.endereco}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{formatCurrency(obra.orcamento)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-500">{formatDate(obra.data_inicio)}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                          {statusInfo.icon} {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div 
                              style={{ width: `${obra.progresso || 0}%` }} 
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                obra.status === 'concluida' ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                            ></div>
                          </div>
                          <span className="text-xs font-semibold inline-block text-gray-600 mt-1">
                            {obra.progresso || 0}%
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <div className="flex justify-end space-x-2">
                          <button
                            onClick={() => navigateToDetalheObra(obra.id)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Ver detalhes"
                          >
                            <FaEye />
                          </button>
                        <button
                          onClick={() => openModal(obra)}
                            className="text-yellow-600 hover:text-yellow-900"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(obra.id)}
                            className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          // Visualização em cards
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredObras.map((obra) => {
              const statusInfo = getStatusInfo(obra.status);
              return (
                <div key={obra.id} className="bg-white border rounded-lg shadow-sm hover:shadow-md transition-shadow">
                  <div className="p-5 border-b">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-gray-900">{obra.nome}</h3>
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                        {statusInfo.icon} {statusInfo.label}
                      </span>
                    </div>
                  </div>
                  <div className="p-5 space-y-3">
                    <div className="flex items-start">
                      <FaMapMarkerAlt className="text-gray-400 mt-1 mr-2" />
                      <span className="text-sm text-gray-600">{obra.endereco || 'Endereço não informado'}</span>
                    </div>
                    <div className="flex items-start">
                      <FaCalendarAlt className="text-gray-400 mt-1 mr-2" />
                      <div>
                        <p className="text-sm text-gray-600">Início: {formatDate(obra.data_inicio)}</p>
                        {obra.data_previsao_termino && (
                          <p className="text-sm text-gray-600">Término: {formatDate(obra.data_previsao_termino)}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-start">
                      <FaMoneyBillWave className="text-gray-400 mt-1 mr-2" />
                      <span className="text-sm font-medium text-gray-900">{formatCurrency(obra.orcamento)}</span>
                    </div>
                    <div className="pt-2">
                      <div className="flex justify-between mb-1">
                        <span className="text-xs font-semibold inline-block text-gray-600">Progresso</span>
                        <span className="text-xs font-semibold inline-block text-gray-600">{obra.progresso || 0}%</span>
                      </div>
                      <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                        <div 
                          style={{ width: `${obra.progresso || 0}%` }} 
                          className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                            obra.status === 'concluida' ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                            ></div>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 border-t flex justify-between">
                    <button
                      onClick={() => navigateToDetalheObra(obra.id)}
                      className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                    >
                      Ver detalhes
                    </button>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(obra)}
                        className="text-yellow-600 hover:text-yellow-900"
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(obra.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal para adicionar/editar obra */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold">{currentObra ? 'Editar Obra' : 'Nova Obra'}</h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nome da Obra</label>
                <input
                      type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                      className="w-full p-2 border rounded-md"
                  required
                />
              </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Endereço</label>
                <input
                      type="text"
                  name="endereco"
                  value={formData.endereco}
                  onChange={handleChange}
                      className="w-full p-2 border rounded-md"
                  required
                />
              </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orçamento (R$)</label>
                <input
                      type="number"
                  name="orcamento"
                      value={formData.orcamento}
                      onChange={handleChange}
                      className="w-full p-2 border rounded-md"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Início</label>
                <input
                      type="date"
                  name="data_inicio"
                  value={formData.data_inicio}
                  onChange={handleChange}
                      className="w-full p-2 border rounded-md"
                  required
                />
              </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Data de Término (Prevista)</label>
                    <input
                      type="date"
                      name="data_previsao_termino"
                      value={formData.data_previsao_termino}
                      onChange={handleChange}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="planejada">Planejada</option>
                  <option value="em_andamento">Em andamento</option>
                    <option value="concluida">Concluída</option>
                  <option value="pausada">Pausada</option>
                </select>
              </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
                <textarea
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                    className="w-full p-2 border rounded-md"
                    rows="3"
                ></textarea>
                </div>
              </div>
              <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border rounded-md text-gray-700 hover:bg-gray-100"
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

export default Obras; 