import React, { useState, useEffect } from 'react';
import { FaPlus, FaEdit, FaTrash, FaArrowUp, FaArrowDown, FaLink, FaUnlink, FaCheckSquare, FaExclamationTriangle, FaClock, FaCalculator, FaBoxes, FaList } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import EtapaMateriais from './EtapaMateriais';
import { criarEtapasPadrao } from '../services/etapasService';

const EtapasObra = ({ obraId, onOrcamentoChange, onProgressoChange }) => {
  const [etapas, setEtapas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [activeTab, setActiveTab] = useState('info');
  const [currentEtapa, setCurrentEtapa] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    data_inicio: '',
    data_previsao_termino: '',
    status: 'pendente',
    progresso: 0,
    valor_previsto: 0,
    valor_realizado: 0,
    progresso_automatico: false
  });
  const [regeneratingEtapas, setRegeneratingEtapas] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Função para formatar moeda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Função para formatar data para o input
  const formatDateForInput = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  };

  // Função para calcular o progresso financeiro
  const calcularProgressoFinanceiro = (valorRealizado, valorPrevisto) => {
    if (!valorPrevisto || valorPrevisto <= 0) return 0;
    const progresso = (valorRealizado / valorPrevisto) * 100;
    
    // Para exibição no formulário, podemos manter precisão decimal para valores pequenos
    // mas para salvar no banco, vamos tratar isso no momento do update
    return progresso;
  };

  // Função para atualizar o progresso automaticamente
  const atualizarProgressoAutomatico = (valorRealizado, valorPrevisto) => {
    if (formData.progresso_automatico) {
      const novoProgresso = calcularProgressoFinanceiro(valorRealizado, valorPrevisto);
      setFormData(prev => ({
        ...prev,
        progresso: novoProgresso
      }));
    }
  };

  // Manipular mudanças no formulário
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    // Para checkboxes, use o valor checked
    if (type === 'checkbox') {
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: checked
        };
        
        // Se estiver ativando o cálculo automático, calcular o progresso imediatamente
        if (name === 'progresso_automatico' && checked) {
          newData.progresso = calcularProgressoFinanceiro(
            prev.valor_realizado,
            prev.valor_previsto
          );
        }
        
        return newData;
      });
      return;
    }
    
    // Para campos numéricos, converta para número ou use string vazia
    if (type === 'number') {
      const isProgressField = name === 'progresso';
      // Para o campo progresso, garantir que é inteiro
      const numberValue = value === '' ? '' : isProgressField ? 
        Math.round(parseInt(value)) : parseFloat(value);
      
      setFormData(prev => {
        const newData = {
          ...prev,
          [name]: numberValue
        };
        
        // Se o progresso automático estiver ativado e o valor alterado for financeiro,
        // recalcular o progresso
        if (prev.progresso_automatico && (name === 'valor_realizado' || name === 'valor_previsto')) {
          const valorRealizado = name === 'valor_realizado' ? numberValue : prev.valor_realizado;
          const valorPrevisto = name === 'valor_previsto' ? numberValue : prev.valor_previsto;
          
          let novoProgresso = calcularProgressoFinanceiro(valorRealizado, valorPrevisto);
          
          // Garantir que seja inteiro para o banco
          if (valorRealizado > 0 && novoProgresso < 1) {
            novoProgresso = 1;
          } else {
            novoProgresso = Math.round(novoProgresso);
          }
          
          newData.progresso = novoProgresso;
        }
        
        return newData;
      });
      return;
    }
    
    // Para select, verificar se é o status e se está sendo marcado como concluído
    if (name === 'status' && value === 'concluida') {
      setFormData(prev => {
        // Se a etapa for marcada como concluída, definir progresso como 100%
        return {
          ...prev,
          [name]: value,
          progresso: 100
        };
      });
      return;
    }
    
    // Para outros campos, use o valor diretamente
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Carregar etapas
  useEffect(() => {
    fetchEtapas();
  }, [obraId]);

  // Atualizar orçamento total da obra quando as etapas mudam
  useEffect(() => {
    if (etapas.length > 0) {
      // Calcular e notificar sobre o valor previsto total
      atualizarOrcamentoObra();
      
      // Notificar sobre mudança no progresso
      if (onProgressoChange) {
        onProgressoChange();
      }
    }
  }, [etapas]);

  // Atualizar progresso automático quando os valores financeiros mudam
  useEffect(() => {
    // Verificar se há etapas com progresso automático
    const etapasAutomaticas = etapas.filter(etapa => etapa.progresso_automatico);
    
    if (etapasAutomaticas.length > 0) {
      // Verificar se alguma etapa precisa ter seu progresso atualizado
      const etapasParaAtualizar = etapasAutomaticas.filter(etapa => {
        const progressoCalculado = calcularProgressoFinanceiro(
          etapa.valor_realizado || 0,
          etapa.valor_previsto || 0
        );
        
        // Se o progresso calculado for diferente do atual, atualizar
        return Math.abs(progressoCalculado - etapa.progresso) >= 1;
      });
      
      if (etapasParaAtualizar.length > 0) {
        atualizarProgressoAutomaticoEtapas();
      }
    }
  }, [etapas]);

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
    
  // Calcular e atualizar o orçamento total da obra
  const atualizarOrcamentoObra = async () => {
    try {
      if (!etapas.length) return;
      
      // Calcular o total previsto
      const totalPrevisto = etapas.reduce((total, etapa) => total + (parseFloat(etapa.valor_previsto) || 0), 0);
      
      // Notificar o componente pai sobre a mudança no valor previsto total
      // mas não atualizar o orçamento da obra diretamente
      if (onOrcamentoChange) {
        onOrcamentoChange(totalPrevisto);
      }
    } catch (error) {
      console.error('Erro ao calcular valor previsto total:', error);
    }
  };

  // Salvar etapa
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);

      // Criar uma cópia dos dados do formulário para enviar
      const etapaData = {
        ...formData,
        obra_id: obraId,
        ordem: etapas.length + 1,
        progresso_automatico: formData.progresso_automatico // Salvar a configuração no banco
      };
      
      // Garantir que as datas estejam no formato correto
      if (etapaData.data_inicio) {
        etapaData.data_inicio = new Date(etapaData.data_inicio).toISOString();
      } else {
        etapaData.data_inicio = null; // Usar null ao invés de string vazia
      }
      
      if (etapaData.data_previsao_termino) {
        etapaData.data_previsao_termino = new Date(etapaData.data_previsao_termino).toISOString();
      } else {
        etapaData.data_previsao_termino = null; // Usar null ao invés de string vazia
      }
      
      // Tratar campos numéricos vazios
      if (etapaData.progresso === '') {
        etapaData.progresso = null;
      } else if (etapaData.progresso !== null) {
        // Garantir que o progresso é um inteiro
        etapaData.progresso = Math.round(Number(etapaData.progresso));
      }
      
      if (etapaData.valor_previsto === '') {
        etapaData.valor_previsto = null;
      }
      
      if (etapaData.valor_realizado === '') {
        etapaData.valor_realizado = null;
      }

      console.log('Criando nova etapa:', etapaData);

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
        data_previsao_termino: '',
        status: 'pendente',
        progresso: 0,
        valor_previsto: 0,
        valor_realizado: 0,
        progresso_automatico: false
      });
      
      // Notificar sobre mudança no progresso
      if (onProgressoChange) {
        onProgressoChange();
      }
    } catch (error) {
      console.error('Erro ao salvar etapa:', error);
      setError('Erro ao salvar etapa: ' + (error.message || 'Por favor, tente novamente.'));
    } finally {
      setLoading(false);
    }
  };

  // Atualizar etapa
  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      
      // Criar uma cópia dos dados do formulário para enviar
      const etapaData = {
        ...formData,
        progresso_automatico: formData.progresso_automatico // Salvar a configuração no banco
      };
      
      // Garantir que as datas estejam no formato correto
      if (etapaData.data_inicio) {
        etapaData.data_inicio = new Date(etapaData.data_inicio).toISOString();
      } else {
        etapaData.data_inicio = null; // Usar null ao invés de string vazia
      }
      
      if (etapaData.data_previsao_termino) {
        etapaData.data_previsao_termino = new Date(etapaData.data_previsao_termino).toISOString();
      } else {
        etapaData.data_previsao_termino = null; // Usar null ao invés de string vazia
      }
      
      // Tratar campos numéricos vazios
      if (etapaData.progresso === '') {
        etapaData.progresso = null;
      } else if (etapaData.progresso !== null) {
        // Garantir que o progresso é um inteiro
        etapaData.progresso = Math.round(Number(etapaData.progresso));
      }
      
      if (etapaData.valor_previsto === '') {
        etapaData.valor_previsto = null;
      }
      
      if (etapaData.valor_realizado === '') {
        etapaData.valor_realizado = null;
      }

      console.log('Dados a serem enviados:', etapaData);

      const { error } = await supabase
        .from('etapas_obra')
        .update(etapaData)
        .eq('id', formData.id);

      if (error) throw error;

      await fetchEtapas();
      setShowModal(false);
      setFormData({
        nome: '',
        descricao: '',
        data_inicio: '',
        data_previsao_termino: '',
        status: 'pendente',
        progresso: 0,
        valor_previsto: 0,
        valor_realizado: 0,
        progresso_automatico: false
      });
      
      // Notificar sobre mudança no progresso
      if (onProgressoChange) {
        onProgressoChange();
      }
    } catch (error) {
      console.error('Erro ao atualizar etapa:', error);
      setError('Erro ao atualizar etapa: ' + (error.message || 'Por favor, tente novamente.'));
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
      
      // Notificar sobre mudança no progresso
      if (onProgressoChange) {
        onProgressoChange();
      }
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

  // Abrir modal para editar etapa
  const openEditModal = (etapa) => {
    setFormData({
      id: etapa.id,
      nome: etapa.nome || '',
      descricao: etapa.descricao || '',
      data_inicio: formatDateForInput(etapa.data_inicio),
      data_previsao_termino: formatDateForInput(etapa.data_previsao_termino),
      status: etapa.status || 'pendente',
      progresso: etapa.progresso || 0,
      valor_previsto: etapa.valor_previsto || 0,
      valor_realizado: etapa.valor_realizado || 0,
      progresso_automatico: etapa.progresso_automatico || false
    });
    setCurrentEtapa(etapa);
    setEditMode(true);
    setActiveTab('info');
    setShowModal(true);
  };

  // Fechar modal
  const closeModal = () => {
    setShowModal(false);
    setCurrentEtapa(null);
    setFormData({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_previsao_termino: '',
      status: 'pendente',
      progresso: 0,
      valor_previsto: 0,
      valor_realizado: 0,
      progresso_automatico: false
    });
  };

  // Abrir modal para criar nova etapa
  const openCreateModal = () => {
    setFormData({
      nome: '',
      descricao: '',
      data_inicio: '',
      data_previsao_termino: '',
      status: 'pendente',
      progresso: 0,
      valor_previsto: 0,
      valor_realizado: 0,
      progresso_automatico: false
    });
    setEditMode(false);
    setActiveTab('info');
    setShowModal(true);
  };

  // Atualizar progresso automático de todas as etapas configuradas
  const atualizarProgressoAutomaticoEtapas = async () => {
    try {
      // Filtrar etapas com progresso automático ativado
      const etapasAutomaticas = etapas.filter(etapa => etapa.progresso_automatico);
      
      console.log(`Atualizando progresso de ${etapasAutomaticas.length} etapas automáticas`);
      
      if (etapasAutomaticas.length === 0) {
        console.log("Nenhuma etapa com progresso automático encontrada");
        setSuccessMessage("Não existem etapas configuradas para progresso automático");
        setTimeout(() => setSuccessMessage(''), 5000);
        return;
      }
      
      // Preparar atualizações para cada etapa
      const atualizacoes = etapasAutomaticas.map(etapa => {
        const valorRealizado = etapa.valor_realizado || 0;
        const valorPrevisto = etapa.valor_previsto || 0;
        // Calcular o progresso
        let novoProgresso = calcularProgressoFinanceiro(valorRealizado, valorPrevisto);
        
        // Garantir que o valor seja um inteiro para o banco de dados
        // Para valores muito pequenos, garantir pelo menos 1% se houver algum valor realizado
        if (valorRealizado > 0 && novoProgresso < 1) {
          novoProgresso = 1; // Mínimo de 1% se houver valor realizado
        } else {
          novoProgresso = Math.round(novoProgresso); // Arredondar para inteiro
        }
        
        console.log(`Etapa ${etapa.id} (${etapa.nome}): Valor realizado=${valorRealizado}, Valor previsto=${valorPrevisto}, Novo progresso=${novoProgresso}%`);
        
        return {
          id: etapa.id,
          progresso: novoProgresso
        };
      });
      
      // Atualizar no banco de dados
      const { error } = await supabase
        .from('etapas_obra')
        .upsert(atualizacoes);
      
      if (error) {
        console.error("Erro ao atualizar progresso no banco:", error);
        throw error;
      }
      
      console.log("Progresso atualizado com sucesso para todas as etapas");
      setSuccessMessage("Progresso atualizado com sucesso para todas as etapas!");
      setTimeout(() => setSuccessMessage(''), 5000);
      
      // Recarregar etapas
      await fetchEtapas();
      
    } catch (error) {
      console.error('Erro ao atualizar progresso automático:', error);
      setError('Erro ao atualizar progresso automático: ' + error.message);
      setTimeout(() => setError(''), 5000);
    }
  };

  // Adicionar botão para atualizar progresso automático
  const renderBotaoAtualizarProgressoAutomatico = () => {
    // Verificar se existem etapas com progresso automático
    const temEtapasAutomaticas = etapas.some(etapa => etapa.progresso_automatico);
    
    if (!temEtapasAutomaticas) return null;

  return (
        <button
        onClick={atualizarProgressoAutomaticoEtapas}
        className="ml-4 bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 flex items-center text-sm font-medium"
        title="Atualizar progresso de todas as etapas configuradas para cálculo automático"
        >
        <FaCalculator className="mr-1" /> Atualizar Progresso Automático
        </button>
    );
  };

  // Renderizar legenda das cores de progresso
  const renderLegendaProgresso = () => {
    return (
      <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 bg-red-500 rounded-full mr-1"></div>
          <span>Baixo (&lt;30%)</span>
      </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-yellow-500 rounded-full mr-1"></div>
          <span>Médio (30-70%)</span>
        </div>
        <div className="flex items-center">
          <div className="w-3 h-3 bg-green-500 rounded-full mr-1"></div>
          <span>Alto (&gt;70%)</span>
        </div>
        <div className="flex items-center">
          <FaCalculator className="text-blue-500 mr-1" />
          <span>Progresso automático</span>
        </div>
      </div>
    );
  };

  // Função para regenerar etapas padrão
  const regenerarEtapasPadrao = async () => {
    try {
      setRegeneratingEtapas(true);
      setError(null);
      setSuccessMessage('');
      
      console.log('Iniciando geração de etapas padrão para obra ID:', obraId);
      const { data, error, errors, parcial } = await criarEtapasPadrao(obraId);
      
      if (error) {
        console.error('Erro ao criar etapas padrão:', error);
        
        // Mostrar detalhes específicos do erro
        if (error.message) {
          setError(`Erro ao criar etapas padrão: ${error.message}`);
        } else if (error.code) {
          setError(`Erro ao criar etapas padrão (${error.code}): ${error.message || 'Erro desconhecido'}`);
        } else {
          setError('Erro ao criar etapas padrão: ' + JSON.stringify(error));
        }
        
        throw error;
      }
      
      if (errors && errors.length > 0) {
        console.error('Erros ao inserir algumas etapas:', errors);
        if (parcial) {
          setSuccessMessage(`Algumas etapas foram criadas com sucesso (${data.length}), mas ocorreram ${errors.length} erros.`);
        } else {
          setError(`Falha ao criar etapas padrão. ${errors.length} erros encontrados.`);
        }
      } else if (data && data.length > 0) {
        console.log('Etapas padrão criadas com sucesso:', data.length);
        setSuccessMessage(`${data.length} etapas padrão criadas com sucesso!`);
      } else {
        console.warn('Nenhuma etapa foi criada');
        setError('Nenhuma etapa foi criada. Verifique o console para mais detalhes.');
      }
      
      await fetchEtapas();
      setTimeout(() => setSuccessMessage(''), 8000); // Remove a mensagem após 8 segundos
      
    } catch (error) {
      console.error('Erro ao regenerar etapas padrão:', error);
      
      let errorMessage = 'Erro ao criar etapas padrão';
      if (error.message) {
        errorMessage += ': ' + error.message;
      }
      
      setError(errorMessage);
    } finally {
      setRegeneratingEtapas(false);
    }
  };

  const renderTabs = () => {
    return (
      <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-8">
                <button
                  onClick={() => setActiveTab('info')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                    activeTab === 'info'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
            <FaList className="mr-2" /> Informações
                </button>
                  <button
                    onClick={() => setActiveTab('materiais')}
            className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${
                      activeTab === 'materiais'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
            <FaBoxes className="mr-2" /> Materiais
                  </button>
              </nav>
            </div>
    );
  };

  // Renderizar formulário de informações da etapa
  const renderInfoForm = () => (
    <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome da Etapa
                </label>
                <input
                  type="text"
                  name="nome"
                  value={formData.nome}
                  onChange={handleChange}
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
                  onChange={handleChange}
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
                    onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Data de Término
                  </label>
                  <input
                    type="date"
            name="data_previsao_termino"
            value={formData.data_previsao_termino}
                    onChange={handleChange}
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
                  onChange={handleChange}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="pendente">Pendente</option>
                  <option value="em_andamento">Em Andamento</option>
                  <option value="concluida">Concluída</option>
                </select>
              </div>
              
              <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Progresso (%)
                </label>
                    {formData.progresso_automatico ? (
                      <div className="mt-2">
                        <div className="bg-blue-50 p-3 rounded-md">
                          <p className="text-sm text-blue-800">
                            <span className="font-medium">Progresso calculado automaticamente:</span> {formData.progresso}%
                            <br />
                            <span className="text-xs">
                              (Baseado na relação entre valor realizado e valor previsto)
                            </span>
                          </p>
                        </div>
                      </div>
                    ) : (
                <input
                        type="number"
                  name="progresso"
                        value={formData.progresso || ''}
                        onChange={handleChange}
                  min="0"
                  max="100"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    )}
                    <div className="mt-2">
                      <label className="inline-flex items-center">
                        <input
                          type="checkbox"
                          name="progresso_automatico"
                          checked={formData.progresso_automatico || false}
                          onChange={handleChange}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="ml-2 text-sm text-gray-600">
                          Calcular progresso automaticamente com base nos valores financeiros
                        </span>
                      </label>
                    </div>
              </div>
              
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Valor Previsto (R$)
                    </label>
                    <input
                      type="number"
                      name="valor_previsto"
                      value={formData.valor_previsto || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700">
                      Valor Realizado (R$)
                    </label>
                    <input
                      type="number"
                      name="valor_realizado"
                      value={formData.valor_realizado || ''}
                      onChange={handleChange}
                      min="0"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>
                      </div>
  );

  // Renderizar aba de materiais
  const renderMateriaisTab = () => (
              <div>
      <div id="materiais-container">
        {currentEtapa && (
                  <EtapaMateriais 
                    etapaId={currentEtapa.id} 
                    obraId={obraId} 
                    onUpdate={async () => {
                      try {
                console.log('Atualizando etapa após alteração de materiais');
                
                        // Recarregar etapas para atualizar os valores
                        await fetchEtapas();
                        
                        // Buscar a etapa atual atualizada
                        const { data: etapaAtualizada, error: etapaError } = await supabase
                          .from('etapas_obra')
                          .select('*')
                          .eq('id', currentEtapa.id)
                          .single();
                          
                        if (etapaError) throw etapaError;
                
                console.log('Etapa atualizada:', etapaAtualizada);
                        
                        // Atualizar o estado do formulário com os novos valores
                        setFormData(prev => ({
                          ...prev,
                  valor_realizado: etapaAtualizada.valor_realizado || 0
                        }));

                        // Se o progresso é automático, atualizar o progresso
                        if (etapaAtualizada.progresso_automatico) {
                  console.log('Recalculando progresso automático');
                  
                  let novoProgresso = calcularProgressoFinanceiro(
                            etapaAtualizada.valor_realizado || 0,
                            etapaAtualizada.valor_previsto || 0
                          );
                  
                  console.log(`Valor realizado: ${etapaAtualizada.valor_realizado}, Valor previsto: ${etapaAtualizada.valor_previsto}`);
                  console.log(`Novo progresso calculado: ${novoProgresso}%`);
                  
                  // Garantir que o valor seja um inteiro para o banco de dados
                  // Para valores muito pequenos, garantir pelo menos 1% se houver algum valor realizado
                  if (etapaAtualizada.valor_realizado > 0 && novoProgresso < 1) {
                    novoProgresso = 1; // Mínimo de 1% se houver valor realizado
                  } else {
                    novoProgresso = Math.round(novoProgresso); // Arredondar para inteiro
                  }

                          // Atualizar o progresso no banco de dados
                          const { error: updateError } = await supabase
                            .from('etapas_obra')
                            .update({
                              progresso: novoProgresso
                            })
                            .eq('id', etapaAtualizada.id);

                          if (updateError) throw updateError;

                  console.log(`Progresso atualizado para ${novoProgresso}%`);

                          // Atualizar o formulário com o novo progresso
                          setFormData(prev => ({
                            ...prev,
                    valor_realizado: etapaAtualizada.valor_realizado || 0,
                            progresso: novoProgresso
                          }));

                          // Recarregar etapas novamente para refletir a mudança no progresso
                          await fetchEtapas();
                        }
                        
                        // Notificar sobre mudança no progresso
                        if (onProgressoChange) {
                          onProgressoChange();
                        }
                      } catch (error) {
                        console.error('Erro ao atualizar etapa após mudança nos materiais:', error);
                        setError('Erro ao atualizar etapa. Por favor, tente novamente.');
                      }
                    }}
                  />
        )}
      </div>
    </div>
  );

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

      {successMessage && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-4">
          <div className="flex">
            <FaCheckSquare className="h-5 w-5 text-green-500 mr-2" />
            <span>{successMessage}</span>
                    </div>
                  </div>
                )}

      <div className="flex justify-between items-center mb-6">
                      <div className="flex items-center">
          <h2 className="text-lg font-semibold">Etapas da Obra</h2>
          {renderBotaoAtualizarProgressoAutomatico()}
              </div>
                          <button 
          onClick={openCreateModal}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center"
        >
          <FaPlus className="mr-2" /> Nova Etapa
                          </button>
                        </div>

      {etapas.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="mb-3 text-gray-600">Nenhuma etapa cadastrada</p>
          
          <div className="flex flex-col gap-3 justify-center items-center">
            <button
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center"
              onClick={() => setShowModal(true)}
            >
              <FaPlus className="mr-2" /> Adicionar Nova Etapa
            </button>
            
            <button
              onClick={regenerarEtapasPadrao}
              disabled={regeneratingEtapas}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded flex items-center"
            >
              {regeneratingEtapas ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Gerando Etapas Padrão...
                </>
              ) : (
                <>
                  <FaList className="mr-2" /> Gerar Etapas Padrão
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {renderLegendaProgresso()}
          {etapas.map((etapa, index) => (
            <div
              key={etapa.id}
              className={`bg-white rounded-lg shadow-sm p-4 ${
                etapa.status === 'concluida' ? 'border-l-4 border-green-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h3 className="text-lg font-medium">{etapa.nome}</h3>
                    {etapa.status === 'concluida' && (
                      <span className="ml-2 px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                        Concluída
                      </span>
                    )}
                    {etapa.status === 'em_andamento' && (
                      <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                        Em Andamento
                      </span>
                    )}
                    {etapa.status === 'pendente' && (
                      <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                        Pendente
                      </span>
                    )}
                  </div>
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
                            {etapa.data_previsao_termino && (
                              <> até {new Date(etapa.data_previsao_termino).toLocaleDateString('pt-BR')}</>
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
                            className={`h-2 rounded-full ${
                              etapa.progresso < 30 
                                ? 'bg-red-500' 
                                : etapa.progresso < 70 
                                  ? 'bg-yellow-500' 
                                  : 'bg-green-500'
                            }`}
                          style={{ width: `${etapa.progresso}%` }}
                        ></div>
                      </div>
                      </div>
                      <div className="flex items-center ml-2">
                        <span className="text-sm text-gray-600">
                          {etapa.progresso}%
                        </span>
                        {/* Indicador de cálculo automático */}
                        {etapa.progresso_automatico && (
                          <span 
                            className="ml-1 text-xs text-blue-500 cursor-help"
                            title="Progresso calculado automaticamente com base na relação entre valor realizado e valor previsto"
                          >
                            <FaCalculator className="inline" />
                          </span>
                        )}
                      </div>
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
                    onClick={() => openEditModal(etapa)}
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
            
            {renderTabs()}
            
            {/* Conteúdo da aba de Informações */}
            {activeTab === 'info' && (
              <form onSubmit={formData.id ? handleUpdate : handleSubmit} className="space-y-4">
                {renderInfoForm()}

                <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                    onClick={closeModal}
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
            )}
            
            {/* Conteúdo da aba de Materiais */}
            {activeTab === 'materiais' && (
              renderMateriaisTab()
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default EtapasObra; 