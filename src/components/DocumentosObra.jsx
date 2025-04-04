import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FaPlus, FaEdit, FaTrash, FaDownload, FaFile, FaFileAlt, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel, FaSearch, FaFilter, FaHistory, FaShare, FaEye } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';

const DocumentosObra = ({ obraId }) => {
  const [documentos, setDocumentos] = useState([]);
  const [filteredDocumentos, setFilteredDocumentos] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [currentDocumento, setCurrentDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTipo, setSelectedTipo] = useState('todos');
  const [sortBy, setSortBy] = useState('data');
  const [sortOrder, setSortOrder] = useState('desc');
  const fileInputRef = useRef(null);
  const dropZoneRef = useRef(null);
  
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    tipo: 'contrato',
    arquivo: null,
    tags: [],
    versao: '1.0'
  });
  
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Configurações de upload
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB
  const ALLOWED_FILE_TYPES = {
    'application/pdf': '.pdf',
    'image/jpeg': '.jpg,.jpeg',
    'image/png': '.png',
    'application/msword': '.doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
    'application/vnd.ms-excel': '.xls',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx'
  };

  // Carregar documentos da obra
  useEffect(() => {
    const fetchDocumentos = async () => {
      if (!obraId) return;
      
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('documentos')
          .select('*')
          .eq('obra_id', obraId)
          .order('created_at', { ascending: false });
        
        if (error) {
          throw error;
        }
        
        setDocumentos(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar documentos:', error);
        setError(error.message || 'Erro ao carregar documentos');
        setLoading(false);
      }
    };
    
    fetchDocumentos();
  }, [obraId]);

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // Obter ícone com base no tipo de arquivo
  const getFileIcon = (fileName) => {
    if (!fileName) return <FaFile />;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFilePdf className="text-red-500" />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFileImage className="text-green-500" />;
      case 'doc':
      case 'docx':
        return <FaFileWord className="text-blue-500" />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel className="text-green-700" />;
      default:
        return <FaFileAlt className="text-gray-500" />;
    }
  };

  // Obter label do tipo de documento
  const getTipoLabel = (tipo) => {
    const tipoMap = {
      'contrato': { label: 'Contrato', color: 'bg-blue-100 text-blue-800' },
      'planta': { label: 'Planta', color: 'bg-green-100 text-green-800' },
      'orcamento': { label: 'Orçamento', color: 'bg-yellow-100 text-yellow-800' },
      'nota_fiscal': { label: 'Nota Fiscal', color: 'bg-purple-100 text-purple-800' },
      'alvara': { label: 'Alvará', color: 'bg-red-100 text-red-800' },
      'outro': { label: 'Outro', color: 'bg-gray-100 text-gray-800' }
    };
    
    return tipoMap[tipo] || { label: tipo, color: 'bg-gray-100 text-gray-800' };
  };

  // Função para filtrar e ordenar documentos
  const filterAndSortDocumentos = useCallback(() => {
    let filtered = [...documentos];
    
    // Aplicar filtro por tipo
    if (selectedTipo !== 'todos') {
      filtered = filtered.filter(doc => doc.tipo === selectedTipo);
    }
    
    // Aplicar busca
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(doc => 
        doc.titulo?.toLowerCase().includes(term) ||
        doc.descricao?.toLowerCase().includes(term) ||
        doc.arquivo_nome?.toLowerCase().includes(term) ||
        (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(term)))
      );
    }
    
    // Aplicar ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'nome':
          comparison = (a.titulo || '').localeCompare(b.titulo || '');
          break;
        case 'tipo':
          comparison = (a.tipo || '').localeCompare(b.tipo || '');
          break;
        case 'data':
        default:
          comparison = new Date(b.created_at) - new Date(a.created_at);
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    setFilteredDocumentos(filtered);
  }, [documentos, selectedTipo, searchTerm, sortBy, sortOrder]);

  useEffect(() => {
    filterAndSortDocumentos();
  }, [documentos, selectedTipo, searchTerm, sortBy, sortOrder, filterAndSortDocumentos]);

  // Manipulador de drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.add('border-blue-500');
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('border-blue-500');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    dropZoneRef.current?.classList.remove('border-blue-500');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelection(files[0]);
    }
  };

  // Validação de arquivo
  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'Nenhum arquivo selecionado' };
    
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'Arquivo muito grande. Tamanho máximo: 50MB' };
    }
    
    if (!Object.keys(ALLOWED_FILE_TYPES).includes(file.type)) {
      return { valid: false, error: 'Tipo de arquivo não suportado' };
    }
    
    return { valid: true };
  };

  const handleFileSelection = (file) => {
    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }
    
    setFormData(prev => ({ ...prev, arquivo: file }));
    setError(null);
  };

  // Preview do documento
  const handlePreview = (documento) => {
    setCurrentDocumento(documento);
    setShowPreviewModal(true);
  };

  // Compartilhar documento
  const handleShare = async (documento) => {
    try {
      // Gerar link temporário
      const { data, error } = await supabase.storage
        .from('documentos')
        .createSignedUrl(documento.arquivo_url, 3600); // Link válido por 1 hora
      
      if (error) throw error;
      
      // Copiar link para clipboard
      await navigator.clipboard.writeText(data.signedUrl);
      alert('Link de compartilhamento copiado para a área de transferência!');
    } catch (error) {
      console.error('Erro ao compartilhar documento:', error);
      setError('Erro ao gerar link de compartilhamento');
    }
  };

  // Manipular evento de clique em editar
  const handleEdit = (documento) => {
    setCurrentDocumento(documento);
    
    // Inicialize as tags como um array vazio se for null ou undefined
    const documentTags = Array.isArray(documento.tags) ? documento.tags : [];
    
    setFormData({
      nome: documento.titulo || documento.nome || '',
      descricao: documento.descricao || '',
      tipo: documento.tipo || 'outro',
      arquivo: null,
      tags: documentTags,
      versao: documento.versao || '1.0'
    });
    
    setShowModal(true);
  };

  // Abrir o modal para criar um novo documento
  const openModal = () => {
    setCurrentDocumento(null);
    setFormData({
      nome: '',
      descricao: '',
      tipo: 'contrato',
      arquivo: null,
      tags: [],
      versao: '1.0'
    });
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentDocumento(null);
    setUploadProgress(0);
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Enviar formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Preparar o arquivo para upload
      if (!currentDocumento && !formData.arquivo) {
        throw new Error('Selecione um arquivo para upload');
      }
      
      // Upload do arquivo
      let publicUrl = '';
      
      if (formData.arquivo) {
        const file = formData.arquivo;
        const fileExt = file.name.split('.').pop();
        const fileName = `${obraId}/${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${fileName}`;
        
        // Upload para o bucket
        const { error: uploadError } = await supabase.storage
          .from('documentos')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              setUploadProgress(percent);
            }
          });
        
        if (uploadError) {
          throw uploadError;
        }
        
        // Obter URL pública
        const { data: urlData } = supabase.storage
          .from('documentos')
          .getPublicUrl(filePath);
        
        publicUrl = urlData.publicUrl;
      }
      
      // Inserir ou atualizar registro no banco
      if (currentDocumento) {
        // Atualizar documento existente
        const updateData = {
          titulo: formData.nome,
          descricao: formData.descricao,
          tipo: formData.tipo,
          updated_at: new Date()
        };
        
        // Adicionar URL apenas se um novo arquivo foi enviado
        if (publicUrl) {
          updateData.arquivo_url = publicUrl;
          updateData.arquivo_nome = formData.arquivo.name;
        }
        
        const { error: updateError } = await supabase
          .from('documentos')
          .update(updateData)
          .eq('id', currentDocumento.id);
        
        if (updateError) {
          throw updateError;
        }
      } else {
        // Inserir novo documento
        const insertData = {
          obra_id: obraId,
          titulo: formData.nome,
          descricao: formData.descricao,
          tipo: formData.tipo,
          arquivo_url: publicUrl,
          arquivo_nome: formData.arquivo.name,
          created_at: new Date()
        };
        
        // Tentar usar método simples de insert
        const { error: insertError } = await supabase
          .from('documentos')
          .insert([insertData]);
        
        if (insertError) {
          console.error('Erro ao inserir documento:', insertError);
          throw new Error(`Não foi possível salvar o documento: ${insertError.message}`);
        }
      }
      
      // Recarregar lista de documentos
      const { data: refreshData, error: refreshError } = await supabase
        .from('documentos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      
      if (refreshError) {
        throw refreshError;
      }
      
      // Atualizar estado e fechar modal
      setDocumentos(refreshData || []);
      closeModal();
      
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      setError(error.message || 'Erro ao salvar documento');
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  // Excluir documento
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este documento?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      // Obter o documento para saber o caminho do arquivo
      const { data: documento, error: getError } = await supabase
        .from('documentos')
        .select('*')
        .eq('id', id)
        .single();
      
      if (getError) {
        throw getError;
      }
      
      // Extrair o caminho do arquivo da URL
      if (documento.arquivo_url) {
        const url = documento.arquivo_url;
        const path = url.split('/').slice(-2).join('/');
        
        // Excluir o arquivo do Storage
        const { error: storageError } = await supabase.storage
          .from('documentos')
          .remove([path]);
        
        if (storageError) {
          console.error('Erro ao excluir arquivo:', storageError);
          // Continuar mesmo com erro no storage
        }
      }
      
      // Excluir o registro do banco de dados
      const { error } = await supabase
        .from('documentos')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      // Recarregar documentos
      const { data, error: fetchError } = await supabase
        .from('documentos')
        .select('*')
        .eq('obra_id', obraId)
        .order('created_at', { ascending: false });
      
      if (fetchError) {
        throw fetchError;
      }
      
      setDocumentos(data || []);
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      setError(error.message || 'Erro ao excluir documento');
    } finally {
      setLoading(false);
    }
  };

  // Baixar documento
  const handleDownload = (documento) => {
    window.open(documento.arquivo_url || documento.url, '_blank');
  };

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Documentos da Obra</h2>
        <button
          onClick={openModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" /> Adicionar Documento
        </button>
      </div>

      {/* Barra de pesquisa e filtros */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <input
              type="text"
              placeholder="Pesquisar documentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-md"
            />
            <FaSearch className="absolute left-3 top-3 text-gray-400" />
          </div>
        </div>
        
        <select
          value={selectedTipo}
          onChange={(e) => setSelectedTipo(e.target.value)}
          className="border rounded-md px-4 py-2"
        >
          <option value="todos">Todos os tipos</option>
          <option value="contrato">Contratos</option>
          <option value="planta">Plantas</option>
          <option value="orcamento">Orçamentos</option>
          <option value="nota_fiscal">Notas Fiscais</option>
          <option value="alvara">Alvarás</option>
          <option value="outro">Outros</option>
        </select>
        
        <select
          value={`${sortBy}-${sortOrder}`}
          onChange={(e) => {
            const [field, order] = e.target.value.split('-');
            setSortBy(field);
            setSortOrder(order);
          }}
          className="border rounded-md px-4 py-2"
        >
          <option value="data-desc">Mais recentes</option>
          <option value="data-asc">Mais antigos</option>
          <option value="nome-asc">Nome (A-Z)</option>
          <option value="nome-desc">Nome (Z-A)</option>
          <option value="tipo-asc">Tipo (A-Z)</option>
          <option value="tipo-desc">Tipo (Z-A)</option>
        </select>
      </div>

      {/* Lista de documentos */}
      {loading && documentos.length === 0 ? (
        <div className="flex justify-center p-4">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : error ? (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      ) : filteredDocumentos.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          {searchTerm || selectedTipo !== 'todos' 
            ? 'Nenhum documento encontrado com os filtros aplicados.'
            : 'Nenhum documento cadastrado para esta obra.'}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Documento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Tipo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data de Upload
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocumentos.map((documento) => {
                const tipoInfo = getTipoLabel(documento.tipo);
                const fileIcon = getFileIcon(documento.arquivo_nome);
                
                return (
                  <tr key={documento.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10 flex items-center justify-center">
                          {fileIcon}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">
                            {documento.titulo || documento.nome}
                          </div>
                          {documento.descricao && (
                            <div className="text-sm text-gray-500">{documento.descricao}</div>
                          )}
                          {documento.tags && documento.tags.length > 0 && (
                            <div className="flex gap-1 mt-1">
                              {documento.tags.map((tag, index) => (
                                <span
                                  key={index}
                                  className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${tipoInfo.color}`}>
                        {tipoInfo.label}
                      </span>
                      {documento.versao && (
                        <span className="ml-2 text-xs text-gray-500">
                          v{documento.versao}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDate(documento.created_at)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handlePreview(documento)}
                          className="text-gray-600 hover:text-gray-900"
                          title="Visualizar"
                        >
                          <FaEye />
                        </button>
                        <button
                          onClick={() => handleDownload(documento)}
                          className="text-green-600 hover:text-green-900"
                          title="Download"
                        >
                          <FaDownload />
                        </button>
                        <button
                          onClick={() => handleShare(documento)}
                          className="text-green-600 hover:text-green-900"
                          title="Compartilhar"
                        >
                          <FaShare />
                        </button>
                        <button
                          onClick={() => handleEdit(documento)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(documento.id)}
                          className="text-red-600 hover:text-red-900"
                          title="Excluir"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para adicionar/editar documento */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {currentDocumento ? 'Editar Documento' : 'Adicionar Documento'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nome">
                  Nome do Documento
                </label>
                <input
                  type="text"
                  id="nome"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao">
                  Descrição
                </label>
                <textarea
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  rows="3"
                ></textarea>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tipo">
                  Tipo de Documento
                </label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="contrato">Contrato</option>
                  <option value="planta">Planta</option>
                  <option value="orcamento">Orçamento</option>
                  <option value="nota_fiscal">Nota Fiscal</option>
                  <option value="alvara">Alvará</option>
                  <option value="outro">Outro</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="tags">
                  Tags (separadas por vírgula)
                </label>
                <input
                  type="text"
                  id="tags"
                  name="tags"
                  value={Array.isArray(formData.tags) ? formData.tags.join(', ') : ''}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    tags: e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
                  }))}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  placeholder="Ex: importante, revisão, aprovado"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="versao">
                  Versão
                </label>
                <input
                  type="text"
                  id="versao"
                  name="versao"
                  value={formData.versao}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  pattern="^\d+\.\d+$"
                  placeholder="Ex: 1.0"
                  title="Use o formato: X.Y (Ex: 1.0, 2.1)"
                />
              </div>
              
              <div 
                ref={dropZoneRef}
                className="mb-4 border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-500 transition-colors"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  id="arquivo"
                  name="arquivo"
                  ref={fileInputRef}
                  onChange={(e) => handleFileSelection(e.target.files[0])}
                  className="hidden"
                  accept={Object.values(ALLOWED_FILE_TYPES).join(',')}
                />
                
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2 px-4 rounded inline-flex items-center"
                  >
                    <FaPlus className="mr-2" /> Selecionar Arquivo
                  </button>
                  
                  <p className="text-sm text-gray-500">
                    ou arraste e solte um arquivo aqui
                  </p>
                  
                  {formData.arquivo && (
                    <p className="text-sm text-blue-600">
                      Arquivo selecionado: {formData.arquivo.name}
                    </p>
                  )}
                  
                  <p className="text-xs text-gray-400">
                    Tipos permitidos: PDF, JPEG, PNG, DOC, DOCX, XLS, XLSX
                    <br />
                    Tamanho máximo: 50MB
                  </p>
                </div>
              </div>
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="mb-4">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className="bg-blue-600 h-2.5 rounded-full" 
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 text-right mt-1">
                    Enviando: {uploadProgress}%
                  </p>
                </div>
              )}
              
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de preview do documento */}
      {showPreviewModal && currentDocumento && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl h-[80vh] flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold">
                {currentDocumento.titulo || currentDocumento.nome}
              </h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="flex-1 bg-gray-100 rounded-lg overflow-hidden">
              {currentDocumento.arquivo_url && (
                <iframe
                  src={currentDocumento.arquivo_url}
                  className="w-full h-full"
                  title={currentDocumento.titulo || currentDocumento.nome}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DocumentosObra; 