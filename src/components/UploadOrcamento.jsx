import React, { useState } from 'react';
import { FaCloudUploadAlt, FaCheck, FaSpinner, FaExclamationTriangle, FaFileInvoiceDollar } from 'react-icons/fa';
import { processarArquivoOrcamento, adicionarFornecedorFromOrcamento, adicionarMateriaisFromOrcamento } from '../services/materiaisService';

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

      const { fornecedor, itens } = resultado.data;

      setProcessedData(resultado.data);
      
      // 2. Processar fornecedor
      setProcessStatus({
        step: 'fornecedor',
        message: 'Processando dados do fornecedor...',
        progress: 50
      });

      const fornecedorResult = await adicionarFornecedorFromOrcamento(fornecedor);
      
      if (!fornecedorResult.success) {
        throw new Error(fornecedorResult.message || 'Erro ao processar fornecedor');
      }

      const fornecedorId = fornecedorResult.data.id;

      // 3. Processar materiais
      setProcessStatus({
        step: 'materiais',
        message: 'Processando materiais...',
        progress: 70
      });

      const materiaisResult = await adicionarMateriaisFromOrcamento(itens, fornecedorId, etapaId, obraId);
      
      // Mesmo com erros parciais, continuamos
      setProcessStatus({
        step: 'success',
        message: materiaisResult.message,
        progress: 100
      });

      // Chamar callback de sucesso com os dados processados
      if (onSuccess) {
        onSuccess({
          fornecedor: {
            ...fornecedor,
            id: fornecedorId
          },
          materiais: materiaisResult.data,
          erros: materiaisResult.erros,
          etapaId,
          obraId
        });
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
      return (
        <div className="flex flex-col items-center p-6 bg-green-50 rounded-lg border border-green-200">
          <FaCheck className="text-3xl text-green-500 mb-2" />
          <h3 className="text-lg font-semibold text-green-700 mb-1">Processamento concluído!</h3>
          <p className="text-sm text-green-600 mb-4">{processStatus.message}</p>
          
          <div className="w-full mt-2">
            <h4 className="font-medium text-green-800 mb-1">Fornecedor processado:</h4>
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
          disabled={loading || !file}
          className={`w-full py-2 px-4 rounded-md flex items-center justify-center ${
            loading || !file
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