import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FaExclamationTriangle, FaArrowLeft, FaInfoCircle } from 'react-icons/fa';

const DetalheObraEstatico = ({ id }) => {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Cabeçalho */}
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
        <button
          onClick={() => {}} // Placeholder para função de diagnóstico
          className="text-sm text-gray-600 hover:text-gray-900 flex items-center"
        >
          <span className="mr-2">⚡</span>
          Executar Diagnóstico
        </button>
      </div>

      {/* Alerta de Manutenção */}
      <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-6">
        <div className="flex">
          <FaExclamationTriangle className="text-yellow-400 text-lg mr-3" />
          <p className="text-yellow-700">
            Esta página está temporariamente em manutenção. Estamos trabalhando para resolver problemas técnicos.
          </p>
        </div>
      </div>

      {/* Informações Básicas */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center">
          <FaInfoCircle className="mr-2 text-gray-500" />
          Informações Básicas
        </h2>
        <div className="space-y-3">
          <div>
            <span className="text-sm text-gray-500">ID da Obra</span>
            <p className="text-gray-900 font-mono">{id}</p>
          </div>
        </div>
      </div>

      {/* Mensagem Central */}
      <div className="text-center mt-8 space-y-4">
        <p className="text-gray-600">
          Esta é uma versão estática da página de detalhes da obra.
        </p>
        <p className="text-gray-600">
          Para acessar todas as funcionalidades, por favor volte mais tarde.
        </p>
        <button
          onClick={() => navigate('/obras')}
          className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Voltar para Lista de Obras
        </button>
      </div>
    </div>
  );
};

export default DetalheObraEstatico; 