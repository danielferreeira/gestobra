import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  FaArrowLeft, FaEdit, FaTrash, FaBuilding, FaCalendarAlt, 
  FaMoneyBillWave, FaUser, FaExclamationTriangle, FaBolt, FaSpinner
} from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import DetalhesObra from '../components/DetalhesObra';
import EtapasObra from '../components/EtapasObra';
import DocumentosObra from '../components/DocumentosObra';
import CronogramaObra from '../components/CronogramaObra';
import OrcamentoObra from '../components/OrcamentoObra';
import { calcularTotalPrevisto, calcularTotalRealizado } from '../services/etapasService';

const DetalheObra = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState(null);
  const [etapas, setEtapas] = useState([]);
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
    cliente: ''
  });

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
          data_inicio: data.data_inicio || '',
          data_fim: data.data_fim || '',
          status: data.status || 'planejada',
          descricao: data.descricao || '',
          area_construida: data.area_construida || '',
          responsavel: data.responsavel || '',
          cliente: data.cliente || ''
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
  }, [id]);

  const fetchEtapas = async () => {
    try {
      const { data, error } = await supabase
        .from('etapas_obra')
        .select('*')
        .eq('obra_id', id)
        .order('ordem');

      if (error) throw error;
      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
      setError('Erro ao carregar as etapas da obra');
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
      
      const { error } = await supabase
        .from('obras')
        .update({
          ...formData,
          updated_at: new Date()
        })
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

  const totalPrevisto = calcularTotalPrevisto(etapas);
  const totalRealizado = calcularTotalRealizado(etapas);
  const diferencaOrcamento = totalPrevisto - totalRealizado;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <button
              onClick={() => navigate('/obras')}
              className="mr-4 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <FaArrowLeft size={20} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{obra.nome}</h1>
            </div>
          </div>
          <div className="flex space-x-3">
            <button
              onClick={() => {}} // Placeholder para diagnóstico
              className="text-gray-600 hover:text-gray-900 px-4 py-2 rounded-md flex items-center"
            >
              <FaBolt className="mr-2" /> Diagnóstico
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-blue-700 transition-colors"
            >
              <FaEdit className="mr-2" /> Editar
            </button>
            <button
              onClick={handleDelete}
              className="bg-red-600 text-white px-4 py-2 rounded-md flex items-center hover:bg-red-700 transition-colors"
            >
              <FaTrash className="mr-2" /> Excluir
            </button>
          </div>
        </div>

        {/* Tabs de navegação */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <nav className="flex space-x-4 p-4 border-b">
            <button
              onClick={() => setActiveTab('info')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'info'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaBuilding className="inline mr-2" /> Informações
            </button>
            <button
              onClick={() => setActiveTab('etapas')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'etapas'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCalendarAlt className="inline mr-2" /> Etapas
            </button>
            <button
              onClick={() => setActiveTab('cronograma')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'cronograma'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaCalendarAlt className="inline mr-2" /> Cronograma
            </button>
            <button
              onClick={() => setActiveTab('orcamento')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'orcamento'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaMoneyBillWave className="inline mr-2" /> Orçamento
            </button>
            <button
              onClick={() => setActiveTab('documentos')}
              className={`px-3 py-2 rounded-md text-sm font-medium ${
                activeTab === 'documentos'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <FaUser className="inline mr-2" /> Documentos
            </button>
          </nav>

          {/* Conteúdo das tabs */}
          <div className="p-6">
            {activeTab === 'info' && <DetalhesObra obra={obra} />}
            {activeTab === 'etapas' && <EtapasObra obraId={id} />}
            {activeTab === 'cronograma' && <CronogramaObra obraId={id} />}
            {activeTab === 'orcamento' && <OrcamentoObra obraId={id} orcamentoTotal={obra.orcamento} />}
            {activeTab === 'documentos' && <DocumentosObra obraId={id} />}
          </div>
        </div>

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
              <p className="text-xl font-semibold text-gray-900">{totalPrevisto}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg">
              <h3 className="text-sm font-medium text-gray-500 mb-1">Valor Realizado Total</h3>
              <p className="text-xl font-semibold text-gray-900">{totalRealizado}</p>
            </div>
            <div className={`bg-gray-50 p-4 rounded-lg ${diferencaOrcamento < 0 ? 'bg-red-50' : 'bg-green-50'}`}>
              <h3 className="text-sm font-medium text-gray-500 mb-1">Diferença Orçamentária</h3>
              <p className={`text-xl font-semibold ${diferencaOrcamento < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {Math.abs(diferencaOrcamento)}
                <span className="text-sm ml-1">
                  {diferencaOrcamento < 0 ? '(Acima do previsto)' : '(Abaixo do previsto)'}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalheObra; 