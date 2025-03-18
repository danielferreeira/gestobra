import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaBoxes, FaSearch, FaBuilding, FaCloudUploadAlt } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { getMateriais } from '../services/materiaisService';
import UploadOrcamento from './UploadOrcamento';

const EtapaMateriais = ({ etapaId, obraId, onUpdate }) => {
  const [materiais, setMateriais] = useState([]);
  const [materiaisEtapa, setMateriaisEtapa] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentMaterial, setCurrentMaterial] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [fornecedores, setFornecedores] = useState([]);
  const [selectedFornecedor, setSelectedFornecedor] = useState('');
  const [modalTab, setModalTab] = useState('manual'); // 'manual' ou 'upload'
  const [formData, setFormData] = useState({
    material_id: '',
    quantidade: 1,
    valor_total: 0,
    data_compra: new Date().toISOString().split('T')[0],
    nota_fiscal: '',
    observacoes: ''
  });

  // Carregar materiais, fornecedores e materiais da etapa
  useEffect(() => {
    const fetchData = async () => {
      if (!etapaId) return;
      
      try {
        setLoading(true);
        
        // Buscar todos os materiais disponíveis
        const { data: materiaisData, error: materiaisError } = await getMateriais();
        
        if (materiaisError) {
          throw materiaisError;
        }
        
        setMateriais(materiaisData || []);
        
        // Buscar fornecedores
        const { data: fornecedoresData, error: fornecedoresError } = await supabase
          .from('fornecedores')
          .select('*')
          .order('nome');
        
        if (fornecedoresError) {
          throw fornecedoresError;
        }
        
        setFornecedores(fornecedoresData || []);
        
        // Buscar materiais da etapa
        const { data: etapaMateriaisData, error: etapaMateriaisError } = await supabase
          .from('etapas_materiais')
          .select(`
            id,
            material_id,
            quantidade,
            valor_total,
            data_compra,
            nota_fiscal,
            observacoes,
            materiais (
              id,
              nome,
              categoria,
              unidade,
              preco_unitario,
              fornecedor_id
            )
          `)
          .eq('etapa_id', etapaId);
        
        if (etapaMateriaisError) {
          throw etapaMateriaisError;
        }
        
        setMateriaisEtapa(etapaMateriaisData || []);
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar materiais:', error);
        setError(error.message || 'Erro ao carregar materiais');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [etapaId, obraId]);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Abrir modal para adicionar/editar material
  const openModal = (material = null, tab = 'manual') => {
    if (material) {
      setCurrentMaterial(material);
      // Se for edição, identificar o fornecedor do material
      const materialCompleto = materiais.find(m => m.id === material.material_id);
      setSelectedFornecedor(materialCompleto?.fornecedor_id || '');
      
      setFormData({
        material_id: material.material_id,
        quantidade: material.quantidade,
        valor_total: material.valor_total || 0,
        data_compra: material.data_compra ? new Date(material.data_compra).toISOString().split('T')[0] : '',
        nota_fiscal: material.nota_fiscal || '',
        observacoes: material.observacoes || ''
      });
      
      setModalTab('manual'); // Quando editando, sempre mostrar a aba manual
    } else {
      setCurrentMaterial(null);
      setSelectedFornecedor('');
      setFormData({
        material_id: '',
        quantidade: 1,
        valor_total: 0,
        data_compra: new Date().toISOString().split('T')[0],
        nota_fiscal: '',
        observacoes: ''
      });
      setModalTab(tab);
    }
    
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentMaterial(null);
    setSelectedFornecedor('');
  };

  // Manipular mudança de fornecedor
  const handleFornecedorChange = (e) => {
    setSelectedFornecedor(e.target.value);
    // Limpar a seleção de material quando o fornecedor muda
    setFormData(prev => ({
      ...prev,
      material_id: ''
    }));
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'material_id' && value) {
      // Quando o material é selecionado, atualizar o valor total com base no preço unitário
      const material = materiais.find(m => m.id === value);
      if (material) {
        const quantidade = parseFloat(formData.quantidade) || 0;
        const valorTotal = quantidade * parseFloat(material.preco_unitario || 0);
        
        setFormData(prev => ({
          ...prev,
          [name]: value,
          valor_total: valorTotal.toFixed(2) // Formatar para 2 casas decimais
        }));
        return;
      }
    }
    
    if (name === 'quantidade') {
      // Quando a quantidade é alterada, atualizar o valor total
      const quantidade = parseFloat(value) || 0;
      const material = materiais.find(m => m.id === formData.material_id);
      
      if (material) {
        const valorTotal = quantidade * parseFloat(material.preco_unitario || 0);
        
        setFormData(prev => ({
          ...prev,
          [name]: value,
          valor_total: valorTotal.toFixed(2) // Formatar para 2 casas decimais
        }));
        return;
      }
    }
    
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Atualizar o valor realizado da etapa com base nos materiais
  const atualizarValorRealizadoEtapa = async () => {
    try {
      // Primeiro, buscar todos os materiais da etapa novamente para ter certeza que temos os dados mais recentes
      const { data: materiaisAtuais, error: materiaisError } = await supabase
        .from('etapas_materiais')
        .select('valor_total')
        .eq('etapa_id', etapaId);
      
      if (materiaisError) throw materiaisError;

      // Calcular o total dos materiais
      const totalMateriais = materiaisAtuais.reduce((total, item) => {
        const valor = parseFloat(item.valor_total);
        return total + (isNaN(valor) ? 0 : valor);
      }, 0);

      console.log('Materiais atuais:', materiaisAtuais);
      console.log('Total calculado:', totalMateriais);

      // Atualizar o valor realizado da etapa
      const { data: updateResult, error: updateError } = await supabase
        .from('etapas_obra')
        .update({
          valor_realizado: totalMateriais,
          updated_at: new Date().toISOString()
        })
        .eq('id', etapaId)
        .select();

      if (updateError) throw updateError;

      console.log('Resultado da atualização:', updateResult);

      // Recarregar os materiais da etapa para atualizar a interface
      const { data: newMateriaisEtapa, error: reloadError } = await supabase
        .from('etapas_materiais')
        .select(`
          id,
          material_id,
          quantidade,
          valor_total,
          data_compra,
          nota_fiscal,
          observacoes,
          materiais (
            id,
            nome,
            categoria,
            unidade,
            preco_unitario
          )
        `)
        .eq('etapa_id', etapaId);

      if (reloadError) throw reloadError;

      setMateriaisEtapa(newMateriaisEtapa || []);

      // Notificar o componente pai sobre a atualização
      if (onUpdate) {
        // Aguardar a atualização ser concluída antes de notificar
        await onUpdate();
      }

    } catch (error) {
      console.error('Erro ao atualizar valor realizado:', error);
      setError('Erro ao atualizar valor realizado. Por favor, tente novamente.');
    }
  };

  // Enviar formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      const materialData = {
        ...formData,
        etapa_id: etapaId,
        obra_id: obraId,
        valor_total: Number(formData.valor_total) // Converter para número
      };
      
      let result;
      
      if (currentMaterial) {
        // Atualizar material existente
        result = await supabase
          .from('etapas_materiais')
          .update(materialData)
          .eq('id', currentMaterial.id);
      } else {
        // Adicionar novo material
        result = await supabase
          .from('etapas_materiais')
          .insert([materialData]);
      }
      
      if (result.error) {
        throw result.error;
      }

      // Atualizar o valor realizado da etapa
      await atualizarValorRealizadoEtapa();
      
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      setError('Erro ao salvar material. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Remover material
  const handleRemoveMaterial = async (materialId) => {
    if (!window.confirm('Tem certeza que deseja remover este material?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await supabase
        .from('etapas_materiais')
        .delete()
        .eq('id', materialId);
      
      if (error) throw error;

      // Atualizar o valor realizado da etapa
      await atualizarValorRealizadoEtapa();
      
    } catch (error) {
      console.error('Erro ao remover material:', error);
      setError('Erro ao remover material. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar materiais para o select com base no fornecedor selecionado e termo de busca
  const materiaisFiltrados = materiais.filter(material => 
    (selectedFornecedor === '' || material.fornecedor_id === selectedFornecedor) &&
    ((material.nome?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
    (material.categoria?.toLowerCase() || '').includes(searchTerm.toLowerCase()))
  );

  // Calcular valor total dos materiais
  const valorTotalMateriais = materiaisEtapa.reduce((total, item) => total + parseFloat(item.valor_total || 0), 0);

  // Manipular resultado do upload de orçamento
  const handleUploadSuccess = async (resultado) => {
    try {
      setLoading(true);
      
      // Recarregar fornecedores para incluir o novo fornecedor (se foi adicionado)
      const { data: fornecedoresData, error: fornecedoresError } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');
      
      if (fornecedoresError) throw fornecedoresError;
      
      setFornecedores(fornecedoresData || []);
      
      // Recarregar materiais para incluir os novos materiais
      const { data: materiaisData, error: materiaisError } = await getMateriais();
      
      if (materiaisError) throw materiaisError;
      
      setMateriais(materiaisData || []);
      
      // Fechar o modal após processamento bem-sucedido
      setTimeout(() => {
        setShowModal(false);
        
        // Atualizar o valor realizado da etapa
        atualizarValorRealizadoEtapa();
      }, 3000);
      
    } catch (error) {
      console.error('Erro ao atualizar após upload:', error);
      setError('Erro ao atualizar dados após upload: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && materiaisEtapa.length === 0) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center">
          <FaBoxes className="mr-2 text-blue-600" /> Materiais da Etapa
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => openModal(null, 'upload')}
            className="flex items-center bg-green-600 text-white px-3 py-2 rounded-md hover:bg-green-700"
          >
            <FaCloudUploadAlt className="mr-2" /> Upload de Orçamento
          </button>
          <button
            onClick={() => openModal(null, 'manual')}
            className="flex items-center bg-blue-600 text-white px-3 py-2 rounded-md hover:bg-blue-700"
          >
            <FaPlus className="mr-2" /> Adicionar Material
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      )}

      {/* Resumo */}
      <div className="bg-blue-50 p-3 rounded-md mb-4">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-sm text-blue-800 font-medium">Total de Materiais:</span>
            <span className="ml-2 font-bold">{materiaisEtapa.length}</span>
          </div>
          <div>
            <span className="text-sm text-blue-800 font-medium">Valor Total:</span>
            <span className="ml-2 font-bold">{formatCurrency(valorTotalMateriais)}</span>
          </div>
        </div>
      </div>

      {/* Lista de Materiais */}
      {materiaisEtapa.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <FaBoxes className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum material adicionado</h3>
          <p className="text-gray-500 mb-4">Adicione materiais para esta etapa da obra ou faça upload de um orçamento.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-3">
            <button
              onClick={() => openModal(null, 'upload')}
              className="flex items-center justify-center bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
            >
              <FaCloudUploadAlt className="mr-2" /> Upload de Orçamento
            </button>
            <button
              onClick={() => openModal(null, 'manual')}
              className="flex items-center justify-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              <FaPlus className="mr-2" /> Adicionar Material
            </button>
          </div>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quantidade
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor Total
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materiaisEtapa.map((material) => (
                <tr key={material.id}>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{material.materiais?.nome}</div>
                    <div className="text-xs text-gray-500">{material.materiais?.categoria}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {material.quantidade} {material.materiais?.unidade}
                    </div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(material.valor_total)}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(material.data_compra)}</div>
                  </td>
                  <td className="px-4 py-2 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openModal(material)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Editar"
                      >
                        <FaEdit />
                      </button>
                      <button
                        onClick={() => handleRemoveMaterial(material.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Excluir"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal para adicionar/editar material */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {currentMaterial ? 'Editar Material' : 'Adicionar Material'}
            </h2>
            
            {/* Abas do modal */}
            {!currentMaterial && (
              <div className="border-b border-gray-200 mb-6">
                <nav className="flex space-x-4">
                  <button
                    className={`py-2 px-1 border-b-2 font-medium ${
                      modalTab === 'manual'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setModalTab('manual')}
                  >
                    Cadastro Manual
                  </button>
                  <button
                    className={`py-2 px-1 border-b-2 font-medium ${
                      modalTab === 'upload'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                    onClick={() => setModalTab('upload')}
                  >
                    Upload de Orçamento
                  </button>
                </nav>
              </div>
            )}
            
            {/* Conteúdo da aba de cadastro manual */}
            {modalTab === 'manual' && (
              <form id="formMaterial" onSubmit={handleSubmit}>
                {/* Seleção de Fornecedor */}
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="fornecedor">
                    Fornecedor
                  </label>
                  <select
                    id="fornecedor"
                    value={selectedFornecedor}
                    onChange={handleFornecedorChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  >
                    <option value="">Selecione um fornecedor</option>
                    {fornecedores.map(fornecedor => (
                      <option key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="material_id">
                    Material
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                    <input
                      type="text"
                      className="pl-10 pr-3 py-2 w-full border border-gray-300 rounded-md mb-2"
                      placeholder="Buscar material..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <select
                    id="material_id"
                    name="material_id"
                    value={formData.material_id}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                    disabled={!selectedFornecedor}
                  >
                    <option value="">
                      {selectedFornecedor ? "Selecione um material" : "Primeiro selecione um fornecedor"}
                    </option>
                    {materiaisFiltrados.map(material => (
                      <option key={material.id} value={material.id}>
                        {material.nome} - {material.categoria} ({formatCurrency(material.preco_unitario)}/{material.unidade})
                      </option>
                    ))}
                  </select>
                  {!selectedFornecedor && (
                    <p className="text-xs text-blue-500 mt-1">
                      Selecione um fornecedor para ver os materiais disponíveis
                    </p>
                  )}
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="quantidade">
                    Quantidade
                  </label>
                  <input
                    type="number"
                    id="quantidade"
                    name="quantidade"
                    value={formData.quantidade}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                    min="0.01"
                    step="0.01"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="valor_total">
                    Valor Total (R$)
                  </label>
                  <input
                    type="number"
                    id="valor_total"
                    name="valor_total"
                    value={formData.valor_total}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    required
                    min="0"
                    step="0.01"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Valor calculado automaticamente com base na quantidade e preço unitário do material.
                  </p>
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data_compra">
                    Data de Compra
                  </label>
                  <input
                    type="date"
                    id="data_compra"
                    name="data_compra"
                    value={formData.data_compra}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="nota_fiscal">
                    Nota Fiscal
                  </label>
                  <input
                    type="text"
                    id="nota_fiscal"
                    name="nota_fiscal"
                    value={formData.nota_fiscal}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  />
                </div>
                
                <div className="mb-4">
                  <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="observacoes">
                    Observações
                  </label>
                  <textarea
                    id="observacoes"
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                    rows="3"
                  ></textarea>
                </div>
                
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
                    form="formMaterial"
                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                    disabled={loading}
                  >
                    {loading ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </form>
            )}
            
            {/* Conteúdo da aba de upload de orçamento */}
            {modalTab === 'upload' && (
              <UploadOrcamento 
                etapaId={etapaId}
                obraId={obraId}
                onSuccess={handleUploadSuccess}
              />
            )}
            
            {/* Somente mostrar botões de cancelar/salvar no modo manual */}
            {modalTab === 'manual' && (
              <div className="flex justify-end space-x-2 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  form="formMaterial"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            )}
            
            {/* Mostrar apenas botão de fechar no modo upload */}
            {modalTab === 'upload' && (
              <div className="flex justify-end mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
                >
                  Fechar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EtapaMateriais; 