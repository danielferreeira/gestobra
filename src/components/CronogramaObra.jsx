import React, { useState, useEffect, useRef } from 'react';
import { FaCalendarAlt, FaExclamationTriangle, FaSearch, FaSearchMinus, FaSearchPlus, FaFileExport, FaLink, FaInfoCircle, FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import { supabase } from '../services/supabaseClient';
import { getEtapasByObraId, getDependenciasByEtapaId } from '../services/etapasService';
import html2canvas from 'html2canvas';

const CronogramaObra = ({ obraId }) => {
  const [etapas, setEtapas] = useState([]);
  const [dependencias, setDependencias] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [escala, setEscala] = useState('mensal'); // 'mensal' ou 'semanal'
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showDependencias, setShowDependencias] = useState(false);
  const [selectedEtapa, setSelectedEtapa] = useState(null);
  const [etapaInfo, setEtapaInfo] = useState(null);
  const [periodoOffset, setPeriodoOffset] = useState(0);
  const cronogramaRef = useRef(null);

  // Carregar etapas da obra
  useEffect(() => {
    const fetchEtapas = async () => {
      if (!obraId) {
        setLoading(false);
        setError('ID da obra não fornecido');
        return;
      }
      
      try {
        setLoading(true);
        const { data, error } = await getEtapasByObraId(obraId);
        
        if (error) {
          throw error;
        }
        
          setEtapas(data || []);
        
        // Carregar todas as dependências
        const todasDependencias = [];
        for (const etapa of data || []) {
          const { data: depData } = await getDependenciasByEtapaId(etapa.id);
          if (depData && depData.length > 0) {
            todasDependencias.push(...depData);
          }
        }
        setDependencias(todasDependencias);
        
        setLoading(false);
      } catch (error) {
        console.error('Erro ao carregar etapas:', error);
        setError(error.message || 'Erro ao carregar etapas');
        setLoading(false);
      }
    };
    
    fetchEtapas();
  }, [obraId]);

  // Formatar data com tratamento de erro
  const formatDate = (dateString) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('pt-BR');
    } catch (e) {
      console.error('Erro ao formatar data:', e);
      return '';
    }
  };

  // Gerar períodos para o cronograma com tratamento de erro
  const gerarPeriodos = () => {
    try {
      // Função para gerar períodos padrão (mês atual + 5 meses)
      const gerarPeriodosPadrao = () => {
        const hoje = new Date();
        const periodos = [];
        
        for (let i = 0; i < 6; i++) {
          const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
          periodos.push({
            data,
            label: data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          });
        }
        
        return periodos;
      };
      
      // Se não houver etapas, retornar período padrão
      if (!etapas || etapas.length === 0) {
        return gerarPeriodosPadrao();
      }
      
      // Encontrar a data mais antiga e mais recente entre as etapas
      let dataInicio = null;
      let dataFim = null;
      
      etapas.forEach(etapa => {
        if (etapa.data_inicio) {
          try {
            const dataEtapaInicio = new Date(etapa.data_inicio);
            if (!isNaN(dataEtapaInicio.getTime())) {
              if (!dataInicio || dataEtapaInicio < dataInicio) {
                dataInicio = dataEtapaInicio;
              }
            }
          } catch (e) {
            console.error('Erro ao processar data de início:', etapa.data_inicio, e);
          }
        }
        
        if (etapa.data_fim) {
          try {
            const dataEtapaFim = new Date(etapa.data_fim);
            if (!isNaN(dataEtapaFim.getTime())) {
              if (!dataFim || dataEtapaFim > dataFim) {
                dataFim = dataEtapaFim;
              }
            }
          } catch (e) {
            console.error('Erro ao processar data de fim:', etapa.data_fim, e);
          }
        }
      });
      
      // Se não houver datas válidas, retornar período padrão
      if (!dataInicio || !dataFim || isNaN(dataInicio.getTime()) || isNaN(dataFim.getTime())) {
        return gerarPeriodosPadrao();
      }
      
      // Estender o período em 1 mês antes e depois para melhor visualização
      dataInicio = new Date(dataInicio.getFullYear(), dataInicio.getMonth() - 1, 1);
      dataFim = new Date(dataFim.getFullYear(), dataFim.getMonth() + 2, 0); // Último dia do mês seguinte
      
      const periodos = [];
      const dataAtual = new Date(dataInicio);
      
      // Gerar períodos mensais
      if (escala === 'mensal') {
        while (dataAtual <= dataFim) {
          periodos.push({
            data: new Date(dataAtual),
            label: dataAtual.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
          });
          
          dataAtual.setMonth(dataAtual.getMonth() + 1);
        }
      } 
      // Gerar períodos semanais
      else {
        while (dataAtual <= dataFim) {
          periodos.push({
            data: new Date(dataAtual),
            label: `${dataAtual.getDate()}/${dataAtual.getMonth() + 1}`
          });
          
          dataAtual.setDate(dataAtual.getDate() + 7);
        }
      }
      
      return periodos;
    } catch (e) {
      console.error('Erro ao gerar períodos:', e);
      // Retornar um período padrão em caso de erro
      const hoje = new Date();
      const periodos = [];
      
      for (let i = 0; i < 6; i++) {
        const data = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
        periodos.push({
          data,
          label: data.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })
        });
      }
      
      return periodos;
    }
  };

  // Calcular posição e largura da barra de etapa
  const calcularBarraEtapa = (etapa, periodos) => {
    if (!etapa.data_inicio || !periodos.length) return { left: 0, width: 0 };
    
    const dataInicioEtapa = new Date(etapa.data_inicio);
    const dataFimEtapa = etapa.data_fim ? new Date(etapa.data_fim) : new Date(dataInicioEtapa);
    
    // Se não tiver data de fim, usar 14 dias a partir da data de início
    if (!etapa.data_fim) {
      dataFimEtapa.setDate(dataFimEtapa.getDate() + 14);
    }
    
    const primeiroPeriodo = periodos[0].data;
    const ultimoPeriodo = periodos[periodos.length - 1].data;
    const larguraTotal = periodos.length * 100 * zoomLevel; // 100px por período, ajustado pelo zoom
    
    // Calcular posição inicial (left)
    const diferencaInicio = dataInicioEtapa - primeiroPeriodo;
    const totalDias = ultimoPeriodo - primeiroPeriodo;
    const left = (diferencaInicio / totalDias) * larguraTotal;
    
    // Calcular largura
    const duracaoEtapa = dataFimEtapa - dataInicioEtapa;
    const width = (duracaoEtapa / totalDias) * larguraTotal;
    
    return {
      left: Math.max(0, left),
      width: Math.max(50 * zoomLevel, width) // Largura mínima de 50px para visualização, ajustada pelo zoom
    };
  };

  // Verificar se uma etapa está atrasada
  const isEtapaAtrasada = (etapa) => {
    if (!etapa.data_fim) return false;
    
    const hoje = new Date();
    const dataFim = new Date(etapa.data_fim);
    
    return hoje > dataFim && etapa.status !== 'concluida';
  };

  // Obter cor da barra com base no status e progresso
  const getCorBarra = (etapa) => {
    if (isEtapaAtrasada(etapa)) {
      return 'bg-red-500';
    }
    
    switch (etapa.status) {
      case 'concluida':
        return 'bg-green-500';
      case 'em_andamento':
        return 'bg-blue-500';
      default:
        return 'bg-gray-400';
    }
  };

  // Obter label do status
  const getStatusLabel = (status) => {
    const statusMap = {
      'pendente': { label: 'Pendente', color: 'bg-yellow-100 text-yellow-800' },
      'em_andamento': { label: 'Em Andamento', color: 'bg-blue-100 text-blue-800' },
      'concluida': { label: 'Concluída', color: 'bg-green-100 text-green-800' }
    };
    
    return statusMap[status] || { label: status, color: 'bg-gray-100 text-gray-800' };
  };

  // Aumentar zoom
  const aumentarZoom = () => {
    setZoomLevel(prev => Math.min(prev + 0.25, 2));
  };

  // Diminuir zoom
  const diminuirZoom = () => {
    setZoomLevel(prev => Math.max(prev - 0.25, 0.5));
  };

  // Resetar zoom
  const resetarZoom = () => {
    setZoomLevel(1);
  };

  // Exportar cronograma como imagem
  const exportarCronograma = async () => {
    if (!cronogramaRef.current) return;
    
    try {
      const canvas = await html2canvas(cronogramaRef.current);
      const image = canvas.toDataURL('image/png');
      
      // Criar link para download
      const link = document.createElement('a');
      link.href = image;
      link.download = `cronograma-obra-${obraId}.png`;
      link.click();
    } catch (error) {
      console.error('Erro ao exportar cronograma:', error);
      alert('Erro ao exportar cronograma. Tente novamente.');
    }
  };

  // Mostrar informações da etapa
  const mostrarInfoEtapa = (etapa) => {
    setSelectedEtapa(etapa.id);
    setEtapaInfo(etapa);
  };

  // Fechar informações da etapa
  const fecharInfoEtapa = () => {
    setSelectedEtapa(null);
    setEtapaInfo(null);
  };

  // Navegar para períodos anteriores
  const navegarAnterior = () => {
    setPeriodoOffset(prev => prev - 1);
  };

  // Navegar para próximos períodos
  const navegarProximo = () => {
    setPeriodoOffset(prev => prev + 1);
  };

  // Obter períodos com offset
  const getPeriodosComOffset = () => {
    const todosPeriodos = gerarPeriodos();
    const periodosVisiveis = 6; // Número de períodos visíveis por vez
    
    // Calcular índice inicial com base no offset
    let indiceInicial = periodoOffset * periodosVisiveis;
    
    // Garantir que não ultrapasse o limite
    if (indiceInicial < 0) {
      indiceInicial = 0;
      setPeriodoOffset(0);
    } else if (indiceInicial >= todosPeriodos.length) {
      indiceInicial = Math.max(0, todosPeriodos.length - periodosVisiveis);
      setPeriodoOffset(Math.floor(indiceInicial / periodosVisiveis));
    }
    
    // Retornar apenas os períodos visíveis
    return todosPeriodos.slice(indiceInicial, indiceInicial + periodosVisiveis);
  };

  const periodos = getPeriodosComOffset();

  // Verificar se há dependências para uma etapa
  const temDependencias = (etapaId) => {
    return dependencias.some(dep => 
      dep.etapa_dependente_id === etapaId || 
      dep.etapa_requisito_id === etapaId
    );
  };

  // Obter etapas dependentes de uma etapa
  const getEtapasDependentes = (etapaId) => {
    const deps = dependencias.filter(dep => dep.etapa_requisito_id === etapaId);
    return deps.map(dep => {
      const etapa = etapas.find(e => e.id === dep.etapa_dependente_id);
      return etapa;
    }).filter(Boolean);
  };

  // Obter etapas requisito de uma etapa
  const getEtapasRequisito = (etapaId) => {
    const deps = dependencias.filter(dep => dep.etapa_dependente_id === etapaId);
    return deps.map(dep => {
      const etapa = etapas.find(e => e.id === dep.etapa_requisito_id);
      return etapa;
    }).filter(Boolean);
  };

  if (loading) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 text-red-700 p-4 rounded-md">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold flex items-center">
          <FaCalendarAlt className="mr-2" /> Cronograma da Obra
        </h2>
        
        <div className="flex space-x-2">
          <div className="flex items-center mr-4">
            <label className="mr-2 text-sm">Escala:</label>
            <select
              value={escala}
              onChange={(e) => setEscala(e.target.value)}
              className="border rounded px-2 py-1 text-sm"
            >
              <option value="mensal">Mensal</option>
              <option value="semanal">Semanal</option>
            </select>
          </div>
          
          <button
            onClick={() => setShowDependencias(!showDependencias)}
            className={`p-2 rounded ${showDependencias ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}
            title="Mostrar dependências"
          >
            <FaLink />
          </button>
          
          <button
            onClick={diminuirZoom}
            className="p-2 rounded bg-gray-100 text-gray-700"
            title="Diminuir zoom"
          >
            <FaSearchMinus />
          </button>
          
          <button
            onClick={resetarZoom}
            className="p-2 rounded bg-gray-100 text-gray-700"
            title="Resetar zoom"
          >
            <FaSearch />
          </button>
          
          <button
            onClick={aumentarZoom}
            className="p-2 rounded bg-gray-100 text-gray-700"
            title="Aumentar zoom"
          >
            <FaSearchPlus />
          </button>
          
          <button
            onClick={exportarCronograma}
            className="p-2 rounded bg-blue-600 text-white"
            title="Exportar cronograma"
          >
            <FaFileExport />
          </button>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={navegarAnterior}
          className="p-2 rounded bg-gray-100 text-gray-700"
          title="Períodos anteriores"
        >
          <FaChevronLeft />
        </button>
        
        <div className="text-sm text-gray-500">
          {periodos.length > 0 && (
            <>
              {periodos[0].label} - {periodos[periodos.length - 1].label}
            </>
          )}
        </div>
        
        <button
          onClick={navegarProximo}
          className="p-2 rounded bg-gray-100 text-gray-700"
          title="Próximos períodos"
        >
          <FaChevronRight />
        </button>
      </div>

      <div className="overflow-x-auto">
        <div 
          ref={cronogramaRef}
          className="min-w-full"
          style={{ 
            minWidth: periodos.length * 100 * zoomLevel,
            paddingBottom: '20px'
          }}
        >
          {/* Cabeçalho com períodos */}
          <div className="flex border-b border-gray-200">
            <div className="w-48 shrink-0 p-2 font-medium text-gray-700 border-r border-gray-200">
              Etapa
            </div>
              {periodos.map((periodo, index) => (
              <div 
                key={index}
                className="text-center p-2 font-medium text-gray-700 border-r border-gray-200"
                style={{ width: `${100 * zoomLevel}px` }}
              >
                  {periodo.label}
                </div>
              ))}
          </div>

          {/* Linhas de etapas */}
            {etapas.map((etapa) => {
            const barraStyle = calcularBarraEtapa(etapa, periodos);
              const corBarra = getCorBarra(etapa);
            const statusInfo = getStatusLabel(etapa.status);
            const etapaAtrasada = isEtapaAtrasada(etapa);
              
              return (
              <div key={etapa.id} className="relative">
                {/* Informações da etapa */}
                <div className="flex border-b border-gray-200">
                  <div className="w-48 shrink-0 p-2 text-sm border-r border-gray-200">
                    <div className="flex justify-between items-start">
                      <div>
                    <div className="font-medium">{etapa.nome}</div>
                        <div className="flex items-center mt-1">
                          <span className={`px-2 py-0.5 rounded-full text-xs ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                          {etapaAtrasada && (
                            <span className="ml-1 text-red-500" title="Etapa atrasada">
                              <FaExclamationTriangle />
                            </span>
                          )}
                        </div>
                    </div>
                      <button
                        onClick={() => mostrarInfoEtapa(etapa)}
                        className="text-gray-500 hover:text-gray-700"
                        title="Ver detalhes"
                      >
                        <FaInfoCircle />
                      </button>
                    </div>
                  </div>
                  
                  {/* Área do cronograma para esta etapa */}
                  <div 
                    className="relative h-16 border-r border-gray-200"
                    style={{ width: `${periodos.length * 100 * zoomLevel}px` }}
                  >
                    {/* Barra da etapa */}
                    <div
                      className={`absolute top-4 h-8 rounded ${corBarra} flex items-center justify-center text-white text-xs font-medium`}
                      style={{
                        left: `${barraStyle.left}px`,
                        width: `${barraStyle.width}px`,
                        transition: 'left 0.3s, width 0.3s'
                      }}
                      onClick={() => mostrarInfoEtapa(etapa)}
                    >
                      {etapa.progresso}%
                      {temDependencias(etapa.id) && showDependencias && (
                        <span className="ml-1">
                          <FaLink size={10} />
                        </span>
                      )}
                    </div>
                    
                    {/* Linhas de dependência */}
                    {showDependencias && (
                      <>
                        {dependencias
                          .filter(dep => dep.etapa_dependente_id === etapa.id)
                          .map(dep => {
                            const etapaRequisito = etapas.find(e => e.id === dep.etapa_requisito_id);
                            if (!etapaRequisito) return null;
                            
                            const barraRequisito = calcularBarraEtapa(etapaRequisito, periodos);
                            const barraAtual = barraStyle;
                            
                            // Desenhar linha de dependência apenas se as barras forem visíveis
                            if (barraRequisito.width === 0 || barraAtual.width === 0) return null;
                            
                            // Calcular pontos de início e fim da linha
                            const inicioX = barraRequisito.left + barraRequisito.width;
                            const fimX = barraAtual.left;
                            
                            // Não desenhar se a linha não for visível
                            if (inicioX > fimX) return null;
                            
                            return (
                              <svg
                                key={`dep-${dep.id}`}
                                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                                style={{ zIndex: 1 }}
                              >
                                <path
                                  d={`M ${inicioX} 8 L ${inicioX + 10} 8 L ${fimX - 10} 8 L ${fimX} 8`}
                                  stroke="#9CA3AF"
                                  strokeWidth="1"
                                  strokeDasharray="4"
                                  fill="none"
                                />
                                <circle cx={fimX} cy={8} r="3" fill="#9CA3AF" />
                              </svg>
                            );
                          })}
                      </>
                    )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      </div>

      {/* Modal de informações da etapa */}
      {etapaInfo && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-lg font-semibold">{etapaInfo.nome}</h3>
              <button
                onClick={fecharInfoEtapa}
                className="text-gray-500 hover:text-gray-700"
              >
                &times;
              </button>
            </div>
            
            <div className="space-y-3">
              <div>
                <span className={`px-2 py-1 rounded-full text-xs ${getStatusLabel(etapaInfo.status).color}`}>
                  {getStatusLabel(etapaInfo.status).label}
                </span>
                {isEtapaAtrasada(etapaInfo) && (
                  <span className="ml-2 text-red-500">
                    <FaExclamationTriangle /> Atrasada
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Data de Início:</p>
                  <p>{formatDate(etapaInfo.data_inicio)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Data de Término:</p>
                  <p>{formatDate(etapaInfo.data_fim)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Progresso:</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full"
                      style={{ width: `${etapaInfo.progresso || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-right text-xs mt-1">{etapaInfo.progresso || 0}%</p>
                </div>
                <div>
                  <p className="text-gray-500">Estimativa de Horas:</p>
                  <p>{etapaInfo.estimativa_horas || 'Não definida'}</p>
        </div>
      </div>

              {etapaInfo.descricao && (
                <div>
                  <p className="text-gray-500">Descrição:</p>
                  <p className="text-sm">{etapaInfo.descricao}</p>
                </div>
              )}
              
              {showDependencias && (
                <>
                  <div>
                    <p className="text-gray-500 mb-1">Etapas Requisito:</p>
                    <div className="text-sm">
                      {getEtapasRequisito(etapaInfo.id).length > 0 ? (
                        <ul className="list-disc pl-5">
                          {getEtapasRequisito(etapaInfo.id).map(etapa => (
                            <li key={`req-${etapa.id}`}>{etapa.nome}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 italic">Nenhuma etapa requisito</p>
                      )}
        </div>
      </div>

                  <div>
                    <p className="text-gray-500 mb-1">Etapas Dependentes:</p>
                    <div className="text-sm">
                      {getEtapasDependentes(etapaInfo.id).length > 0 ? (
                        <ul className="list-disc pl-5">
                          {getEtapasDependentes(etapaInfo.id).map(etapa => (
                            <li key={`dep-${etapa.id}`}>{etapa.nome}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-gray-400 italic">Nenhuma etapa dependente</p>
                      )}
                    </div>
                  </div>
                </>
              )}
        </div>
            
            <div className="mt-6 flex justify-end">
              <button
                onClick={fecharInfoEtapa}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Fechar
              </button>
        </div>
        </div>
      </div>
      )}
    </div>
  );
};

export default CronogramaObra; 