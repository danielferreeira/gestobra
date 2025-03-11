import { useState, useEffect } from 'react';
import { FaPlus, FaSearch, FaEdit, FaTrash, FaEye, FaBoxes } from 'react-icons/fa';
import { getMateriais, createMaterial, updateMaterial, deleteMaterial } from '../services/materiaisService';

const Materiais = () => {
  const [materiais, setMateriais] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    nome: '',
    categoria: '',
    unidade: '',
    preco_unitario: '',
    quantidade_estoque: '',
    estoque_minimo: '',
    fornecedor: ''
  });

  // Carregar materiais do Supabase
  useEffect(() => {
    const fetchMateriais = async () => {
      try {
        setLoading(true);
        const { data, error } = await getMateriais();
        
        if (error) {
          throw error;
        }
        
        setMateriais(data || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
        setError(error.message || 'Erro ao carregar materiais');
        setLoading(false);
      }
    };
    
    fetchMateriais();
  }, []);

  // Filtrar materiais com base no termo de pesquisa
  const filteredMateriais = materiais.filter(material => 
    material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
    material.fornecedor?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Verificar se o estoque está baixo
  const isEstoqueBaixo = (material) => {
    return material.quantidade_estoque <= material.estoque_minimo;
  };

  // Abrir modal para adicionar/editar material
  const openModal = (material = null) => {
    if (material) {
      setCurrentMaterial(material);
      setFormData({
        nome: material.nome,
        categoria: material.categoria,
        unidade: material.unidade,
        preco_unitario: material.preco_unitario,
        quantidade_estoque: material.quantidade_estoque,
        estoque_minimo: material.estoque_minimo,
        fornecedor: material.fornecedor || ''
      });
    } else {
      setCurrentMaterial(null);
      setFormData({
        nome: '',
        categoria: '',
        unidade: 'un',
        preco_unitario: '',
        quantidade_estoque: '',
        estoque_minimo: '',
        fornecedor: ''
      });
    }
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentMaterial(null);
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Salvar material
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const materialData = {
        ...formData,
        preco_unitario: parseFloat(formData.preco_unitario) || 0,
        quantidade_estoque: parseInt(formData.quantidade_estoque) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0
      };
      
      let result;
      
      if (currentMaterial) {
        // Atualizar material existente
        result = await updateMaterial(currentMaterial.id, materialData);
      } else {
        // Adicionar novo material
        result = await createMaterial(materialData);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Atualizar lista de materiais
      const { data: updatedMateriais } = await getMateriais();
      setMateriais(updatedMateriais || []);
      
      closeModal();
      setLoading(false);
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      setError(error.message || 'Erro ao salvar material');
      setLoading(false);
    }
  };

  // Excluir material
  const handleDelete = async (id) => {
    if (window.confirm('Tem certeza que deseja excluir este material?')) {
      try {
        setLoading(true);
        
        const { error } = await deleteMaterial(id);
        
        if (error) {
          throw error;
        }
        
        // Atualizar lista de materiais
        setMateriais(materiais.filter(material => material.id !== id));
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao excluir material:', error);
        setError(error.message || 'Erro ao excluir material');
        setLoading(false);
      }
    }
  };

  if (loading && materiais.length === 0) {
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
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Materiais</h1>
        <button
          onClick={() => openModal()}
          className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
          disabled={loading}
        >
          <FaPlus className="mr-2" /> Novo Material
        </button>
      </div>

      {/* Barra de pesquisa */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <FaSearch className="text-gray-400" />
        </div>
        <input
          type="text"
          className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          placeholder="Buscar materiais por nome, categoria ou fornecedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* Lista de Materiais */}
      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {filteredMateriais.length > 0 ? (
            filteredMateriais.map((material) => (
              <li key={material.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="flex-shrink-0">
                        <div className={`bg-${isEstoqueBaixo(material) ? 'red' : 'blue'}-100 p-2 rounded-full`}>
                          <FaBoxes className={`text-${isEstoqueBaixo(material) ? 'red' : 'blue'}-600`} />
                        </div>
                      </div>
                      <div className="ml-4">
                        <h3 className="text-lg font-medium text-gray-900">{material.nome}</h3>
                        <p className="text-sm text-gray-500">Categoria: {material.categoria}</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => openModal(material)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Editar"
                        disabled={loading}
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
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
                        Estoque: {material.quantidade_estoque} {material.unidade}
                        {isEstoqueBaixo(material) && (
                          <span className="ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Estoque Baixo
                          </span>
                        )}
                      </p>
                      <p className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0 sm:ml-6">
                        Preço: {formatCurrency(material.preco_unitario)}
                      </p>
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                      <p>Fornecedor: {material.fornecedor || 'Não especificado'}</p>
                    </div>
                  </div>
                </div>
              </li>
            ))
          ) : (
            <li className="px-4 py-5 text-center text-gray-500">
              {searchTerm ? 'Nenhum material encontrado com os termos de busca.' : 'Nenhum material cadastrado.'}
            </li>
          )}
        </ul>
      </div>

      {/* Modal para adicionar/editar material */}
      {showModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-full max-w-md shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">
                {currentMaterial ? 'Editar Material' : 'Adicionar Material'}
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
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome</label>
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
                  <label htmlFor="categoria" className="block text-sm font-medium text-gray-700">Categoria</label>
                  <input
                    type="text"
                    id="categoria"
                    name="categoria"
                    value={formData.categoria}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="unidade" className="block text-sm font-medium text-gray-700">Unidade</label>
                    <select
                      id="unidade"
                      name="unidade"
                      value={formData.unidade}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    >
                      <option value="un">Unidade (un)</option>
                      <option value="kg">Quilograma (kg)</option>
                      <option value="m">Metro (m)</option>
                      <option value="m²">Metro Quadrado (m²)</option>
                      <option value="m³">Metro Cúbico (m³)</option>
                      <option value="l">Litro (l)</option>
                      <option value="pç">Peça (pç)</option>
                      <option value="cx">Caixa (cx)</option>
                      <option value="sc">Saco (sc)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label htmlFor="preco_unitario" className="block text-sm font-medium text-gray-700">Preço Unitário (R$)</label>
                    <input
                      type="number"
                      id="preco_unitario"
                      name="preco_unitario"
                      value={formData.preco_unitario}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="quantidade_estoque" className="block text-sm font-medium text-gray-700">Quantidade em Estoque</label>
                    <input
                      type="number"
                      id="quantidade_estoque"
                      name="quantidade_estoque"
                      value={formData.quantidade_estoque}
                      onChange={handleChange}
                      required
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                  
                  <div>
                    <label htmlFor="estoque_minimo" className="block text-sm font-medium text-gray-700">Estoque Mínimo</label>
                    <input
                      type="number"
                      id="estoque_minimo"
                      name="estoque_minimo"
                      value={formData.estoque_minimo}
                      onChange={handleChange}
                      required
                      min="0"
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
                
                <div>
                  <label htmlFor="fornecedor" className="block text-sm font-medium text-gray-700">Fornecedor</label>
                  <input
                    type="text"
                    id="fornecedor"
                    name="fornecedor"
                    value={formData.fornecedor}
                    onChange={handleChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
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

export default Materiais; 