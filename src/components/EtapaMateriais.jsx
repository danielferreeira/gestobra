import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaBoxes, FaSearch, FaBuilding } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { getMateriais } from '../services/materiaisService';
import { createDespesaMaterial } from '../services/financeiroService';

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
  const openModal = (material = null) => {
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

      console.log(`Atualizando valor realizado da etapa ${etapaId} para R$ ${totalMateriais.toFixed(2)}`);

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

      console.log('Valor realizado atualizado com sucesso:', updateResult);

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

      // Notificar o componente pai sobre a atualização para recalcular o progresso
      if (onUpdate) {
        setTimeout(async () => {
          // Aguardar a atualização ser concluída antes de notificar
          try {
            await onUpdate();
          } catch (error) {
            console.error('Erro ao notificar componente pai:', error);
          }
        }, 500);
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
          
        if (result.error) {
          throw result.error;
        }
        
        // Tenta buscar despesa existente relacionada a este material
        const { data: despesaExistente, error: despesaError } = await supabase
          .from('despesas')
          .select('id')
          .eq('material_id', materialData.material_id)
          .eq('etapa_id', etapaId)
          .maybeSingle();
          
        if (!despesaError) {
          if (despesaExistente) {
            // Atualizar a despesa existente
            const { error: updateError } = await supabase
              .from('despesas')
              .update({
                valor: materialData.valor_total,
                data: materialData.data_compra,
                nota_fiscal: materialData.nota_fiscal
              })
              .eq('id', despesaExistente.id);
              
            if (updateError) {
              console.error('Erro ao atualizar despesa:', updateError);
            }
          } else {
            // Criar uma nova despesa
            await createDespesaMaterial(materialData);
          }
        }
      } else {
        // Adicionar novo material
        result = await supabase
          .from('etapas_materiais')
          .insert([materialData]);
          
        if (result.error) {
          throw result.error;
        }
        
        // Criar uma despesa para o novo material
        const resultDespesa = await createDespesaMaterial(materialData);
        if (resultDespesa.error) {
          console.error('Aviso: Material adicionado, mas erro ao criar despesa:', resultDespesa.error);
        }
      }

      // Atualizar o valor realizado da etapa
      await atualizarValorRealizadoEtapa();
      
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar material:', error);
      
      // Verificar se é um erro de violação de chave única (duplicidade)
      if (error.code === '23505' && error.message.includes('etapas_materiais_etapa_id_material_id_key')) {
        setError('Este material já está cadastrado nesta etapa. Por favor, edite o material existente para ajustar a quantidade conforme necessário.');
      } else {
        setError('Erro ao salvar material. Por favor, tente novamente.');
      }
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
      
      // Buscar ID do material para remover despesa associada
      const { data: material, error: materialError } = await supabase
        .from('etapas_materiais')
        .select('material_id')
        .eq('id', materialId)
        .single();
        
      if (materialError) throw materialError;
      
      // Remover o material
      const { error } = await supabase
        .from('etapas_materiais')
        .delete()
        .eq('id', materialId);
      
      if (error) throw error;
      
      // Tenta remover a despesa associada
      if (material && material.material_id) {
        const { error: despesaError } = await supabase
          .from('despesas')
          .delete()
          .eq('material_id', material.material_id)
          .eq('etapa_id', etapaId);
          
        if (despesaError) {
          console.error('Erro ao remover despesa associada:', despesaError);
        }
      }

      // Atualizar o valor realizado da etapa
      await atualizarValorRealizadoEtapa();
      
    } catch (error) {
      console.error('Erro ao remover material:', error);
      setError('Erro ao remover material. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Filtrar materiais por termo de busca e por fornecedor
  const materiaisFiltrados = materiais.filter(material => {
    const matchesSearch = material.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFornecedor = !selectedFornecedor || material.fornecedor_id === selectedFornecedor;
    return matchesSearch && matchesFornecedor;
  });

  // Calcular valor total dos materiais
  const valorTotal = materiaisEtapa.reduce((total, item) => 
    total + parseFloat(item.valor_total || 0), 0);

  const handleOpenModal = () => openModal(null);

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
            onClick={handleOpenModal}
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
            <span className="ml-2 font-bold">{formatCurrency(valorTotal)}</span>
          </div>
        </div>
      </div>

      {/* Lista de Materiais */}
      {materiaisEtapa.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-8 text-center">
          <FaBoxes className="text-4xl text-gray-400 mx-auto mb-3" />
          <h3 className="text-lg font-medium text-gray-600 mb-2">Nenhum material adicionado</h3>
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
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">
                {currentMaterial ? 'Editar Material' : 'Adicionar Material'}
              </h2>
              <button
                onClick={closeModal}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            {error && error.includes('já está cadastrado') && (
              <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              <div className="space-y-4">
                {/* Seleção de fornecedor */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fornecedor
                  </label>
                  <select
                    value={selectedFornecedor}
                    onChange={handleFornecedorChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">Todos os fornecedores</option>
                    {fornecedores.map(fornecedor => (
                      <option key={fornecedor.id} value={fornecedor.id}>
                        {fornecedor.nome}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Pesquisa de material */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Material
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar material..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 pl-10"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <FaSearch className="text-gray-400" />
                    </div>
                  </div>
                  
                  {/* Lista de materiais */}
                  <div className="mt-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md">
                    {materiaisFiltrados.length === 0 ? (
                      <div className="p-3 text-sm text-gray-500">
                        Nenhum material encontrado
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-200">
                        {materiaisFiltrados.map(material => (
                          <div
                            key={material.id}
                            className={`p-3 hover:bg-blue-50 cursor-pointer ${
                              formData.material_id === material.id ? 'bg-blue-50' : ''
                            }`}
                            onClick={() => {
                              setFormData(prev => ({
                                ...prev,
                                material_id: material.id,
                                valor_total: material.preco_unitario * prev.quantidade
                              }));
                            }}
                          >
                            <div className="flex justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{material.nome}</p>
                                {material.categoria && (
                                  <p className="text-xs text-gray-500">{material.categoria}</p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="text-gray-600">{material.unidade}</p>
                                <p className="font-medium">{formatCurrency(material.preco_unitario)}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Campos do formulário */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Quantidade
                    </label>
                    <input
                      type="number"
                      name="quantidade"
                      value={formData.quantidade}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="0.01"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Valor Total (R$)
                    </label>
                    <input
                      type="number"
                      name="valor_total"
                      value={formData.valor_total}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                      min="0"
                      step="0.01"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Compra
                    </label>
                    <input
                      type="date"
                      name="data_compra"
                      value={formData.data_compra}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nota Fiscal
                    </label>
                    <input
                      type="text"
                      name="nota_fiscal"
                      value={formData.nota_fiscal}
                      onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observações
                  </label>
                  <textarea
                    name="observacoes"
                    value={formData.observacoes}
                    onChange={handleChange}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    rows="2"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 rounded-md text-white hover:bg-blue-700"
                  disabled={loading || !formData.material_id}
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EtapaMateriais; 