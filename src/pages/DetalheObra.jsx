import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaEdit, FaTrash, FaBuilding, FaCalendarAlt, 
  FaMoneyBillWave, FaUser, FaExclamationTriangle, FaBolt, FaSpinner, FaBoxes
} from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import DetalhesObra from '../components/DetalhesObra';
import EtapasObra from '../components/EtapasObra';
import DocumentosObra from '../components/DocumentosObra';
import CronogramaObra from '../components/CronogramaObra';
import OrcamentoObra from '../components/OrcamentoObra';
import QuantitativoMateriais from '../components/QuantitativoMateriais';
import { calcularTotalPrevisto, calcularTotalRealizado, calcularProgressoGeral, getEtapasByObraId } from '../services/etapasService';
import { getDespesasByObraId } from '../services/despesasService';

const DetalheObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState(null);
  const [etapas, setEtapas] = useState([]);
  const [valorPrevistoTotal, setValorPrevistoTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [formData, setFormData] = useState({
    nome: '',
    endereco: '',
    orcamento: '',
    data_inicio: '',
    data_fim: '',
    status: 'planejada',
    descricao: '',
    area_construida: '',
    responsavel: '',
    cliente: '',
    progresso: 0
  });

  // Função para formatar data para o formato do input date (YYYY-MM-DD)
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return ''; // Data inválida
      
      return date.toISOString().split('T')[0]; // Retorna no formato YYYY-MM-DD
    } catch (error) {
      console.error('Erro ao formatar data:', error);
      return '';
    }
  };

  // Carregar dados da obra
  useEffect(() => {
    const fetchObra = async () => {
      console.log('Fetching obra data for ID:', id);
      
      if (!id) {
        console.error('No ID provided');
        setError('ID da obra não fornecido');
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('obras')
          .select('*')
          .eq('id', id)
          .single();

        if (error) {
          console.error('Supabase error:', error);
          throw error;
        }

        if (!data) {
          console.error('No data found for ID:', id);
          setError('Obra não encontrada');
          setLoading(false);
          return;
        }

        console.log('Obra data received:', data);
        setObra(data);
        setFormData({
          nome: data.nome || '',
          endereco: data.endereco || '',
          orcamento: data.orcamento || '',
          data_inicio: formatDateForInput(data.data_inicio),
          data_fim: formatDateForInput(data.data_fim),
          status: data.status || 'planejada',
          descricao: data.descricao || '',
          area_construida: data.area_construida || '',
          responsavel: data.responsavel || '',
          cliente: data.cliente || '',
          progresso: data.progresso || 0
        });
        setLoading(false);
      } catch (error) {
        console.error('Error fetching obra:', error);
        setError('Erro ao carregar obra: ' + error.message);
        setLoading(false);
      }
    };

    fetchObra();
    fetchEtapas();
    fetchDespesas();
  }, [id]);

  const fetchEtapas = async () => {
    try {
      const { data, error } = await getEtapasByObraId(id);

      if (error) throw error;
      
      setEtapas(data || []);
      
      // Calcular e atualizar o progresso da obra
      if (data && data.length > 0) {
        const progresso = calcularProgressoGeral(data);
        atualizarProgressoObra(progresso);
        
        // Calcular o valor previsto total
        const totalPrevisto = calcularTotalPrevisto(data);
        setValorPrevistoTotal(totalPrevisto);
      }
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      setError('Erro ao carregar as etapas da obra');
    }
  };

  // Atualizar o progresso da obra no banco de dados
  const atualizarProgressoObra = async (progresso) => {
    try {
      const { error } = await supabase
        .from('obras')
        .update({ progresso, updated_at: new Date() })
        .eq('id', id);
      
      if (error) throw error;
      
      // Atualizar o estado local
      setObra(prev => ({ ...prev, progresso }));
      setFormData(prev => ({ ...prev, progresso }));
    } catch (error) {
      console.error('Erro ao atualizar progresso da obra:', error);
    }
  };

  // Buscar despesas e calcular o total gasto
  const fetchDespesas = async () => {
    try {
      const { data, error } = await getDespesasByObraId(id);

      if (error) throw error;
      
      // Calcular o total gasto
      const totalGasto = data.reduce((total, despesa) => total + (parseFloat(despesa.valor) || 0), 0);
      setTotalGastoDespesas(totalGasto);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    }
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar alterações
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Criar uma cópia dos dados do formulário para enviar
      const dataToUpdate = {
        ...formData,
        updated_at: new Date()
      };
      
      // Garantir que as datas estejam no formato correto
      if (dataToUpdate.data_inicio) {
        dataToUpdate.data_inicio = new Date(dataToUpdate.data_inicio).toISOString();
      }
      
      if (dataToUpdate.data_fim) {
        dataToUpdate.data_fim = new Date(dataToUpdate.data_fim).toISOString();
      }
      
      // Tratar campos numéricos vazios
      if (dataToUpdate.orcamento === '') {
        dataToUpdate.orcamento = null;
      }
      
      if (dataToUpdate.area_construida === '') {
        dataToUpdate.area_construida = null;
      }
      
      if (dataToUpdate.progresso === '') {
        dataToUpdate.progresso = null;
      }
      
      const { error } = await supabase
        .from('obras')
        .update(dataToUpdate)
        .eq('id', id);
      
      if (error) throw error;
      
      const { data, error: fetchError } = await supabase
        .from('obras')
        .select('*')
        .eq('id', id)
        .single();
      
      if (fetchError) throw fetchError;
      
      setObra(data);
      setShowModal(false);
      
    } catch (error) {
      console.error('Erro ao atualizar obra:', error);
      setError('Erro ao atualizar: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Excluir obra
  const handleDelete = async () => {
    if (!window.confirm('Tem certeza que deseja excluir esta obra? Esta ação não pode ser desfeita.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('obras')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      navigate('/obras');
    } catch (error) {
      console.error('Erro ao excluir obra:', error);
      setError('Erro ao excluir: ' + error.message);
      setLoading(false);
    }
  };

  // Função para atualizar o valor previsto total quando as etapas são alteradas
  const handleOrcamentoChange = (novoValorPrevisto) => {
    // Apenas atualizar o estado local do valor previsto total
    setValorPrevistoTotal(novoValorPrevisto);
  };

  // Função para atualizar o progresso quando as etapas são alteradas
  const handleProgressoChange = () => {
    // Recarregar etapas e recalcular progresso
    fetchEtapas();
  };

  // Estado para armazenar o total gasto em despesas
  const [totalGastoDespesas, setTotalGastoDespesas] = useState(0);

  // Função para atualizar o total gasto em despesas
  const handleTotalGastoChange = (novoTotalGasto) => {
    setTotalGastoDespesas(novoTotalGasto);
  };

  console.log('Current state:', { loading, error, obra, activeTab });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/obras')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold">Detalhes da Obra</h1>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center p-8">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
            <p className="text-gray-600">Carregando dados da obra...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/obras')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold">Detalhes da Obra</h1>
            </div>
          </div>
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <FaExclamationTriangle className="text-red-500 text-lg mr-3" />
              <div>
                <p className="text-red-800 font-medium">Erro</p>
                <p className="text-red-700">{error}</p>
                <button
                  onClick={() => navigate('/obras')}
                  className="mt-3 bg-red-100 text-red-700 px-4 py-2 rounded hover:bg-red-200"
                >
                  Voltar para Lista de Obras
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!obra) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/obras')}
                className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                <FaArrowLeft size={20} />
              </button>
              <h1 className="text-xl font-semibold">Detalhes da Obra</h1>
            </div>
          </div>
          <div className="text-center py-8">
            <FaExclamationTriangle className="text-yellow-500 text-5xl mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-4">Obra não encontrada</h2>
            <p className="text-gray-600 mb-4">A obra solicitada não foi encontrada ou não existe.</p>
            <button
              onClick={() => navigate('/obras')}
              className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700"
            >
              Voltar para Lista de Obras
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Substituir o cálculo direto pelo estado
  // const totalPrevisto = calcularTotalPrevisto(etapas);
  const totalPrevisto = valorPrevistoTotal;
  // Corrigir o cálculo do valor realizado para usar o total gasto das despesas, não das etapas
  // const totalRealizado = etapas.reduce((total, etapa) => total + (parseFloat(etapa.valor_realizado) || 0), 0);
  const totalRealizado = totalGastoDespesas;
  // Calcular a diferença orçamentária corretamente
  const diferencaOrcamento = obra.orcamento - totalRealizado;

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Cabeçalho */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div className="flex items-center mb-4 md:mb-0">
            <button
              onClick={() => navigate('/obras')}
              className="mr-4 text-gray-600 hover:text-gray-900"
            >
              <FaArrowLeft size={20} />
            </button>
            <h1 className="text-2xl font-bold text-gray-800">
              {obra?.nome || 'Carregando...'}
            </h1>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md flex items-center"
              disabled={loading}
            >
              <FaEdit className="mr-2" /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md flex items-center"
              disabled={loading}
            >
              <FaTrash className="mr-2" /> Excluir
            </button>
          </div>
        </div>

        {/* Mensagem de erro */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            <p>{error}</p>
          </div>
        )}

        {/* Abas */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 overflow-x-auto">
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'info'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('info')}
              >
                <FaBuilding className="inline-block mr-2" /> Informações
              </button>
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'etapas'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('etapas')}
              >
                <FaBolt className="inline-block mr-2" /> Etapas
              </button>
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'cronograma'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('cronograma')}
              >
                <FaCalendarAlt className="inline-block mr-2" /> Cronograma
              </button>
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'orcamento'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('orcamento')}
              >
                <FaMoneyBillWave className="inline-block mr-2" /> Orçamento
              </button>
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'materiais'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('materiais')}
              >
                <FaBoxes className="inline-block mr-2" /> Materiais
              </button>
              <button
                className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'documentos'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('documentos')}
              >
                <FaUser className="inline-block mr-2" /> Documentos
              </button>
            </nav>
          </div>
        </div>

        {/* Conteúdo da aba */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <FaSpinner className="animate-spin text-blue-500 text-4xl" />
          </div>
        ) : (
          <>
            {activeTab === 'info' && <DetalhesObra obra={obra} />}
            
            {activeTab === 'etapas' && (
              <EtapasObra 
                obraId={id} 
                onOrcamentoChange={handleOrcamentoChange}
                onProgressoChange={handleProgressoChange}
              />
            )}
            
            {activeTab === 'cronograma' && <CronogramaObra obraId={id} />}
            
            {activeTab === 'orcamento' && (
              <OrcamentoObra 
                obraId={id} 
                orcamentoTotal={obra?.orcamento || 0}
                onTotalGastoChange={handleTotalGastoChange}
              />
            )}
            
            {activeTab === 'materiais' && <QuantitativoMateriais obraId={id} />}
            
            {activeTab === 'documentos' && <DocumentosObra obraId={id} />}
          </>
        )}

        {/* Modal de Edição */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <h2 className="text-xl font-semibold mb-4">Editar Obra</h2>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nome da Obra
                    </label>
                    <input
                      type="text"
                      name="nome"
                      value={formData.nome}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endereço
                    </label>
                    <input
                      type="text"
                      name="endereco"
                      value={formData.endereco}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Orçamento (R$)
                    </label>
                    <input
                      type="number"
                      name="orcamento"
                      value={formData.orcamento}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Defina o orçamento total disponível para esta obra. Este valor é independente do valor previsto nas etapas.
                    </p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área Construída (m²)
                    </label>
                    <input
                      type="number"
                      name="area_construida"
                      value={formData.area_construida}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      min="0"
                      step="0.01"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Início
                    </label>
                    <input
                      type="date"
                      name="data_inicio"
                      value={formData.data_inicio}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Término Prevista
                    </label>
                    <input
                      type="date"
                      name="data_fim"
                      value={formData.data_fim}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status
                    </label>
                    <select
                      name="status"
                      value={formData.status}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      required
                    >
                      <option value="planejada">Planejada</option>
                      <option value="em_andamento">Em Andamento</option>
                      <option value="pausada">Pausada</option>
                      <option value="concluida">Concluída</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsável Técnico
                    </label>
                    <input
                      type="text"
                      name="responsavel"
                      value={formData.responsavel}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cliente
                    </label>
                    <input
                      type="text"
                      name="cliente"
                      value={formData.cliente}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="4"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  ></textarea>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
          <h2 className="text-xl font-bold mb-4">Resumo Financeiro</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Valor Previsto Total</h3>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalPrevisto)}</p>
              <p className="text-xs text-gray-500 mt-1">Soma dos valores previstos nas etapas</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Total Gasto</h3>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalRealizado)}</p>
              <p className="text-xs text-gray-500 mt-1">Soma de todas as despesas</p>
            </div>
            <div className={`bg-gray-50 p-4 rounded-lg ${diferencaOrcamento < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Saldo Disponível</h3>
              <p className={`text-xl font-semibold ${diferencaOrcamento < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(Math.abs(diferencaOrcamento))}
                <span className="text-sm ml-1">
                  {diferencaOrcamento < 0 ? '(Orçamento excedido)' : '(Orçamento disponível)'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">Orçamento total menos total gasto (não considera valores previstos)</p>
            </div>
          </div>
          
          {/* Saldo Não Comprometido */}
          <div className="mt-6">
            <h3 className="text-lg font-medium mb-3">Saldo Real Disponível</h3>
            <div className={`p-4 rounded-lg ${(obra.orcamento - totalPrevisto - totalRealizado) < 0 ? 'bg-red-50' : 'bg-teal-50'}`}>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Saldo Não Comprometido</h3>
              <p className={`text-xl font-semibold ${(obra.orcamento - totalPrevisto - totalRealizado) < 0 ? 'text-red-600' : 'text-teal-600'}`}>
                {formatCurrency(Math.abs(obra.orcamento - totalPrevisto - totalRealizado))}
                <span className="text-sm ml-1">
                  {(obra.orcamento - totalPrevisto - totalRealizado) < 0 ? '(Valor comprometido excede o orçamento)' : '(Disponível para novas etapas)'}
                </span>
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Orçamento total menos valor previsto nas etapas menos total gasto
                {(obra.orcamento - totalPrevisto - totalRealizado) < 0 && 
                  <span className="text-red-600 block mt-1">
                    Atenção: O valor comprometido (previsto + gasto) excede o orçamento total!
                  </span>
                }
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalheObra; 