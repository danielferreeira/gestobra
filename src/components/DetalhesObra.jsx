import React from 'react';
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

const DetalhesObra = ({ obra }) => {
  console.log('DetalhesObra component received obra:', obra);

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

  console.log('DetalhesObra component rendering with:', {
    diasRestantes,
    statusInfo,
    formattedOrcamento: formatCurrency(obra.orcamento)
  });

  return (
    <div className="space-y-6">
      {/* Cards de Status */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Status */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaChartLine className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Status</span>
            </div>
            <div className={`px-2 py-1 rounded-full text-sm flex items-center ${statusInfo.color}`}>
              {statusInfo.icon}
              {statusInfo.label}
            </div>
          </div>
        </div>

        {/* Orçamento */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaMoneyBillWave className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Orçamento Total</span>
            </div>
            <span className="text-lg font-semibold">{formatCurrency(obra.orcamento)}</span>
          </div>
        </div>

        {/* Prazo */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaCalendarAlt className="text-gray-400 mr-2" />
              <span className="text-sm text-gray-500">Prazo</span>
            </div>
            {diasRestantes !== null && (
              <span className={`text-lg font-semibold ${diasRestantes < 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {diasRestantes < 0 
                  ? `${Math.abs(diasRestantes)} dias atrasado` 
                  : `${diasRestantes} dias restantes`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Informações Principais */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FaInfoCircle className="mr-2 text-gray-400" />
          Informações Principais
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaMapMarkerAlt className="mr-2" />
                <span className="text-sm">Endereço</span>
              </div>
              <p className="text-gray-900">{obra.endereco || 'Não informado'}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaRuler className="mr-2" />
                <span className="text-sm">Área Construída</span>
              </div>
              <p className="text-gray-900">
                {obra.area_construida ? `${obra.area_construida} m²` : 'Não informada'}
              </p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaTools className="mr-2" />
                <span className="text-sm">Responsável Técnico</span>
              </div>
              <p className="text-gray-900">{obra.responsavel || 'Não informado'}</p>
            </div>
          </div>

          <div>
            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaUser className="mr-2" />
                <span className="text-sm">Cliente</span>
              </div>
              <p className="text-gray-900">{obra.cliente || 'Não informado'}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaCalendarAlt className="mr-2" />
                <span className="text-sm">Data de Início</span>
              </div>
              <p className="text-gray-900">{formatDate(obra.data_inicio)}</p>
            </div>

            <div className="mb-4">
              <div className="flex items-center text-gray-500 mb-1">
                <FaCalendarAlt className="mr-2" />
                <span className="text-sm">Data de Término Prevista</span>
              </div>
              <p className="text-gray-900">{formatDate(obra.data_fim)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Descrição */}
      {obra.descricao && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center">
            <FaInfoCircle className="mr-2 text-gray-400" />
            Descrição
          </h3>
          <p className="text-gray-700 whitespace-pre-line">{obra.descricao}</p>
        </div>
      )}

      {/* Histórico */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center">
          <FaClock className="mr-2 text-gray-400" />
          Histórico
        </h3>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">Criado em</span>
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