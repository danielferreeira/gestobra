import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaExclamationTriangle, FaSearch, FaBuilding, FaTools } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'react-hot-toast';

const Fornecedores = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('fornecedores');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fornecedores, setFornecedores] = useState([]);
  const [materiais, setMateriais] = useState([]);
  const [showModalFornecedor, setShowModalFornecedor] = useState(false);
  const [showModalMaterial, setShowModalMaterial] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estados para o formulário de fornecedor
  const [fornecedorForm, setFornecedorForm] = useState({
    nome: '',
    cnpj: '',
    telefone: '',
    email: '',
    endereco: '',
    observacoes: ''
  });
  
  // Estados para o formulário de material
  const [materialForm, setMaterialForm] = useState({
    nome: '',
    descricao: '',
    unidade: 'un',
    preco_unitario: '',
    fornecedor_id: ''
  });

  // Carregar fornecedores e materiais ao montar o componente
  useEffect(() => {
    fetchFornecedores();
    fetchMateriais();
  }, []);

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Buscar fornecedores
  const fetchFornecedores = async () => {
    try {
      setLoading(true);
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('fornecedores')
        .select('*')
        .eq('usuario_id', user.id)
        .order('nome');
      
      if (error) throw error;
      
      setFornecedores(data || []);
    } catch (error) {
      console.error('Erro ao carregar fornecedores:', error);
      setError('Erro ao carregar fornecedores. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Buscar materiais
  const fetchMateriais = async () => {
    try {
      setLoading(true);
      
      // Obter o usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      const { data, error } = await supabase
        .from('materiais')
        .select('*, fornecedores(id, nome)')
        .eq('usuario_id', user.id)
        .order('nome');
      
      if (error) throw error;
      
      setMateriais(data || []);
    } catch (error) {
      console.error('Erro ao carregar materiais:', error);
      setError('Erro ao carregar materiais. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar fornecedores pelo termo de busca
  const fornecedoresFiltrados = fornecedores.filter(fornecedor => 
    fornecedor.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    fornecedor.cnpj?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Filtrar materiais pelo termo de busca
  const materiaisFiltrados = materiais.filter(material => 
    material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.fornecedores?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Manipular mudanças no formulário de fornecedor
  const handleFornecedorFormChange = (e) => {
    const { name, value } = e.target;
    setFornecedorForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Manipular mudanças no formulário de material
  const handleMaterialFormChange = (e) => {
    const { name, value } = e.target;
    
    // Para campos numéricos, converta para número ou use string vazia
    if (name === 'preco_unitario') {
      setMaterialForm(prev => ({
        ...prev,
        [name]: value === '' ? '' : parseFloat(value)
      }));
      return;
    }
    
    setMaterialForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Abrir modal para criar novo fornecedor
  const openCreateFornecedorModal = () => {
    setFornecedorForm({
      nome: '',
      cnpj: '',
      telefone: '',
      email: '',
      endereco: '',
      observacoes: ''
    });
    setEditMode(false);
    setShowModalFornecedor(true);
  };

  // Abrir modal para editar fornecedor
  const openEditFornecedorModal = (fornecedor) => {
    setFornecedorForm({
      id: fornecedor.id,
      nome: fornecedor.nome || '',
      cnpj: fornecedor.cnpj || '',
      telefone: fornecedor.telefone || '',
      email: fornecedor.email || '',
      endereco: fornecedor.endereco || '',
      observacoes: fornecedor.observacoes || ''
    });
    setEditMode(true);
    setShowModalFornecedor(true);
  };

  // Abrir modal para criar novo material
  const openCreateMaterialModal = () => {
    setMaterialForm({
      nome: '',
      descricao: '',
      unidade: 'un',
      preco_unitario: '',
      fornecedor_id: ''
    });
    setEditMode(false);
    setShowModalMaterial(true);
  };

  // Abrir modal para editar material
  const openEditMaterialModal = (material) => {
    setMaterialForm({
      id: material.id,
      nome: material.nome || '',
      descricao: material.descricao || '',
      unidade: material.unidade || 'un',
      preco_unitario: material.preco_unitario || '',
      fornecedor_id: material.fornecedor_id || ''
    });
    setEditMode(true);
    setShowModalMaterial(true);
  };

  // Salvar fornecedor (criar ou atualizar)
  const handleSubmitFornecedor = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Criar uma cópia dos dados do formulário para enviar
      const fornecedorData = { ...fornecedorForm };
      
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      if (editMode) {
        // Atualizar fornecedor existente
        const { error } = await supabase
          .from('fornecedores')
          .update(fornecedorData)
          .eq('id', fornecedorData.id);
        
        if (error) throw error;
        toast.success('Fornecedor atualizado com sucesso!');
      } else {
        // Criar novo fornecedor
        const { error } = await supabase
          .from('fornecedores')
          .insert([{ ...fornecedorData, usuario_id: user.id }]);
        
        if (error) throw error;
        toast.success('Fornecedor criado com sucesso!');
      }
      
      // Recarregar fornecedores e fechar modal
      await fetchFornecedores();
      setShowModalFornecedor(false);
      
      // Limpar formulário
      setFornecedorForm({
        nome: '',
        cnpj: '',
        telefone: '',
        email: '',
        endereco: '',
        observacoes: ''
      });
    } catch (error) {
      console.error('Erro ao salvar fornecedor:', error);
      setError('Erro ao salvar fornecedor. Por favor, tente novamente.');
      toast.error('Erro ao salvar fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar material (criar ou atualizar)
  const handleSubmitMaterial = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Criar uma cópia dos dados do formulário para enviar
      const materialData = { ...materialForm };
      
      // Obter o ID do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      
      // Tratar campos numéricos vazios
      if (materialData.preco_unitario === '') {
        materialData.preco_unitario = null;
      }
      
      if (editMode) {
        // Atualizar material existente
        const { error } = await supabase
          .from('materiais')
          .update(materialData)
          .eq('id', materialData.id);
        
        if (error) throw error;
        toast.success('Material atualizado com sucesso!');
      } else {
        // Criar novo material
        const { error } = await supabase
          .from('materiais')
          .insert([{ ...materialData, usuario_id: user.id }]);
        
        if (error) throw error;
        toast.success('Material criado com sucesso!');
      }
      
      // Recarregar materiais e fechar modal
      await fetchMateriais();
      setShowModalMaterial(false);
      
      // Limpar formulário
      setMaterialForm({
        nome: '',
        descricao: '',
        unidade: 'un',
        preco_unitario: '',
        fornecedor_id: ''
      });
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      setError('Erro ao salvar material. Por favor, tente novamente.');
      toast.error('Erro ao salvar material.');
    } finally {
      setLoading(false);
    }
  };

  // Excluir fornecedor
  const handleDeleteFornecedor = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este fornecedor? Todos os materiais associados a ele serão afetados.')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('fornecedores')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Recarregar fornecedores e materiais
      await fetchFornecedores();
      await fetchMateriais();
      toast.success('Fornecedor excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir fornecedor:', error);
      setError('Erro ao excluir fornecedor. Por favor, tente novamente.');
      toast.error('Erro ao excluir fornecedor.');
    } finally {
      setLoading(false);
    }
  };

  // Excluir material
  const handleDeleteMaterial = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir este material?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('materiais')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      // Recarregar materiais
      await fetchMateriais();
      toast.success('Material excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir material:', error);
      setError('Erro ao excluir material. Por favor, tente novamente.');
      toast.error('Erro ao excluir material.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Toaster position="top-right" />
      
      <div className="container mx-auto px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Gestão de Fornecedores e Materiais</h1>
        </div>
        
        {error && (
          <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
            <div className="flex">
              <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-2" />
              <span>{error}</span>
            </div>
          </div>
        )}
        
        {/* Barra de pesquisa */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar por nome, CNPJ ou descrição..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-2.5 text-gray-400">
              <FaSearch />
            </div>
          </div>
        </div>
        
        {/* Abas */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('fornecedores')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'fornecedores'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaBuilding className="mr-2" /> Fornecedores
            </button>
            <button
              onClick={() => setActiveTab('materiais')}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                activeTab === 'materiais'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FaTools className="mr-2" /> Materiais
            </button>
          </nav>
        </div>
        
        {/* Conteúdo da aba de Fornecedores */}
        {activeTab === 'fornecedores' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreateFornecedorModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <FaPlus className="mr-2" /> Novo Fornecedor
              </button>
            </div>
            
            {loading && fornecedores.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : fornecedoresFiltrados.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {searchTerm ? 'Nenhum fornecedor encontrado para esta busca.' : 'Nenhum fornecedor cadastrado.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {fornecedoresFiltrados.map(fornecedor => (
                  <div
                    key={fornecedor.id}
                    className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="text-lg font-medium">{fornecedor.nome}</h3>
                        {fornecedor.cnpj && (
                          <p className="text-sm text-gray-500">CNPJ: {fornecedor.cnpj}</p>
                        )}
                        {fornecedor.telefone && (
                          <p className="text-sm text-gray-500">Telefone: {fornecedor.telefone}</p>
                        )}
                        {fornecedor.email && (
                          <p className="text-sm text-gray-500">Email: {fornecedor.email}</p>
                        )}
                        {fornecedor.endereco && (
                          <p className="text-sm text-gray-500">Endereço: {fornecedor.endereco}</p>
                        )}
                        {fornecedor.observacoes && (
                          <p className="text-sm text-gray-500 mt-2">{fornecedor.observacoes}</p>
                        )}
                      </div>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openEditFornecedorModal(fornecedor)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDeleteFornecedor(fornecedor.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                    
                    {/* Exibir número de materiais deste fornecedor */}
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <p className="text-sm text-gray-600">
                        {materiais.filter(m => m.fornecedor_id === fornecedor.id).length} materiais cadastrados
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Conteúdo da aba de Materiais */}
        {activeTab === 'materiais' && (
          <div>
            <div className="flex justify-end mb-4">
              <button
                onClick={openCreateMaterialModal}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
              >
                <FaPlus className="mr-2" /> Novo Material
              </button>
            </div>
            
            {loading && materiais.length === 0 ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
              </div>
            ) : materiaisFiltrados.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <p className="text-gray-500">
                  {searchTerm ? 'Nenhum material encontrado para esta busca.' : 'Nenhum material cadastrado.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Material
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fornecedor
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Unidade
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Preço Unitário
                      </th>
                      <th scope="col" className="relative px-6 py-3">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {materiaisFiltrados.map(material => (
                      <tr key={material.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {material.nome}
                          </div>
                          {material.descricao && (
                            <div className="text-sm text-gray-500">
                              {material.descricao}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {material.fornecedores?.nome || 'Sem fornecedor'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {material.unidade}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatCurrency(material.preco_unitario)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => openEditMaterialModal(material)}
                            className="text-blue-600 hover:text-blue-900 mr-4"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteMaterial(material.id)}
                            className="text-red-600 hover:text-red-900"
                          >
                            Excluir
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
        
        {/* Modal de Fornecedor */}
        {showModalFornecedor && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-semibold mb-4">
                {editMode ? 'Editar Fornecedor' : 'Novo Fornecedor'}
              </h2>
              
              <form onSubmit={handleSubmitFornecedor} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={fornecedorForm.nome}
                    onChange={handleFornecedorFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    CNPJ
                  </label>
                  <input
                    type="text"
                    name="cnpj"
                    value={fornecedorForm.cnpj}
                    onChange={handleFornecedorFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Telefone
                    </label>
                    <input
                      type="text"
                      name="telefone"
                      value={fornecedorForm.telefone}
                      onChange={handleFornecedorFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={fornecedorForm.email}
                      onChange={handleFornecedorFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    name="endereco"
                    value={fornecedorForm.endereco}
                    onChange={handleFornecedorFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={fornecedorForm.observacoes}
                    onChange={handleFornecedorFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="3"
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModalFornecedor(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        
        {/* Modal de Material */}
        {showModalMaterial && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-semibold mb-4">
                {editMode ? 'Editar Material' : 'Novo Material'}
              </h2>
              
              <form onSubmit={handleSubmitMaterial} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nome
                  </label>
                  <input
                    type="text"
                    name="nome"
                    value={materialForm.nome}
                    onChange={handleMaterialFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Descrição
                  </label>
                  <textarea
                    name="descricao"
                    value={materialForm.descricao}
                    onChange={handleMaterialFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="2"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornecedor
                  </label>
                  <select
                    name="fornecedor_id"
                    value={materialForm.fornecedor_id}
                    onChange={handleMaterialFormChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {fornecedores.map(fornecedor => (
                      <option key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unidade
                    </label>
                    <select
                      name="unidade"
                      value={materialForm.unidade}
                      onChange={handleMaterialFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      required
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="m">Metro (m)</option>
                      <option value="m²">Metro Quadrado (m²)</option>
                      <option value="m³">Metro Cúbico (m³)</option>
                      <option value="l">Litro (l)</option>
                      <option value="pç">Peça (pç)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="par">Par</option>
                      <option value="conj">Conjunto (conj)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Preço Unitário (R$)
                    </label>
                    <input
                      type="number"
                      name="preco_unitario"
                      value={materialForm.preco_unitario}
                      onChange={handleMaterialFormChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModalMaterial(false)}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-white bg-blue-600 rounded-md hover:bg-blue-700"
                    disabled={loading}
                  >
                    {loading ? (
                      <div className="flex items-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                        <span>Salvando...</span>
                      </div>
                    ) : (
                      'Salvar'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Fornecedores; 