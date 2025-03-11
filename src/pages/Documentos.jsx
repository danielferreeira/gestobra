import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaDownload, FaFileAlt, FaFileContract, FaFilePdf, FaFileImage, FaFile } from 'react-icons/fa';
import { getDocumentos, createDocumento, updateDocumento, deleteDocumento, downloadDocumento } from '../services/documentosService';

const Documentos = () => {
  const [documentos, setDocumentos] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentDocumento, setCurrentDocumento] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeCategoria, setActiveCategoria] = useState('todos');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    categoria: '',
    obra_id: '',
    data_upload: '',
    arquivo: null,
    arquivo_url: ''
  });

  // Carregar documentos do Supabase
  useEffect(() => {
    const fetchDocumentos = async () => {
      try {
        setLoading(true);
        const { data, error } = await getDocumentos();
        
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
  }, []);

  // Filtrar documentos com base no termo de pesquisa e na categoria ativa
  const filteredDocumentos = documentos.filter(documento => {
    const matchesSearch = 
      documento.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      documento.descricao?.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (activeCategoria === 'todos') return matchesSearch;
    return matchesSearch && documento.categoria === activeCategoria;
  });

  // Obter categorias únicas para o filtro
  const categorias = ['todos', ...new Set(documentos.map(doc => doc.categoria))];

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const options = { day: '2-digit', month: '2-digit', year: 'numeric' };
    return new Date(dateString).toLocaleDateString('pt-BR', options);
  };

  // Obter ícone com base no tipo de arquivo
  const getFileIcon = (fileName) => {
    if (!fileName) return <FaFile />;
    
    const extension = fileName.split('.').pop().toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return <FaFilePdf />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return <FaFileImage />;
      case 'doc':
      case 'docx':
        return <FaFileContract />;
      default:
        return <FaFileAlt />;
    }
  };

  // Abrir modal para adicionar/editar documento
  const openModal = (documento = null) => {
    if (documento) {
      setCurrentDocumento(documento);
      setFormData({
        nome: documento.nome,
        descricao: documento.descricao || '',
        categoria: documento.categoria,
        obra_id: documento.obra_id || '',
        data_upload: documento.data_upload,
        arquivo: null,
        arquivo_url: documento.arquivo_url || ''
      });
    } else {
      setCurrentDocumento(null);
      setFormData({
        nome: '',
        descricao: '',
        categoria: '',
        obra_id: '',
        data_upload: new Date().toISOString().split('T')[0],
        arquivo: null,
        arquivo_url: ''
      });
    }
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentDocumento(null);
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'arquivo' && files && files[0]) {
      setFormData(prev => ({ 
        ...prev, 
        arquivo: files[0],
        nome: prev.nome || files[0].name
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  // Salvar documento
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const documentoData = {
        ...formData,
        data_upload: formData.data_upload || new Date().toISOString().split('T')[0]
      };
      
      let result;
      
      if (currentDocumento) {
        // Atualizar documento existente
        result = await updateDocumento(currentDocumento.id, documentoData);
      } else {
        // Adicionar novo documento
        result = await createDocumento(documentoData);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Atualizar lista de documentos
      const { data: updatedDocumentos } = await getDocumentos();
      setDocumentos(updatedDocumentos || []);
      
      closeModal();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      setError(error.message || 'Erro ao salvar documento');
      setLoading(false);
    }
  };

  // Excluir documento
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      try {
        setLoading(true);
        
        const { error } = await deleteDocumento(id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar lista de documentos
        setDocumentos(documentos.filter(documento => documento.id !== id));
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao excluir documento:', error);
        setError(error.message || 'Erro ao excluir documento');
        setLoading(false);
      }
    }
  };

  // Baixar documento
  const handleDownload = async (id, nome) => {
    try {
      setLoading(true);
      
      const { data, error } = await downloadDocumento(id);
      
      if (error) {
        throw error;
      }
      
      // Criar link para download
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = nome;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      setLoading(false);
    } catch (error) {
      console.error('Erro ao baixar documento:', error);
      setError(error.message || 'Erro ao baixar documento');
      setLoading(false);
    }
  };

  if (loading && documentos.length === 0) {
    return (
      <div className="flex justify-center items-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

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
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Documentos</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          disabled={loading}
        >
          <FaPlus className="mr-2" /> Novo Documento
        </button>
      </div>

      {/* Filtros e barra de pesquisa */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center space-y-4 md:space-y-0">
        <div className="flex flex-wrap gap-2">
          {categorias.map(categoria => (
            <button
              key={categoria}
              onClick={() => setActiveCategoria(categoria)}
              className={`px-3 py-1 rounded-md text-sm ${
                activeCategoria === categoria
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {categoria === 'todos' ? 'Todos' : categoria}
            </button>
          ))}
        </div>
        
        <div className="relative w-full md:w-64">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Lista de Documentos */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredDocumentos.length > 0 ? (
            filteredDocumentos.map((documento) => {
              const fileIcon = getFileIcon(documento.nome);
              return (
                <li key={documento.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          <div className="bg-blue-100 p-2 rounded-full">
                            <span className="text-blue-600">{fileIcon}</span>
                          </div>
                        </div>
                        <div className="ml-4">
                          <h3 className="text-lg font-medium text-gray-900">{documento.nome}</h3>
                          <p className="text-sm text-gray-500">
                            {documento.descricao || 'Sem descrição'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleDownload(documento.id, documento.nome)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Baixar"
                          disabled={loading}
                        >
                          <FaDownload />
                        </button>
                        <button
                          onClick={() => openModal(documento)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Editar"
                          disabled={loading}
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(documento.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Excluir"
                          disabled={loading}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 sm:flex sm:justify-between">
                      <div className="sm:flex">
                        <p className="flex items-center text-sm text-gray-500">
                          Categoria: {documento.categoria}
                        </p>
                        {documento.obra_id && (
                          <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                            ID da Obra: {documento.obra_id}
                          </p>
                        )}
                      </div>
                      <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                        <p>Data de Upload: {formatDate(documento.data_upload)}</p>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })
          ) : (
            <li className="px-4 py-5 text-center text-gray-500">
              {searchTerm ? 'Nenhum documento encontrado com os termos de busca.' : 'Nenhum documento cadastrado.'}
            </li>
          )}
        </ul>
      </div>

      {/* Modal para adicionar/editar documento */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentDocumento ? 'Editar Documento' : 'Adicionar Documento'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-500"
              >
                &times;
              </button>
            </div>
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome do Documento</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={formData.nome}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="descricao" className="block text-sm font-medium text-gray-700">Descrição</label>
                  <textarea
                    id="descricao"
                    name="descricao"
                    value={formData.descricao}
                    onChange={handleChange}
                    rows="3"
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoria</label>
                  <input
                    type="text"
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    placeholder="Ex: Contrato, Planta, Orçamento, etc."
                  />
                </div>
                
                <div>
                  <label htmlFor="obra_id" className="block text-sm font-medium text-gray-700">ID da Obra (opcional)</label>
                  <input
                    type="text"
                    id="obra_id"
                    name="obra_id"
                    value={formData.obra_id}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="data_upload" className="block text-sm font-medium text-gray-700">Data de Upload</label>
                  <input
                    type="date"
                    id="data_upload"
                    name="data_upload"
                    value={formData.data_upload}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="arquivo" className="block text-sm font-medium text-gray-700">
                    {currentDocumento ? 'Substituir Arquivo (opcional)' : 'Arquivo'}
                  </label>
                  <input
                    type="file"
                    id="arquivo"
                    name="arquivo"
                    onChange={handleChange}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    required={!currentDocumento}
                  />
                  {currentDocumento && formData.arquivo_url && (
                    <p className="mt-2 text-sm text-gray-500">
                      Arquivo atual: {currentDocumento.nome}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="mt-5 sm:mt-6 sm:grid sm:grid-cols-2 sm:gap-3 sm:grid-flow-row-dense">
                <button
                  type="submit"
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:col-start-2 sm:text-sm"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
                <button
                  type="button"
                  onClick={closeModal}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:col-start-1 sm:text-sm"
                  disabled={loading}
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Documentos; 