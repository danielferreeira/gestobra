import React, { useState, useEffect } from 'react';
import {
  FaMapMarkerAlt,
  FaUserTie,
  FaUser,
  FaCalendarAlt,
  FaChartLine,
  FaRuler,
  FaMoneyBillWave,
  FaInfoCircle,
  FaClock,
  FaExclamationTriangle,
  FaCheckCircle,
  FaTools
} from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { calcularTotalPrevisto } from '../services/etapasService';
import { getDespesasByObraId } from '../services/despesasService';

const DetalhesObra = ({ obra }) => {
  const [etapas, setEtapas] = useState([]);
  const [valorPrevisto, setValorPrevisto] = useState(0);
  const [totalGasto, setTotalGasto] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (obra && obra.id) {
      fetchEtapas(obra.id);
      fetchDespesas(obra.id);
    }
  }, [obra]);

  const fetchEtapas = async (obraId) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('etapas_obra')
        .select('*')
        .eq('obra_id', obraId);

      if (error) throw error;
      
      setEtapas(data || []);
      const total = calcularTotalPrevisto(data || []);
      setValorPrevisto(total);
    } catch (error) {
      console.error('Erro ao buscar etapas:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDespesas = async (obraId) => {
    try {
      const { data, error } = await getDespesasByObraId(obraId);
      
      if (error) throw error;
      
      // Calcular total gasto
      const total = data.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
      setTotalGasto(total);
    } catch (error) {
      console.error('Erro ao buscar despesas:', error);
    }
  };

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Função para formatar data
  const formatDate = (dateString) => {
    if (!dateString) return 'Não definida';
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  // Função para calcular dias restantes
  const calcularDiasRestantes = () => {
    if (!obra.data_fim) return null;
    const hoje = new Date();
    const dataFim = new Date(obra.data_fim);
    const diffTime = dataFim - hoje;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  // Função para obter informações de status
  const getStatusInfo = () => {
    const statusMap = {
      planejada: {
        label: 'Planejada',
        color: 'bg-blue-100 text-blue-800',
        icon: <FaClock className="mr-2" />
      },
      em_andamento: {
        label: 'Em Andamento',
        color: 'bg-green-100 text-green-800',
        icon: <FaTools className="mr-2" />
      },
      pausada: {
        label: 'Pausada',
        color: 'bg-yellow-100 text-yellow-800',
        icon: <FaExclamationTriangle className="mr-2" />
      },
      concluida: {
        label: 'Concluída',
        color: 'bg-gray-100 text-gray-800',
        icon: <FaCheckCircle className="mr-2" />
      }
    };

    return statusMap[obra.status] || statusMap.planejada;
  };

  const diasRestantes = calcularDiasRestantes();
  const statusInfo = getStatusInfo();

  if (!obra) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Progresso da Obra */}
      <div className="bg-white rounded-lg shadow p-4 mb-4">
        <h3 className="text-lg font-medium mb-2 flex items-center">
          <FaChartLine className="mr-2 text-blue-600" /> Progresso da Obra
        </h3>
        <div className="bg-gray-200 rounded-full h-4 mb-2">
          <div 
            className="bg-blue-600 h-4 rounded-full" 
            style={{ width: `${obra.progresso || 0}%` }}
          ></div>
        </div>
        <div className="text-right text-sm text-gray-600">
          {obra.progresso || 0}% concluído
        </div>
      </div>

      {/* Informações Financeiras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 p-4 rounded-md shadow">
          <div className="text-sm text-blue-800 font-medium">Orçamento Total</div>
          <div className="text-xl font-bold">{formatCurrency(obra.orcamento)}</div>
          <div className="text-xs text-gray-500 mt-1">Valor definido para a obra</div>
        </div>
        <div className="bg-green-50 p-4 rounded-md shadow">
          <div className="text-sm text-green-800 font-medium">Valor Previsto (Etapas)</div>
          <div className="text-xl font-bold">{formatCurrency(valorPrevisto)}</div>
          <div className="text-xs text-gray-500 mt-1">Soma dos valores previstos nas etapas</div>
        </div>
        <div className="bg-yellow-50 p-4 rounded-md shadow">
          <div className="text-sm text-yellow-800 font-medium">Diferença Orçamento vs Previsto</div>
          <div className="text-xl font-bold">{formatCurrency(obra.orcamento - valorPrevisto)}</div>
          <div className="text-xs text-gray-500 mt-1">
            {obra.orcamento >= valorPrevisto 
              ? 'Orçamento disponível para planejamento' 
              : 'Valor planejado excede o orçamento'}
          </div>
        </div>
      </div>

      {/* Saldo Não Comprometido */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Saldo Real Disponível</h3>
        <div className={`p-4 rounded-md shadow ${(obra.orcamento - valorPrevisto - totalGasto) < 0 ? 'bg-red-50' : 'bg-teal-50'}`}>
          <div className={`text-sm font-medium ${(obra.orcamento - valorPrevisto - totalGasto) < 0 ? 'text-red-800' : 'text-teal-800'}`}>
            Saldo Não Comprometido
          </div>
          <div className="text-xl font-bold">
            {formatCurrency(obra.orcamento - valorPrevisto - totalGasto)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Orçamento total menos valor previsto nas etapas menos total gasto
            {(obra.orcamento - valorPrevisto - totalGasto) < 0 && 
              <span className="text-red-600 block mt-1">
                Atenção: O valor comprometido (previsto + gasto) excede o orçamento total!
              </span>
            }
          </div>
        </div>
      </div>

      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center">
              <FaInfoCircle className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Status</span>
            </div>
            <span className={`px-2 py-1 rounded-full text-xs ${statusInfo.color}`}>
              <div className="flex items-center">
                {statusInfo.icon}
                {statusInfo.label}
              </div>
            </span>
          </div>
          <div className="mt-2">
            <span className="text-sm text-gray-500">Prazo</span>
            <div className="flex items-center justify-between">
              <p className="text-gray-900">{formatDate(obra.data_inicio)} - {formatDate(obra.data_fim)}</p>
              {diasRestantes !== null && (
                <span className={`text-xs px-2 py-1 rounded-full ${diasRestantes < 0 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                  {diasRestantes < 0 
                    ? `${Math.abs(diasRestantes)} dias atrasado` 
                    : `${diasRestantes} dias restantes`}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Prazo */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaCalendarAlt className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Datas</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-xs text-gray-500">Início</span>
                <p className="text-gray-900">{formatDate(obra.data_inicio)}</p>
              </div>
              <div>
                <span className="text-xs text-gray-500">Término</span>
                <p className="text-gray-900">{formatDate(obra.data_fim)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Área */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaRuler className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Área Construída</span>
            </div>
            <p className="text-gray-900">{obra.area_construida || 'Não informada'} m²</p>
          </div>
        </div>

        {/* Endereço */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaMapMarkerAlt className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Endereço</span>
            </div>
            <p className="text-gray-900">{obra.endereco || 'Não informado'}</p>
          </div>
        </div>

        {/* Responsável */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaUserTie className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Responsável</span>
            </div>
            <p className="text-gray-900">{obra.responsavel || 'Não informado'}</p>
          </div>
        </div>

        {/* Cliente */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaUser className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Cliente</span>
            </div>
            <p className="text-gray-900">{obra.cliente || 'Não informado'}</p>
          </div>
        </div>
      </div>

      {/* Descrição */}
      {obra.descricao && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex flex-col">
            <div className="flex items-center mb-2">
              <FaInfoCircle className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Descrição</span>
            </div>
            <p className="text-gray-900 whitespace-pre-line">{obra.descricao}</p>
          </div>
        </div>
      )}

      {/* Datas de criação e atualização */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-sm text-gray-500">Data de criação</span>
            <p className="text-gray-900">{formatDate(obra.created_at)}</p>
          </div>
          <div>
            <span className="text-sm text-gray-500">Última atualização</span>
            <p className="text-gray-900">{formatDate(obra.updated_at)}</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DetalhesObra; 