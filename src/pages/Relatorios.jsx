import { useState } from 'react';
import { FaFileAlt, FaDownload, FaChartBar, FaBuilding, FaMoneyBillWave, FaBoxes } from 'react-icons/fa';

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [reportParams, setReportParams] = useState({
    dataInicio: '',
    dataFim: '',
    obraId: '',
    formato: 'pdf'
  });

  // Lista de relatórios disponíveis
  const relatoriosDisponiveis = [
    {
      id: 'obras',
      nome: 'Relatório de Obras',
      descricao: 'Relatório detalhado de todas as obras, incluindo status, orçamento e progresso.',
      icon: <FaBuilding className="text-blue-500" />
    },
    {
      id: 'financeiro',
      nome: 'Relatório Financeiro',
      descricao: 'Relatório de despesas e receitas, com balanço financeiro por período.',
      icon: <FaMoneyBillWave className="text-green-500" />
    },
    {
      id: 'materiais',
      nome: 'Relatório de Materiais',
      descricao: 'Relatório de estoque de materiais, incluindo alertas de estoque baixo.',
      icon: <FaBoxes className="text-orange-500" />
    },
    {
      id: 'desempenho',
      nome: 'Relatório de Desempenho',
      descricao: 'Relatório de desempenho das obras, comparando planejado vs. realizado.',
      icon: <FaChartBar className="text-purple-500" />
    }
  ];

  // Manipular mudanças nos parâmetros do relatório
  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setReportParams(prev => ({ ...prev, [name]: value }));
  };

  // Selecionar relatório
  const handleSelectReport = (report) => {
    setSelectedReport(report);
    // Resetar parâmetros
    setReportParams({
      dataInicio: '',
      dataFim: '',
      obraId: '',
      formato: 'pdf'
    });
  };

  // Gerar relatório
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!selectedReport) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Aqui seria implementada a lógica para gerar o relatório
      // Por enquanto, apenas simulamos um atraso
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Simular download (em uma implementação real, isso seria substituído pelo download real do arquivo)
      alert(`Relatório ${selectedReport.nome} gerado com sucesso!`);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao gerar relatório:', error);
      setError(error.message || 'Erro ao gerar relatório');
      setLoading(false);
    }
  };

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
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Relatórios</h1>
        <p className="mt-2 text-gray-600">Selecione um relatório para gerar</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Lista de relatórios disponíveis */}
        <div>
          <h2 className="text-lg font-medium text-gray-700 mb-4">Relatórios Disponíveis</h2>
          <div className="space-y-4">
            {relatoriosDisponiveis.map(report => (
              <div 
                key={report.id}
                className={`p-4 border rounded-lg cursor-pointer transition-all ${
                  selectedReport?.id === report.id 
                    ? 'border-blue-500 bg-blue-50' 
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                }`}
                onClick={() => handleSelectReport(report)}
              >
                <div className="flex items-start">
                  <div className="flex-shrink-0 mt-1">
                    {report.icon}
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-medium text-gray-900">{report.nome}</h3>
                    <p className="text-sm text-gray-500">{report.descricao}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Formulário de parâmetros do relatório */}
        <div>
          {selectedReport ? (
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h2 className="text-lg font-medium text-gray-700 mb-4">
                Parâmetros para {selectedReport.nome}
              </h2>
              
              <form onSubmit={handleGenerateReport} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="dataInicio" className="block text-sm font-medium text-gray-700">Data Inicial</label>
                    <input
                      type="date"
                      id="dataInicio"
                      name="dataInicio"
                      value={reportParams.dataInicio}
                      onChange={handleParamChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="dataFim" className="block text-sm font-medium text-gray-700">Data Final</label>
                    <input
                      type="date"
                      id="dataFim"
                      name="dataFim"
                      value={reportParams.dataFim}
                      onChange={handleParamChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                {(selectedReport.id === 'obras' || selectedReport.id === 'desempenho') && (
                  <div>
                    <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">ID da Obra (opcional)</label>
                    <input
                      type="text"
                      id="obraId"
                      name="obraId"
                      value={reportParams.obraId}
                      onChange={handleParamChange}
                      placeholder="Deixe em branco para todas as obras"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                )}
                
                <div>
                  <label htmlFor="formato" className="block text-sm font-medium text-gray-700">Formato</label>
                  <select
                    id="formato"
                    name="formato"
                    value={reportParams.formato}
                    onChange={handleParamChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  >
                    <option value="pdf">PDF</option>
                    <option value="excel">Excel</option>
                    <option value="csv">CSV</option>
                  </select>
                </div>
                
                <div className="pt-4">
                  <button
                    type="submit"
                    className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                        Gerando...
                      </>
                    ) : (
                      <>
                        <FaDownload className="mr-2" />
                        Gerar Relatório
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center h-full">
              <FaFileAlt className="text-gray-400 text-5xl mb-4" />
              <p className="text-gray-500 text-center">
                Selecione um relatório ao lado para configurar os parâmetros
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Dicas */}
      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
        <h3 className="text-lg font-medium text-blue-800 mb-2">Dicas para Relatórios</h3>
        <ul className="list-disc pl-5 text-blue-700 space-y-1">
          <li>Para relatórios financeiros, especifique um período para resultados mais precisos.</li>
          <li>Relatórios de desempenho são mais úteis quando comparados com períodos anteriores.</li>
          <li>Você pode exportar os dados em diferentes formatos para análise posterior.</li>
          <li>Para análises específicas, utilize os filtros disponíveis em cada relatório.</li>
        </ul>
      </div>
    </div>
  );
};

export default Relatorios; 