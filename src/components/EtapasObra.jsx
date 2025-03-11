import { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaLink, FaUnlink, FaCheckSquare, FaExclamationTriangle, FaClock } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';

const EtapasObra = ({ obraId }) => {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_fim: '',
    status: 'pendente',
    progresso: 0,
    estimativa_horas: 0,
    valor_previsto: 0,
    valor_realizado: 0
  });

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Carregar etapas
  useEffect(() => {
    fetchEtapas();
  }, [obraId]);

  const fetchEtapas = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data, error } = await supabase
        .from('etapas_obra')
        .select('*')
        .eq('obra_id', obraId)
        .order('ordem');

      if (error) throw error;

      setEtapas(data || []);
    } catch (error) {
      console.error('Erro ao carregar etapas:', error);
      setError('Erro ao carregar etapas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Salvar etapa
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      const etapaData = {
        ...formData,
        obra_id: obraId,
        ordem: etapas.length + 1
      };

      const { error } = await supabase
        .from('etapas_obra')
        .insert([etapaData]);

      if (error) throw error;

      await fetchEtapas();
      setShowModal(false);
      setFormData({
        nome: '',
        descricao: '',
        data_inicio: '',
        data_fim: '',
        status: 'pendente',
        progresso: 0,
        estimativa_horas: 0,
        valor_previsto: 0,
        valor_realizado: 0
      });
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      setError('Erro ao salvar etapa. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Atualizar etapa
  const handleUpdate = async (id, data) => {
    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('etapas_obra')
        .update(data)
        .eq('id', id);

      if (error) throw error;

      await fetchEtapas();
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      setError('Erro ao atualizar etapa. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Excluir etapa
  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja excluir esta etapa?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const { error } = await supabase
        .from('etapas_obra')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchEtapas();
    } catch (error) {
      console.error('Erro ao excluir etapa:', error);
      setError('Erro ao excluir etapa. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  // Reordenar etapas
  const handleReorder = async (id, direction) => {
    const index = etapas.findIndex(e => e.id === id);
    if (index === -1) return;

    const newEtapas = [...etapas];
    const etapa = newEtapas[index];
    
    if (direction === 'up' && index > 0) {
      newEtapas[index] = newEtapas[index - 1];
      newEtapas[index - 1] = etapa;
    } else if (direction === 'down' && index < newEtapas.length - 1) {
      newEtapas[index] = newEtapas[index + 1];
      newEtapas[index + 1] = etapa;
    } else {
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const updates = newEtapas.map((e, i) => ({
        id: e.id,
        ordem: i + 1
      }));

      const { error } = await supabase
        .from('etapas_obra')
        .upsert(updates);

      if (error) throw error;

      setEtapas(newEtapas);
    } catch (error) {
      console.error('Erro ao reordenar etapas:', error);
      setError('Erro ao reordenar etapas. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
          <div className="flex">
            <FaExclamationTriangle className="h-5 w-5 text-red-500 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Etapas da Obra</h2>
        <button
          onClick={() => setShowModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <FaPlus className="mr-2" /> Nova Etapa
        </button>
      </div>

      {etapas.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">Nenhuma etapa cadastrada</p>
        </div>
      ) : (
        <div className="space-y-4">
          {etapas.map((etapa, index) => (
            <div
              key={etapa.id}
              className="bg-white rounded-lg shadow-sm p-4"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="text-lg font-medium">{etapa.nome}</h3>
                  {etapa.descricao && (
                    <p className="text-gray-600 mt-1">{etapa.descricao}</p>
                  )}
                  <div className="mt-2 space-y-2">
                    <div className="flex items-center text-sm text-gray-500">
                      <FaClock className="mr-2" />
                      <span>
                        {etapa.data_inicio ? (
                          <>
                            {new Date(etapa.data_inicio).toLocaleDateString('pt-BR')}
                            {etapa.data_fim && (
                              <> até {new Date(etapa.data_fim).toLocaleDateString('pt-BR')}</>
                            )}
                          </>
                        ) : (
                          'Datas não definidas'
                        )}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <div className="flex-1">
                        <div className="h-2 bg-gray-200 rounded-full">
                          <div
                            className="h-2 bg-blue-600 rounded-full"
                            style={{ width: `${etapa.progresso}%` }}
                          ></div>
                        </div>
                      </div>
                      <span className="ml-2 text-sm text-gray-600">
                        {etapa.progresso}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div>
                        <span className="text-gray-500">Previsto:</span>
                        <span className="ml-1 font-medium">{formatCurrency(etapa.valor_previsto)}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Realizado:</span>
                        <span className="ml-1 font-medium">{formatCurrency(etapa.valor_realizado)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleReorder(etapa.id, 'up')}
                    disabled={index === 0}
                    className={`p-2 rounded-md ${
                      index === 0
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FaArrowUp />
                  </button>
                  <button
                    onClick={() => handleReorder(etapa.id, 'down')}
                    disabled={index === etapas.length - 1}
                    className={`p-2 rounded-md ${
                      index === etapas.length - 1
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <FaArrowDown />
                  </button>
                  <button
                    onClick={() => {
                      setFormData(etapa);
                      setShowModal(true);
                    }}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-md"
                  >
                    <FaEdit />
                  </button>
                  <button
                    onClick={() => handleDelete(etapa.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-md"
                  >
                    <FaTrash />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Etapa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl">
            <h2 className="text-xl font-semibold mb-4">
              {formData.id ? 'Editar Etapa' : 'Nova Etapa'}
            </h2>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Etapa
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
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
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  rows="3"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Início
                  </label>
                  <input
                    type="date"
                    name="data_inicio"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Data de Término
                  </label>
                  <input
                    type="date"
                    name="data_fim"
                    value={formData.data_fim}
                    onChange={(e) => setFormData({ ...formData, data_fim: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="pendente">Pendente</option>
                    <option value="em_andamento">Em Andamento</option>
                    <option value="concluida">Concluída</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Progresso (%)
                  </label>
                  <input
                    type="number"
                    name="progresso"
                    value={formData.progresso}
                    onChange={(e) => setFormData({ ...formData, progresso: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0"
                    max="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Previsto (R$)
                  </label>
                  <input
                    type="number"
                    name="valor_previsto"
                    value={formData.valor_previsto}
                    onChange={(e) => setFormData({ ...formData, valor_previsto: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Valor Realizado (R$)
                  </label>
                  <input
                    type="number"
                    name="valor_realizado"
                    value={formData.valor_realizado}
                    onChange={(e) => setFormData({ ...formData, valor_realizado: parseFloat(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0"
                    step="0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estimativa de Horas
                  </label>
                  <input
                    type="number"
                    name="estimativa_horas"
                    value={formData.estimativa_horas}
                    onChange={(e) => setFormData({ ...formData, estimativa_horas: parseInt(e.target.value) || 0 })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    min="0"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setFormData({
                      nome: '',
                      descricao: '',
                      data_inicio: '',
                      data_fim: '',
                      status: 'pendente',
                      progresso: 0,
                      estimativa_horas: 0,
                      valor_previsto: 0,
                      valor_realizado: 0
                    });
                  }}
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
  );
};

export default EtapasObra; 