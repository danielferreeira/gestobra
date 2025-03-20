import React, { useState, useEffect } from 'react';
import { FaCloudUploadAlt, FaCheck, FaSpinner, FaExclamationTriangle, FaFileInvoiceDollar } from 'react-icons/fa';
import { processarArquivoOrcamento, adicionarFornecedorFromOrcamento, adicionarMateriaisFromOrcamento } from '../services/materiaisService';
import { supabase } from '../services/supabaseClient';

const UploadOrcamento = ({ onSuccess, etapaId = null, obraId = null }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [processedData, setProcessedData] = useState(null);
  const [processStatus, setProcessStatus] = useState({
    step: 'idle', // idle, uploading, processing, fornecedor, materiais, success, error
    message: '',
    progress: 0
  });
  const [fornecedores, setFornecedores] = useState([]);
  const [fornecedorSelecionado, setFornecedorSelecionado] = useState(null);

  // Carregar lista de fornecedores
  useEffect(() => {
    const carregarFornecedores = async () => {
      try {
        const { data, error } = await supabase
          .from('fornecedores')
          .select('id, nome, cnpj')
          .order('nome');
        
        if (error) throw error;
        setFornecedores(data || []);
      } catch (err) {
        console.error('Erro ao carregar fornecedores:', err);
      }
    };
    
    carregarFornecedores();
  }, []);

  // Manipula a seleção de arquivo
  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    setError(null);
    setProcessedData(null);
    setProcessStatus({
      step: 'idle',
      message: 'Arquivo selecionado',
      progress: 0
    });
  };

  // Processa o arquivo de orçamento
  const handleProcessarOrcamento = async () => {
    if (!file) {
      setError('Selecione um arquivo para processar');
      return;
    }

    if (!fornecedorSelecionado) {
      setError('Selecione um fornecedor para continuar');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setProcessStatus({
        step: 'uploading',
        message: 'Enviando arquivo...',
        progress: 10
      });

      // 1. Fazer upload e processar o arquivo
      const resultado = await processarArquivoOrcamento(file);
      
      if (!resultado.success) {
        console.error("Erro no processamento do orçamento:", resultado);
        
        // Verificar se é um erro relacionado com a segurança (política de acesso)
        if (resultado.error && resultado.error.message) {
          if (resultado.error.message.includes("Bucket not found")) {
            throw new Error('Erro ao fazer upload do arquivo: Bucket não encontrado. Entre em contato com o administrador.');
          } else if (resultado.error.message.includes("row-level security policy")) {
            throw new Error('Erro de permissão: Você não tem permissão para enviar arquivos. Entre em contato com o administrador.');
          } else if (resultado.error.message.includes("violates")) {
            throw new Error('Erro de permissão ao criar ou acessar o bucket de armazenamento. Entre em contato com o administrador.');
          }
        }
        
        throw new Error(resultado.message || 'Erro ao processar o arquivo');
      }

      setProcessStatus({
        step: 'processing',
        message: 'Extraindo informações...',
        progress: 30
      });

      const { itens } = resultado.data;
      console.log('Dados extraídos do orçamento:',
        'Itens:', itens.length
      );

      // Armazenar os itens processados
      setProcessedData({
        itens: itens,
        fornecedor: fornecedores.find(f => f.id === fornecedorSelecionado)
      });
      
      // Usar o fornecedor selecionado manualmente
      const fornecedorId = fornecedorSelecionado;
      console.log('Usando fornecedor selecionado com ID:', fornecedorId);
      setProcessStatus({
        step: 'fornecedor',
        message: 'Usando fornecedor selecionado...',
        progress: 50
      });

      // 3. Processar materiais
      setProcessStatus({
        step: 'materiais',
        message: 'Processando materiais (verificando duplicatas)...',
        progress: 70
      });

      console.log(`Iniciando processamento de ${itens.length} materiais para o fornecedor ${fornecedorId}...`);
      const materiaisResult = await adicionarMateriaisFromOrcamento(itens, fornecedorId, etapaId, obraId);
      console.log('Resultado do processamento de materiais:', materiaisResult);
      
      // Mesmo com erros parciais, continuamos
      setProcessStatus({
        step: 'success',
        message: materiaisResult.message,
        progress: 100
      });

      // Chamar callback de sucesso com os dados processados
      if (onSuccess) {
        console.log('Enviando dados processados para o componente pai');
        onSuccess({
          fornecedor: fornecedores.find(f => f.id === fornecedorId),
          materiais: materiaisResult.data,
          erros: materiaisResult.erros,
          etapaId,
          obraId
        });
      } else {
        console.warn('Callback onSuccess não foi fornecido');
      }

    } catch (err) {
      console.error('Erro no processamento do orçamento:', err);
      setError(err.message || 'Erro ao processar o orçamento');
      setProcessStatus({
        step: 'error',
        message: err.message,
        progress: 0
      });
    } finally {
      setLoading(false);
    }
  };

  // Renderiza o conteúdo do componente com base no status
  const renderContent = () => {
    if (processStatus.step === 'success') {
      // Contagem de itens novos vs. atualizados
      const novosItens = processedData?.materiais?.filter(m => m.status === 'novo')?.length || 0;
      const atualizadosItens = processedData?.materiais?.filter(m => m.status === 'atualizado')?.length || 0;
      
      return (
        <div className="flex flex-col items-center p-6 bg-green-50 rounded-lg border border-green-200">
          <FaCheck className="text-3xl text-green-500 mb-2" />
          <h3 className="text-lg font-semibold text-green-700 mb-1">Processamento concluído!</h3>
          <p className="text-sm text-green-600 mb-2">{processStatus.message}</p>
          
          {/* Resumo do processamento */}
          <div className="bg-white p-3 rounded border border-green-200 mb-4 w-full">
            <p className="text-sm text-gray-700">
              <span className="font-medium">Resumo:</span>{' '}
              {novosItens > 0 && <span className="text-green-600">{novosItens} materiais novos adicionados. </span>}
              {atualizadosItens > 0 && <span className="text-blue-600">{atualizadosItens} materiais existentes atualizados. </span>}
              {processedData?.erros?.length > 0 && 
                <span className="text-red-600">{processedData.erros.length} materiais com erro. </span>
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              O sistema evitou duplicatas utilizando verificação inteligente de nomes similares.
            </p>
          </div>
          
          <div className="w-full mt-2">
            <h4 className="font-medium text-green-800 mb-1">Fornecedor:</h4>
            <div className="bg-white p-3 rounded border border-green-200 mb-3">
              <p className="text-sm">{processedData.fornecedor.nome}</p>
              <p className="text-xs text-gray-500">CNPJ: {processedData.fornecedor.cnpj}</p>
            </div>
            
            <h4 className="font-medium text-green-800 mb-1">Itens processados ({processedData.itens.length}):</h4>
            <div className="max-h-40 overflow-y-auto bg-white p-2 rounded border border-green-200">
              {processedData.itens.map((item, index) => (
                <div key={index} className="text-xs p-2 border-b border-green-100 last:border-0">
                  <span className="font-medium">{item.descricao}</span> - 
                  {item.quantidade} {item.unidade} - 
                  R$ {item.valor_unitario.toFixed(2)}
                </div>
              ))}
            </div>
          </div>
          
          <button
            onClick={() => {
              setFile(null);
              setProcessedData(null);
              setProcessStatus({
                step: 'idle',
                message: '',
                progress: 0
              });
            }}
            className="mt-4 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Processar outro orçamento
          </button>
        </div>
      );
    }
    
    if (processStatus.step === 'error') {
      return (
        <div className="flex flex-col items-center p-6 bg-red-50 rounded-lg border border-red-200">
          <FaExclamationTriangle className="text-3xl text-red-500 mb-2" />
          <h3 className="text-lg font-semibold text-red-700 mb-1">Erro no processamento</h3>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          
          <button
            onClick={() => {
              setFile(null);
              setError(null);
              setProcessStatus({
                step: 'idle',
                message: '',
                progress: 0
              });
            }}
            className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          >
            Tentar novamente
          </button>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col items-center p-6 bg-blue-50 rounded-lg border border-blue-200">
        <FaCloudUploadAlt className="text-5xl text-blue-500 mb-3" />
        <h3 className="text-lg font-semibold text-blue-700 mb-2">Upload de Orçamento</h3>
        <p className="text-sm text-blue-600 mb-4 text-center">
          Faça upload de um arquivo de orçamento para importar automaticamente materiais.
        </p>
        
        <div className="w-full mb-4">
          <label className="block">
            <span className="sr-only">Escolher arquivo</span>
            <input
              type="file"
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
              accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.png"
              onChange={handleFileChange}
              disabled={loading}
            />
          </label>
        </div>
        
        {file && (
          <div className="w-full mb-4 p-3 bg-white rounded-md border border-blue-200">
            <div className="flex items-center">
              <FaFileInvoiceDollar className="text-blue-500 mr-2" />
              <span className="text-sm truncate">{file.name}</span>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {(file.size / 1024).toFixed(2)} KB
            </div>
          </div>
        )}
        
        {/* Seleção de fornecedor (agora obrigatória) */}
        <div className="w-full mb-4">
          <label className="block text-sm text-blue-700 mb-1 font-medium">
            Selecione um fornecedor: <span className="text-red-500">*</span>
          </label>
          <select
            value={fornecedorSelecionado || ''}
            onChange={(e) => setFornecedorSelecionado(e.target.value)}
            className={`w-full p-2 border rounded text-sm ${!fornecedorSelecionado && file ? 'border-red-300 bg-red-50' : 'border-blue-200'}`}
            disabled={loading}
            required
          >
            <option value="">Selecione um fornecedor</option>
            {fornecedores.map(fornecedor => (
              <option key={fornecedor.id} value={fornecedor.id}>
                {fornecedor.nome} {fornecedor.cnpj ? `(${fornecedor.cnpj})` : ''}
              </option>
            ))}
          </select>
          {!fornecedorSelecionado && file && (
            <p className="text-xs text-red-600 mt-1">
              É obrigatório selecionar um fornecedor para processar o orçamento.
            </p>
          )}
        </div>
        
        {processStatus.step !== 'idle' && processStatus.step !== 'success' && processStatus.step !== 'error' && (
          <div className="w-full mb-4">
            <div className="flex justify-between text-xs text-blue-600 mb-1">
              <span>{processStatus.message}</span>
              <span>{processStatus.progress}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div 
                className="bg-blue-600 h-2.5 rounded-full" 
                style={{ width: `${processStatus.progress}%` }}
              ></div>
            </div>
          </div>
        )}
        
        <button
          onClick={handleProcessarOrcamento}
          disabled={loading || !file || !fornecedorSelecionado}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
            loading || !file || !fornecedorSelecionado
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {loading ? (
            <>
              <FaSpinner className="animate-spin mr-2" />
              Processando...
            </>
          ) : (
            <>
              Processar Orçamento
            </>
          )}
        </button>
        
        <p className="mt-3 text-xs text-gray-500 text-center">
          Formatos suportados: PDF, Excel, Word e imagens (JPG, PNG)
        </p>
      </div>
    );
  };

  return (
    <div className="w-full">
      {renderContent()}
    </div>
  );
};

export default UploadOrcamento; 