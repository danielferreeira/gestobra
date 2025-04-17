import React, { useState } from 'react';
import { FaFileAlt, FaDownload, FaChartBar, FaBuilding, FaMoneyBillWave, FaBoxes, FaChartLine, FaExchangeAlt, FaClipboardList, FaWarehouse } from 'react-icons/fa';
import { 
  gerarRelatorioObras, 
  gerarRelatorioFinanceiro, 
  gerarRelatorioMateriais, 
  gerarRelatorioDesempenho,
  gerarRelatorioMovimentacoesMateriaisV1,
  gerarRelatorioMateriaisPorObra
} from '../services/relatoriosService';
import { getObras } from '../services/obrasService';
import { Toast } from '../components/Toast';
import TablesErrorInfo from '../components/TablesErrorInfo';

const Relatorios = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [obras, setObras] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState('success');
  const [tableError, setTableError] = useState({ show: false, tableName: '', message: '' });
  const [reportParams, setReportParams] = useState({
    dataInicio: '',
    dataFim: '',
    obraId: '',
    categoriaId: '',
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
    },
    {
      id: 'materiais_por_obra',
      nome: 'Materiais por Obra',
      descricao: 'Relatório detalhado de materiais utilizados por obra',
      icon: <FaWarehouse className="text-teal-500" />
    },
    {
      id: 'movimentacoes_materiais',
      nome: 'Movimentações de Materiais',
      descricao: 'Relatório de entradas e saídas de materiais',
      icon: <FaExchangeAlt className="text-orange-500" />
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

  // Carregar categorias de materiais
  const loadCategorias = async () => {
    try {
      // Lista de categorias predefinidas
      const categoriasList = [
        { id: 'material_hidraulico', nome: 'Material Hidráulico' },
        { id: 'material_eletrico', nome: 'Material Elétrico' },
        { id: 'estrutura', nome: 'Estrutura' },
        { id: 'acabamento', nome: 'Acabamento' },
        { id: 'pintura', nome: 'Pintura' },
        { id: 'ferragens', nome: 'Ferragens' },
        { id: 'ferramentas', nome: 'Ferramentas' },
        { id: 'equipamentos', nome: 'Equipamentos' },
        { id: 'cimento_argamassa', nome: 'Cimento e Argamassa' },
        { id: 'ceramica_porcelanato', nome: 'Cerâmica e Porcelanato' },
        { id: 'areia_brita', nome: 'Areia e Brita' },
        { id: 'madeira', nome: 'Madeira' },
        { id: 'epi', nome: 'EPI' },
        { id: 'outros', nome: 'Outros' }
      ];
      setCategorias(categoriasList);
    } catch (error) {
      console.error("Erro ao carregar categorias:", error);
      setError("Não foi possível carregar a lista de categorias.");
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
      categoriaId: '',
      formato: 'pdf'
    });
    
    // Carregar obras se necessário
    if (report.id === 'obras' || report.id === 'desempenho' || 
        report.id === 'materiais_por_obra' || report.id === 'movimentacoes_materiais') {
      await loadObras();
    }
    
    // Carregar categorias se necessário
    if (report.id === 'movimentacoes_materiais') {
      await loadCategorias();
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
      // Limpar erros anteriores
      setError(null);
      setTableError({ show: false, tableName: '', message: '' });
      
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
          case 'materiais_por_obra':
            if (!reportParams.obraId) {
              throw new Error('É necessário selecionar uma obra para gerar este relatório');
            }
            const materiaisPorObraResult = await gerarRelatorioMateriaisPorObra(reportParams.obraId, reportParams.formato);
            blob = materiaisPorObraResult.blob;
            break;
          case 'movimentacoes_materiais':
            blob = await gerarRelatorioMovimentacoesMateriaisV1(reportParams);
            break;
          default:
            throw new Error("Tipo de relatório inválido");
        }
        
        if (!blob) {
          throw new Error("Não foi possível gerar o relatório. Tente novamente mais tarde.");
        }
      } catch (error) {
        console.error('Erro ao gerar relatório:', error);
        
        // Verificar se é erro de tabela não existente
        if (error.message && error.message.includes('does not exist')) {
          // Extrair o nome da tabela do erro
          const match = error.message.match(/relation "([^"]+)" does not exist/);
          let tableName = 'desconhecida';
          
          if (match && match[1]) {
            tableName = match[1];
          } else if (error.message.includes('movimentacoes_materiais')) {
            tableName = 'movimentacoes_materiais';
          }
          
          setTableError({
            show: true,
            tableName: tableName,
            message: error.message
          });
          
          showToastMessage("Erro no banco de dados: tabela não encontrada", 'error');
          setLoading(false);
          return; // Não continuar com o processo
        }
        
        // Tratamento específico para outros erros de relacionamento no banco de dados
        if (error.message && error.message.includes('relationship between')) {
          setError("Erro de relacionamento no banco de dados. Verifique se todas as tabelas estão corretamente criadas e configuradas.");
          showToastMessage("Problema no banco de dados. Contate o administrador do sistema.", 'error');
        } else if (error.message && error.message.includes('does not exist')) {
          setError("A tabela necessária não existe no banco de dados: " + error.message);
          showToastMessage("Tabela não encontrada. Contate o administrador do sistema para criá-la.", 'error');
        } else {
          setError(error.message || "Erro ao gerar relatório. Verifique se existem dados para o período selecionado.");
          showToastMessage("Erro ao gerar relatório. Verifique se existem dados disponíveis.", 'error');
        }
        
        // Criar blob padrão para evitar erro
        const novoBlob = new Blob(["Erro ao gerar relatório. Por favor, tente novamente."], { type: "text/plain" });
        blob = novoBlob;
      }
      
      // Se houve erro de tabela, não prosseguir com o download
      if (tableError.show) {
        setLoading(false);
        return;
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
      
      showToastMessage(`Relatório ${selectedReport.nome} gerado com sucesso! Mostrando apenas dados reais existentes no sistema.`);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao processar relatório:', error);
      
      // Tratamento específico para erros conhecidos
      if (error.message && error.message.includes('relationship between')) {
        setError("Erro de estrutura no banco de dados. Algumas tabelas podem não existir ou não estão relacionadas corretamente.");
        showToastMessage("Problema estrutural no banco de dados. Contate o suporte técnico.", 'error');
      } else if (error.message && error.message.includes('does not exist')) {
        setError("A tabela necessária não existe no banco de dados: " + error.message);
        showToastMessage("Tabela não encontrada. Contate o administrador do sistema para criá-la.", 'error');
      } else if (error.message && error.message.includes('não encontrada')) {
        setError("Dados necessários não foram encontrados. Verifique se todos os registros existem no sistema.");
        showToastMessage("Dados não encontrados. Verifique os parâmetros do relatório.", 'warning');
      } else {
        setError(error.message || 'Erro ao gerar relatório. Tente novamente mais tarde.');
        showToastMessage('Erro ao gerar relatório', 'error');
      }
      
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
      
      {/* Erro de tabela não existente */}
      {tableError.show && (
        <TablesErrorInfo 
          tableName={tableError.tableName}
          errorMessage={tableError.message}
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
                {(selectedReport.id !== 'materiais_por_obra' || 
                 (selectedReport.id === 'materiais_por_obra' && selectedReport.id !== 'obras')) && (
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
                )}
                
                {(selectedReport.id === 'obras' || selectedReport.id === 'desempenho' || 
                  selectedReport.id === 'materiais_por_obra' || 
                  selectedReport.id === 'movimentacoes_materiais') && (
                  <div>
                    <label htmlFor="obraId" className="block text-sm font-medium text-gray-700">Obra</label>
                    <select
                      id="obraId"
                      name="obraId"
                      value={reportParams.obraId}
                      onChange={handleParamChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                      required={selectedReport.id === 'materiais_por_obra'}
                    >
                      <option value="">
                        {selectedReport.id === 'materiais_por_obra' 
                          ? 'Selecione uma obra' 
                          : 'Todas as obras'}
                      </option>
                      {obras.map(obra => (
                        <option key={obra.id} value={obra.id}>
                          {obra.nome}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                {selectedReport.id === 'movimentacoes_materiais' && (
                  <div>
                    <label htmlFor="categoriaId" className="block text-sm font-medium text-gray-700">Categoria de Material</label>
                    <select
                      id="categoriaId"
                      name="categoriaId"
                      value={reportParams.categoriaId}
                      onChange={handleParamChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="">Todas as categorias</option>
                      {categorias.map(categoria => (
                        <option key={categoria.id} value={categoria.id}>
                          {categoria.nome}
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
                    disabled={loading || (selectedReport.id === 'materiais_por_obra' && !reportParams.obraId)}
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
        
        <div className="mt-4 bg-yellow-50 p-3 rounded-lg border border-yellow-200">
          <h4 className="text-md font-medium text-yellow-800 mb-1">Importante</h4>
          <p className="text-yellow-700">
            Todos os relatórios exibem apenas dados reais existentes no sistema. 
            Se não houver dados cadastrados no período selecionado, o relatório poderá aparecer vazio ou com valores zerados.
            Para visualizar dados nos relatórios, é necessário cadastrar informações reais no sistema.
          </p>
          <p className="text-yellow-700 mt-2">
            <strong>Requisitos para relatórios:</strong> Os relatórios de Movimentações de Materiais e Materiais por Obra 
            necessitam que a tabela <code>movimentacoes_materiais</code> esteja criada no banco de dados.
            Caso ocorra um erro informando que a tabela não existe, contate o administrador do sistema.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Relatorios; 