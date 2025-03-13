import React, { useState, useEffect } from 'react';
import { FaMoneyBillWave, FaPlus, FaEdit, FaTrash, FaExclamationTriangle } from 'react-icons/fa';
import { getDespesasByObraId, createDespesa, updateDespesa, deleteDespesa } from '../services/despesasService';
import { getEtapasByObraId, calcularProgressoGeral } from '../services/etapasService';

const OrcamentoObra = ({ obraId, orcamentoTotal, onTotalGastoChange }) => {
  const [despesas, setDespesas] = useState([]);
  const [etapas, setEtapas] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentDespesa, setCurrentDespesa] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    descricao: '',
    valor: '',
    data: '',
    categoria: 'mao_de_obra',
    status_pagamento: 'pago'
  });
  const [totalGasto, setTotalGasto] = useState(0);
  const [categorias, setCategorias] = useState({});
  const [progressoObra, setProgressoObra] = useState(0);
  const [valorPrevistoTotal, setValorPrevistoTotal] = useState(0);

  // Carregar despesas e etapas da obra
  useEffect(() => {
    const fetchData = async () => {
      if (!obraId) return;
      
      try {
        setLoading(true);
        
        // Buscar despesas
        const { data: despesasData, error: despesasError } = await getDespesasByObraId(obraId);
        
        if (despesasError) {
          throw despesasError;
        }
        
        setDespesas(despesasData || []);
        
        // Calcular total gasto
        const total = despesasData.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
        setTotalGasto(total);
        
        // Comunicar o total gasto para o componente pai
        if (onTotalGastoChange) {
          onTotalGastoChange(total);
        }
        
        // Calcular totais por categoria
        const catTotals = {};
        despesasData.forEach(despesa => {
          const cat = despesa.categoria || 'outros';
          catTotals[cat] = (catTotals[cat] || 0) + parseFloat(despesa.valor || 0);
        });
        setCategorias(catTotals);
        
        // Buscar etapas para calcular o progresso
        const { data: etapasData, error: etapasError } = await getEtapasByObraId(obraId);
        
        if (etapasError) {
          throw etapasError;
        }
        
        setEtapas(etapasData || []);
        
        // Calcular progresso geral com base nas etapas
        const progresso = calcularProgressoGeral(etapasData || []);
        setProgressoObra(progresso);
        
        // Calcular valor previsto total das etapas
        const totalPrevisto = etapasData.reduce((acc, etapa) => acc + parseFloat(etapa.valor_previsto || 0), 0);
        setValorPrevistoTotal(totalPrevisto);
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar dados:', error);
        setError(error.message || 'Erro ao carregar dados');
        setLoading(false);
      }
    };
    
    fetchData();
  }, [obraId, onTotalGastoChange]);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Formatar data
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
  };

  // Obter label da categoria
  const getCategoriaLabel = (categoria) => {
    const categoriaMap = {
      'mao_de_obra': { label: 'Mão de Obra', color: 'bg-green-100 text-green-800' },
      'equipamento': { label: 'Equipamento', color: 'bg-purple-100 text-purple-800' },
      'servico': { label: 'Serviço', color: 'bg-yellow-100 text-yellow-800' },
      'imposto': { label: 'Imposto', color: 'bg-red-100 text-red-800' },
      'outros': { label: 'Outros', color: 'bg-gray-100 text-gray-800' }
    };
    
    return categoriaMap[categoria] || { label: categoria, color: 'bg-gray-100 text-gray-800' };
  };

  // Obter label do status de pagamento
  const getStatusPagamentoLabel = (status) => {
    const statusMap = {
      'pago': { label: 'Pago', color: 'bg-green-100 text-green-800' },
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      'cancelado': { label: 'Cancelado', color: 'bg-red-100 text-red-800' }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Abrir modal para adicionar/editar despesa
  const openModal = (despesa = null) => {
    if (despesa) {
      setCurrentDespesa(despesa);
      setFormData({
        descricao: despesa.descricao,
        valor: despesa.valor,
        data: despesa.data,
        categoria: despesa.categoria,
        status_pagamento: despesa.status_pagamento
      });
    } else {
      setCurrentDespesa(null);
      setFormData({
        descricao: '',
        valor: '',
        data: new Date().toISOString().split('T')[0],
        categoria: 'mao_de_obra',
        status_pagamento: 'pago'
      });
    }
    
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentDespesa(null);
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
      
      const despesaData = {
        ...formData,
        obra_id: obraId
      };
      
      // Tratar o campo valor
      if (formData.valor === '') {
        despesaData.valor = null;
      } else {
        despesaData.valor = parseFloat(formData.valor.replace(',', '.'));
      }
      
      let result;
      
      if (currentDespesa) {
        // Atualizar despesa existente
        result = await updateDespesa(currentDespesa.id, despesaData);
      } else {
        // Criar nova despesa
        result = await createDespesa(despesaData);
      }
      
      if (result.error) {
        throw result.error;
      }
      
      // Recarregar despesas
      const { data, error } = await getDespesasByObraId(obraId);
      
      if (error) {
        throw error;
      }
      
      setDespesas(data || []);
      
      // Recalcular total gasto
      const total = data.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
      setTotalGasto(total);
      
      // Comunicar o total gasto para o componente pai
      if (onTotalGastoChange) {
        onTotalGastoChange(total);
      }
      
      // Recalcular totais por categoria
      const catTotals = {};
      data.forEach(despesa => {
        const cat = despesa.categoria || 'outros';
        catTotals[cat] = (catTotals[cat] || 0) + parseFloat(despesa.valor || 0);
      });
      setCategorias(catTotals);
      
      closeModal();
    } catch (error) {
      console.error('Erro ao salvar despesa:', error);
      setError(error.message || 'Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  // Excluir despesa
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta despesa?')) {
      return;
    }
    
    try {
      setLoading(true);
      
      const { error } = await deleteDespesa(id);
      
      if (error) {
        throw error;
      }
      
      // Recarregar despesas
      const { data, error: fetchError } = await getDespesasByObraId(obraId);
      
      if (fetchError) {
        throw fetchError;
      }
      
      setDespesas(data || []);
      
      // Recalcular total gasto
      const total = data.reduce((acc, despesa) => acc + parseFloat(despesa.valor || 0), 0);
      setTotalGasto(total);
      
      // Comunicar o total gasto para o componente pai
      if (onTotalGastoChange) {
        onTotalGastoChange(total);
      }
      
      // Recalcular totais por categoria
      const catTotals = {};
      data.forEach(despesa => {
        const cat = despesa.categoria || 'outros';
        catTotals[cat] = (catTotals[cat] || 0) + parseFloat(despesa.valor || 0);
      });
      setCategorias(catTotals);
    } catch (error) {
      console.error('Erro ao excluir despesa:', error);
      setError(error.message || 'Erro ao excluir despesa');
    } finally {
      setLoading(false);
    }
  };

  // Calcular percentual do orçamento gasto
  const calcularPercentualGasto = () => {
    if (!orcamentoTotal || orcamentoTotal <= 0) return 0;
    return Math.min(100, Math.round((totalGasto / orcamentoTotal) * 100));
  };

  // Verificar se o orçamento foi excedido
  const isOrcamentoExcedido = () => {
    if (!orcamentoTotal || orcamentoTotal <= 0) return false;
    return totalGasto > orcamentoTotal;
  };

  const percentualGasto = calcularPercentualGasto();
  const orcamentoExcedido = isOrcamentoExcedido();

  if (loading && despesas.length === 0) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <FaMoneyBillWave className="mr-2" /> Orçamento e Despesas
        </h2>
        <button
          onClick={() => openModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
        >
          <FaPlus className="mr-2" /> Nova Despesa
        </button>
      </div>

      {/* Resumo do orçamento */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-blue-50 p-4 rounded-md">
          <div className="text-sm text-blue-800 font-medium">Orçamento Total</div>
          <div className="text-2xl font-bold">{formatCurrency(orcamentoTotal || 0)}</div>
          <div className="text-xs text-gray-500 mt-1">Valor definido para a obra</div>
        </div>
        <div className="bg-purple-50 p-4 rounded-md">
          <div className="text-sm text-purple-800 font-medium">Valor Previsto (Etapas)</div>
          <div className="text-2xl font-bold">{formatCurrency(valorPrevistoTotal || 0)}</div>
          <div className="text-xs text-gray-500 mt-1">Soma dos valores previstos das etapas</div>
        </div>
        <div className="bg-green-50 p-4 rounded-md">
          <div className="text-sm text-green-800 font-medium">Total Gasto</div>
          <div className="text-2xl font-bold">{formatCurrency(totalGasto || 0)}</div>
          <div className="text-xs text-gray-500 mt-1">Soma de todas as despesas</div>
        </div>
        <div className={`p-4 rounded-md ${orcamentoExcedido ? 'bg-red-50' : 'bg-yellow-50'}`}>
          <div className={`text-sm font-medium ${orcamentoExcedido ? 'text-red-800' : 'text-yellow-800'}`}>
            Saldo Disponível
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(orcamentoTotal - totalGasto)}
          </div>
          <div className="text-xs text-gray-500 mt-1">Orçamento total menos total gasto (não considera valores previstos)</div>
        </div>
      </div>

      {/* Saldo Não Comprometido */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Saldo Real Disponível</h3>
        <div className={`p-4 rounded-md ${(orcamentoTotal - valorPrevistoTotal - totalGasto) < 0 ? 'bg-red-50' : 'bg-teal-50'}`}>
          <div className={`text-sm font-medium ${(orcamentoTotal - valorPrevistoTotal - totalGasto) < 0 ? 'text-red-800' : 'text-teal-800'}`}>
            Saldo Não Comprometido
          </div>
          <div className="text-2xl font-bold">
            {formatCurrency(orcamentoTotal - valorPrevistoTotal - totalGasto)}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            Orçamento total menos valor previsto nas etapas menos total gasto
            {(orcamentoTotal - valorPrevistoTotal - totalGasto) < 0 && 
              <span className="text-red-600 block mt-1">
                Atenção: O valor comprometido (previsto + gasto) excede o orçamento total!
              </span>
            }
          </div>
        </div>
      </div>

      {/* Barra de progresso do orçamento */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Progresso do Orçamento</span>
          <span>{percentualGasto}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full ${orcamentoExcedido ? 'bg-red-600' : 'bg-blue-600'}`} 
            style={{ width: `${percentualGasto}%` }}
          ></div>
        </div>
        {orcamentoExcedido && (
          <div className="mt-2 text-sm text-red-600 flex items-center">
            <FaExclamationTriangle className="mr-1" /> 
            Orçamento excedido em {formatCurrency(totalGasto - orcamentoTotal)}
          </div>
        )}
      </div>

      {/* Progresso da obra baseado nas etapas */}
      <div className="mb-6">
        <div className="flex justify-between text-sm mb-1">
          <span>Progresso da Obra</span>
          <span>{progressoObra}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className="h-2.5 rounded-full bg-green-600" 
            style={{ width: `${progressoObra}%` }}
          ></div>
        </div>
      </div>

      {/* Despesas por categoria */}
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-3">Despesas por Categoria</h3>
        {Object.keys(categorias).length === 0 ? (
          <div className="text-center py-4 text-gray-500">
            Nenhuma despesa cadastrada para esta obra.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(categorias).map(([categoria, valor]) => {
              const categoriaInfo = getCategoriaLabel(categoria);
              const percentual = Math.round((valor / totalGasto) * 100);
              
              return (
                <div key={categoria} className="border rounded-md p-3">
                  <div className="flex justify-between items-center mb-2">
                    <span className={`px-2 py-1 rounded-full text-xs ${categoriaInfo.color}`}>
                      {categoriaInfo.label}
                    </span>
                    <span className="text-sm font-medium">{percentual}%</span>
                  </div>
                  <div className="text-lg font-bold">{formatCurrency(valor)}</div>
                  <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2">
                    <div 
                      className="h-1.5 rounded-full bg-blue-600" 
                      style={{ width: `${percentual}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Lista de despesas */}
      {error ? (
        <div className="bg-red-100 text-red-700 p-3 rounded-md mb-4">
          {error}
        </div>
      ) : despesas.length === 0 ? (
        <div className="text-center py-4 text-gray-500">
          Nenhuma despesa cadastrada para esta obra.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Descrição
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Valor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Categoria
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {despesas.map((despesa) => {
                const categoriaInfo = getCategoriaLabel(despesa.categoria);
                const statusInfo = getStatusPagamentoLabel(despesa.status_pagamento);
                
                return (
                  <tr key={despesa.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{despesa.descricao}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">{formatCurrency(despesa.valor)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-500">{formatDate(despesa.data)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${categoriaInfo.color}`}>
                        {categoriaInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => openModal(despesa)}
                          className="text-blue-600 hover:text-blue-900"
                          title="Editar"
                        >
                          <FaEdit />
                        </button>
                        <button
                          onClick={() => handleDelete(despesa.id)}
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

      {/* Modal para adicionar/editar despesa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h2 className="text-xl font-semibold mb-4">
              {currentDespesa ? 'Editar Despesa' : 'Adicionar Despesa'}
            </h2>
            
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="descricao">
                  Descrição
                </label>
                <input
                  type="text"
                  id="descricao"
                  name="descricao"
                  value={formData.descricao}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="valor">
                  Valor (R$)
                </label>
                <input
                  type="text"
                  id="valor"
                  name="valor"
                  value={formData.valor}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                  pattern="[0-9]+([,\.][0-9]+)?"
                  placeholder="0,00"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="data">
                  Data
                </label>
                <input
                  type="date"
                  id="data"
                  name="data"
                  value={formData.data}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="categoria">
                  Categoria
                </label>
                <select
                  id="categoria"
                  name="categoria"
                  value={formData.categoria}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="mao_de_obra">Mão de Obra</option>
                  <option value="equipamento">Equipamento</option>
                  <option value="servico">Serviço</option>
                  <option value="imposto">Imposto</option>
                  <option value="outros">Outros</option>
                </select>
              </div>
              
              <div className="mb-4">
                <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="status_pagamento">
                  Status de Pagamento
                </label>
                <select
                  id="status_pagamento"
                  name="status_pagamento"
                  value={formData.status_pagamento}
                  onChange={handleChange}
                  className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                  required
                >
                  <option value="pago">Pago</option>
                  <option value="pendente">Pendente</option>
                  <option value="cancelado">Cancelado</option>
                </select>
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
    </div>
  );
};

export default OrcamentoObra; 