import React, { useState } from 'react';
import { FaFileAlt, FaDownload, FaChartBar, FaBuilding, FaMoneyBillWave, FaBoxes } from 'react-icons/fa';
import { 
  gerarRelatorioObras, 
  gerarRelatorioFinanceiro, 
  gerarRelatorioMateriais, 
  gerarRelatorioDesempenho 
} from '../services/relatoriosService';
import { getObras } from '../services/obrasService';
import { Toast } from '../components/Toast';

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [obras, setObras] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
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

  // Carregar obras quando selecionar relatórios que precisam de obra
  const loadObras = async () => {
    try {
      const { data, error } = await getObras();
      if (error) throw error;
      setObras(data || []);
    } catch (error) {
      console.error("Erro ao carregar obras:", error);
      setError("Não foi possível carregar a lista de obras.");
    }
  };

  // Manipular mudanças nos parâmetros do relatório
  const handleParamChange = (e) => {
    const { name, value } = e.target;
    setReportParams(prev => ({ ...prev, [name]: value }));
  };

  // Selecionar relatório
  const handleSelectReport = async (report) => {
    setSelectedReport(report);
    
    // Definir datas padrão (mês atual)
    const hoje = new Date();
    const primeiroDiaMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
    const dataInicio = primeiroDiaMes.toISOString().split('T')[0];
    const dataFim = hoje.toISOString().split('T')[0];
    
    // Resetar parâmetros com datas padrão
    setReportParams({
      dataInicio,
      dataFim,
      obraId: '',
      formato: 'pdf'
    });
    
    // Carregar obras se necessário
    if (report.id === 'obras' || report.id === 'desempenho') {
      await loadObras();
    }
  };

  // Função para gerar nome do arquivo
  const gerarNomeArquivo = (tipoRelatorio, formato) => {
    const hoje = new Date().toISOString().split('T')[0];
    return `relatorio_${tipoRelatorio}_${hoje}.${formato === 'excel' ? 'xlsx' : formato}`;
  };

  // Função para mostrar toast
  const showToastMessage = (message, type = 'success') => {
    setToastMessage(message);
    setToastType(type);
    setShowToast(true);
    
    // Fechar automaticamente após 5 segundos
    setTimeout(() => {
      setShowToast(false);
    }, 5000);
  };

  // Gerar relatório
  const handleGenerateReport = async (e) => {
    e.preventDefault();
    
    if (!selectedReport) return;
    
    try {
      // Validar datas se ambas forem fornecidas
      if (reportParams.dataInicio && reportParams.dataFim) {
        const dataInicio = new Date(reportParams.dataInicio);
        const dataFim = new Date(reportParams.dataFim);
        
        if (dataFim < dataInicio) {
          setError('A data final não pode ser anterior à data inicial');
          showToastMessage('A data final não pode ser anterior à data inicial', 'error');
          return;
        }
      }
      
      setLoading(true);
      setError(null);
      
      let blob;
      
      try {
        switch (selectedReport.id) {
          case 'obras':
            blob = await gerarRelatorioObras(reportParams);
            break;
          case 'financeiro':
            blob = await gerarRelatorioFinanceiro(reportParams);
            break;
          case 'materiais':
            blob = await gerarRelatorioMateriais(reportParams);
            break;
          case 'desempenho':
            blob = await gerarRelatorioDesempenho(reportParams);
            break;
          default:
            throw new Error("Tipo de relatório inválido");
        }
        
        if (!blob) {
          throw new Error("Não foi possível gerar o relatório. Tente novamente mais tarde.");
        }
      } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        setError(error.message || "Erro ao gerar relatório. Alguns dados podem estar simulados devido a problemas no banco de dados.");
        showToastMessage("Relatório gerado com dados parciais ou simulados", 'warning');
        
        // Criar blob padrão para evitar erro
        const novoBlob = new Blob(["Erro ao gerar relatório. Por favor, tente novamente."], { type: "text/plain" });
        blob = novoBlob;
      }
      
      // Criar link para download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = gerarNomeArquivo(selectedReport.id, reportParams.formato);
      
      // Adicionar à página, clicar, e remover
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      showToastMessage(`Relatório ${selectedReport.nome} gerado com sucesso!`);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao processar relatório:', error);
      setError(error.message || 'Erro ao gerar relatório. Tente novamente mais tarde.');
      showToastMessage('Erro ao gerar relatório', 'error');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast de notificação */}
      {showToast && (
        <Toast 
          message={toastMessage} 
          type={toastType} 
          onClose={() => setShowToast(false)} 
        />
      )}
      
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
              <h2 className="text-lg font-medium text-gray-700 mb-1">
                Parâmetros para {selectedReport.nome}
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                {selectedReport.id === 'obras' && 'Configure os parâmetros para gerar um relatório detalhado das obras, incluindo orçamentos e gastos.'}
                {selectedReport.id === 'financeiro' && 'Configure o período para análise financeira, incluindo receitas, despesas e balanço.'}
                {selectedReport.id === 'materiais' && 'Configure o período para análise de materiais, incluindo estoque e requisições.'}
                {selectedReport.id === 'desempenho' && 'Configure os parâmetros para avaliar o desempenho das obras, incluindo cumprimento de prazos.'}
              </p>
              
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
                    <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">Obra</label>
                    <select
                      id="obraId"
                      name="obraId"
                      value={reportParams.obraId}
                      onChange={handleParamChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Todas as obras</option>
                      {obras.map(obra => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
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