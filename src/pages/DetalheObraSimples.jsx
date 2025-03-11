import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { FaArrowLeft, FaBuilding } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';

const DetalheObraSimples = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obra, setObra] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados da obra - implementação ultra simplificada
  useEffect(() => {
    // Definir um timeout para evitar carregamento infinito
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Timeout atingido ao carregar obra');
        setLoading(false);
        setError('Tempo limite excedido ao carregar obra');
      }
    }, 3000);

    const fetchObra = async () => {
      if (!id) {
        console.log('ID da obra não fornecido');
        setError('ID da obra não fornecido');
        setLoading(false);
        clearTimeout(timeoutId);
        return;
      }

      console.log('Buscando obra com ID:', id);
      
      try {
        // Consulta direta ao Supabase - apenas campos básicos
        const { data, error } = await supabase
          .from('obras')
          .select('id, nome, endereco, orcamento, status, progresso')
          .eq('id', id)
          .single();

        clearTimeout(timeoutId);

        if (error) {
          console.error('Erro ao buscar obra:', error);
          setError(error.message || 'Erro ao carregar obra');
          setLoading(false);
          return;
        }

        if (!data) {
          console.log('Nenhuma obra encontrada com o ID:', id);
          setError('Obra não encontrada');
          setLoading(false);
          return;
        }

        console.log('Obra encontrada:', data.nome);
        setObra(data);
        setLoading(false);
      } catch (error) {
        clearTimeout(timeoutId);
        console.error('Erro não tratado ao buscar obra:', error);
        setError('Erro ao carregar obra: ' + (error.message || 'Erro desconhecido'));
        setLoading(false);
      }
    };

    fetchObra();

    return () => {
      clearTimeout(timeoutId);
    };
  }, [id]);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    if (!value) return 'R$ 0,00';
    try {
      return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
      }).format(value);
    } catch (e) {
      console.error('Erro ao formatar valor:', e);
      return 'R$ ' + value;
    }
  };

  // Obter label do status
  const getStatusLabel = (status) => {
    const statusMap = {
      'planejada': { label: 'Planejada', color: 'bg-yellow-100 text-yellow-800' },
      'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      'pausada': { label: 'Pausada', color: 'bg-orange-100 text-orange-800' },
      'concluida': { label: 'Concluída', color: 'bg-green-100 text-green-800' }
    };
    
    return statusMap[status] || { label: status || 'Desconhecido', color: 'bg-gray-100 text-gray-800' };
  };

  // Renderização condicional para estado de carregamento
  if (loading) {
    return (
      <div className="flex flex-col justify-center items-center h-full p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500 mb-4"></div>
        <p className="text-gray-600 mb-4">Carregando dados da obra...</p>
        <button 
          onClick={() => navigate('/obras')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Voltar para a lista de obras
        </button>
      </div>
    );
  }

  // Renderização condicional para estado de erro
  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-8 rounded-md m-4">
        <h2 className="text-lg font-semibold mb-4">Erro</h2>
        <p className="mb-4">{error}</p>
        <button
          onClick={() => navigate('/obras')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Voltar para Lista de Obras
        </button>
      </div>
    );
  }

  // Renderização condicional para obra não encontrada
  if (!obra) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-semibold mb-4">Obra não encontrada</h2>
        <p className="mb-4">A obra solicitada não foi encontrada ou não existe.</p>
        <button
          onClick={() => navigate('/obras')}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Voltar para Lista de Obras
        </button>
      </div>
    );
  }

  // Renderização da obra (versão simplificada)
  const statusInfo = getStatusLabel(obra.status);

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <button
            onClick={() => navigate('/obras')}
            className="mr-4 text-gray-600 hover:text-gray-900"
          >
            <FaArrowLeft size={20} />
          </button>
          <h1 className="text-2xl font-bold">{obra.nome}</h1>
        </div>
      </div>

      {/* Informações da Obra - Versão Simplificada */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4 flex items-center">
          <FaBuilding className="mr-2" /> Informações da Obra
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Status</h3>
              <div className="mt-1">
                <span className={`px-2 py-1 rounded-full text-sm ${statusInfo.color}`}>
                  {statusInfo.label}
                </span>
              </div>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Endereço</h3>
              <p className="mt-1">{obra.endereco}</p>
            </div>
          </div>
          
          <div>
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Orçamento</h3>
              <p className="mt-1">{formatCurrency(obra.orcamento)}</p>
            </div>
            
            <div className="mb-4">
              <h3 className="text-sm font-medium text-gray-500">Progresso</h3>
              <div className="mt-1">
                <div className="flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mr-2">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${obra.progresso || 0}%` }}
                    ></div>
                  </div>
                  <span>{obra.progresso || 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <p className="text-center text-gray-500">
            Esta é uma versão simplificada da página de detalhes da obra.
            <br />
            Para acessar todas as funcionalidades, volte para a lista de obras e tente novamente.
          </p>
        </div>
      </div>
    </div>
  );
};

export default DetalheObraSimples; 