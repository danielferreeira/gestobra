import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FaBuilding, FaMoneyBillWave, FaExclamationTriangle, FaCalendarAlt, FaChartLine, FaTools, FaCheckCircle, FaHourglass } from 'react-icons/fa';
import { createClient } from '@supabase/supabase-js';

// Criando o cliente do Supabase diretamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

const Dashboard = () => {
  const [dashboardData, setDashboardData] = useState({
    totalObras: 0,
    obrasEmAndamento: 0,
    obrasConcluidas: 0,
    obrasPlaneadas: 0,
    orcamentoTotal: 0,
    gastoTotal: 0
  });
  const [obrasRecentes, setObrasRecentes] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Carregar dados do dashboard
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Buscar todas as obras
        const { data: obrasData, error: obrasError } = await supabase
          .from('obras')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (obrasError) throw obrasError;
        
        // Buscar despesas
        const { data: despesasData, error: despesasError } = await supabase
          .from('despesas')
          .select('*')
          .order('data', { ascending: false });
        
        if (despesasError) throw despesasError;
        
        // Calcular estatísticas
        const totalObras = obrasData.length;
        const obrasEmAndamento = obrasData.filter(obra => obra.status === 'em_andamento').length;
        const obrasConcluidas = obrasData.filter(obra => obra.status === 'concluida').length;
        const obrasPlaneadas = obrasData.filter(obra => obra.status === 'planejada').length;
        
        // Calcular orçamento total e gasto total
        const orcamentoTotal = obrasData.reduce((total, obra) => total + (parseFloat(obra.orcamento) || 0), 0);
        const gastoTotal = despesasData.reduce((total, despesa) => total + (parseFloat(despesa.valor) || 0), 0);
        
        // Gerar alertas
        const alertasTemp = [];
        
        // Alertas de obras com orçamento excedido
        obrasData.forEach(obra => {
          const despesasObra = despesasData.filter(d => d.obra_id === obra.id);
          const totalGasto = despesasObra.reduce((total, d) => total + parseFloat(d.valor || 0), 0);
          
          if (totalGasto > parseFloat(obra.orcamento)) {
            alertasTemp.push({
              id: `obra-${obra.id}`,
              tipo: 'orcamento',
              mensagem: `Obra ${obra.nome} com orçamento excedido`,
              data: new Date().toLocaleDateString('pt-BR'),
              obraId: obra.id
            });
          }
        });
        
        // Alertas de obras próximas do prazo
        obrasData.forEach(obra => {
          if (obra.data_fim && obra.status !== 'concluida') {
            const dataFim = new Date(obra.data_fim);
            const hoje = new Date();
            const diasRestantes = Math.ceil((dataFim - hoje) / (1000 * 60 * 60 * 24));
            
            if (diasRestantes <= 15 && diasRestantes > 0) {
              alertasTemp.push({
                id: `prazo-${obra.id}`,
                tipo: 'prazo',
                mensagem: `Obra ${obra.nome} com prazo próximo do fim (${diasRestantes} dias)`,
                data: new Date().toLocaleDateString('pt-BR'),
                obraId: obra.id
              });
            } else if (diasRestantes <= 0) {
              alertasTemp.push({
                id: `atrasada-${obra.id}`,
                tipo: 'atrasada',
                mensagem: `Obra ${obra.nome} está atrasada (${Math.abs(diasRestantes)} dias)`,
                data: new Date().toLocaleDateString('pt-BR'),
                obraId: obra.id
              });
            }
          }
        });
        
        // Atualizar estado
        setDashboardData({
          totalObras,
          obrasEmAndamento,
          obrasConcluidas,
          obrasPlaneadas,
          orcamentoTotal,
          gastoTotal
        });
        
        setObrasRecentes(obrasData.slice(0, 5)); // 5 obras mais recentes
        setAlertas(alertasTemp);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
        setError(error.message || 'Erro ao carregar dados');
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Obter status formatado
  const getStatusInfo = (status) => {
    switch (status) {
      case 'planejada':
        return { label: 'Planejada', color: 'bg-yellow-100 text-yellow-800', icon: <FaHourglass className="mr-1" /> };
      case 'em_andamento':
        return { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800', icon: <FaTools className="mr-1" /> };
      case 'concluida':
        return { label: 'Concluída', color: 'bg-green-100 text-green-800', icon: <FaCheckCircle className="mr-1" /> };
      default:
        return { label: 'Desconhecido', color: 'bg-gray-100 text-gray-800', icon: null };
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
        <p className="font-bold">Erro ao carregar dados</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-500">Última atualização: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Cards de resumo */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Total de Obras */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Total de Obras</p>
              <p className="text-2xl font-bold text-gray-800">{dashboardData.totalObras}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-500">
              <FaBuilding size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-medium text-green-500 bg-green-100 px-2 py-1 rounded-full flex items-center">
                <FaCheckCircle className="mr-1" /> {dashboardData.obrasConcluidas} concluídas
              </span>
            </div>
            <Link to="/obras" className="text-xs text-blue-500 hover:text-blue-700">Ver todas</Link>
          </div>
        </div>

        {/* Obras em Andamento */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Em Andamento</p>
              <p className="text-2xl font-bold text-gray-800">{dashboardData.obrasEmAndamento}</p>
            </div>
            <div className="p-3 rounded-full bg-blue-100 text-blue-500">
              <FaTools size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-medium text-yellow-500 bg-yellow-100 px-2 py-1 rounded-full flex items-center">
                <FaHourglass className="mr-1" /> {dashboardData.obrasPlaneadas} planejadas
              </span>
            </div>
            <Link to="/obras" className="text-xs text-blue-500 hover:text-blue-700">Ver detalhes</Link>
          </div>
        </div>

        {/* Orçamento Total */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Orçamento Total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(dashboardData.orcamentoTotal)}</p>
            </div>
            <div className="p-3 rounded-full bg-green-100 text-green-500">
              <FaMoneyBillWave size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-xs font-medium text-gray-500">Média por obra: {formatCurrency(dashboardData.totalObras ? dashboardData.orcamentoTotal / dashboardData.totalObras : 0)}</span>
            </div>
            <Link to="/financeiro" className="text-xs text-blue-500 hover:text-blue-700">Ver detalhes</Link>
          </div>
        </div>

        {/* Gasto Total */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500">Gasto Total</p>
              <p className="text-2xl font-bold text-gray-800">{formatCurrency(dashboardData.gastoTotal)}</p>
            </div>
            <div className="p-3 rounded-full bg-red-100 text-red-500">
              <FaChartLine size={24} />
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="flex items-center">
              <span className={`text-xs font-medium px-2 py-1 rounded-full flex items-center ${dashboardData.gastoTotal > dashboardData.orcamentoTotal ? 'bg-red-100 text-red-500' : 'bg-green-100 text-green-500'}`}>
                {dashboardData.gastoTotal > dashboardData.orcamentoTotal ? (
                  <>
                    <FaExclamationTriangle className="mr-1" /> Acima do orçamento
                  </>
                ) : (
                  <>
                    <FaCheckCircle className="mr-1" /> Dentro do orçamento
                  </>
                )}
              </span>
              </div>
            <Link to="/financeiro" className="text-xs text-blue-500 hover:text-blue-700">Ver detalhes</Link>
          </div>
        </div>
      </div>

      {/* Obras Recentes e Alertas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Obras Recentes */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Obras Recentes</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {obrasRecentes.length > 0 ? (
              obrasRecentes.map((obra) => {
                const statusInfo = getStatusInfo(obra.status);
                return (
                  <div key={obra.id} className="p-4 hover:bg-gray-50">
                    <Link to={`/obras/${obra.id}`} className="block">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-medium text-gray-900">{obra.nome}</h3>
                          <div className="mt-1 flex items-center">
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                              {statusInfo.icon} {statusInfo.label}
                            </span>
                            <span className="ml-2 text-sm text-gray-500 flex items-center">
                              <FaCalendarAlt className="mr-1" /> {formatDate(obra.data_inicio)}
                            </span>
          </div>
        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatCurrency(obra.orcamento)}</p>
                          <p className="text-xs text-gray-500">Orçamento</p>
          </div>
        </div>
                      <div className="mt-2">
                        <div className="relative pt-1">
                          <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
                            <div 
                              style={{ width: `${obra.progresso || 0}%` }} 
                              className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${
                                obra.status === 'concluida' ? 'bg-green-500' : 'bg-blue-500'
                              }`}
                            ></div>
      </div>
                          <p className="text-right text-xs mt-1">{obra.progresso || 0}% concluído</p>
                        </div>
                      </div>
                    </Link>
                  </div>
                  );
                })
              ) : (
              <div className="p-4 text-center text-gray-500">
                Nenhuma obra cadastrada
              </div>
            )}
          </div>
          {obrasRecentes.length > 0 && (
            <div className="p-4 border-t border-gray-200">
              <Link to="/obras" className="text-blue-500 hover:text-blue-700 text-sm font-medium">
                Ver todas as obras
              </Link>
            </div>
          )}
        </div>

        {/* Alertas */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b border-gray-200">
            <h2 className="text-lg font-semibold">Alertas</h2>
          </div>
          <div className="divide-y divide-gray-200">
            {alertas.length > 0 ? (
              alertas.map((alerta) => (
                <div key={alerta.id} className="p-4 hover:bg-gray-50">
                  <Link to={`/obras/${alerta.obraId}`} className="block">
                    <div className="flex items-start">
                      <div className={`p-2 rounded-full mr-3 ${
                        alerta.tipo === 'orcamento' ? 'bg-red-100 text-red-500' : 
                        alerta.tipo === 'prazo' ? 'bg-yellow-100 text-yellow-500' : 
                        'bg-orange-100 text-orange-500'
                      }`}>
                        <FaExclamationTriangle />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{alerta.mensagem}</p>
                        <p className="text-xs text-gray-500 mt-1">{alerta.data}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-gray-500">
                Nenhum alerta no momento
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 