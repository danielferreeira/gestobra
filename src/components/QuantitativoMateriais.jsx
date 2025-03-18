import React, { useState, useEffect } from 'react';
import { FaBoxes, FaSearch, FaFileExport, FaExclamationTriangle, FaSync, FaInfoCircle } from 'react-icons/fa';
import { getQuantitativoMaterialsByObraId } from '../services/materiaisService';
import { supabase } from '../services/supabaseClient';

const QuantitativoMateriais = ({ obraId }) => {
  const [materiais, setMateriais] = useState([]);
  const [filteredMateriais, setFilteredMateriais] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTable, setShowTable] = useState(false);
  const [filtro, setFiltro] = useState({ termo: '', categoria: '', valorMin: '', valorMax: '' });
  const [ordenacao, setOrdenacao] = useState({ campo: 'nome', crescente: true });
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState('asc');

  // Carregar quantitativo de materiais
  const fetchMateriais = async () => {
    if (!obraId) return;
    
    try {
      setLoading(true);
      setError(null);
      const { data, error } = await getQuantitativoMaterialsByObraId(obraId);
      
      if (error) {
        throw error;
      }
      
      setMateriais(data || []);
      setFilteredMateriais(data || []);
      setLoading(false);
    } catch (error) {
      console.error('Erro ao carregar quantitativo de materiais:', error);
      setError(error.message || 'Erro ao carregar quantitativo de materiais');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (obraId) {
      fetchMateriais();
    }
  }, [obraId]);

  // Formatar valores monetários
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  // Obter categorias únicas para o filtro
  const categorias = [...new Set(materiais.map(material => material.categoria))];

  // Filtrar materiais
  const materiaisFiltrados = materiais.filter(material => {
    const matchesSearch = 
      material.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      material.categoria.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategoria = filtroCategoria ? material.categoria === filtroCategoria : true;
    
    return matchesSearch && matchesCategoria;
  });

  // Ordenar materiais
  const materiaisOrdenados = [...materiaisFiltrados].sort((a, b) => {
    let valorA, valorB;
    
    switch (ordenacao.campo) {
      case 'nome':
        valorA = a.nome.toLowerCase();
        valorB = b.nome.toLowerCase();
        break;
      case 'categoria':
        valorA = a.categoria.toLowerCase();
        valorB = b.categoria.toLowerCase();
        break;
      case 'quantidade':
        valorA = a.quantidade_total;
        valorB = b.quantidade_total;
        break;
      case 'valor':
        valorA = a.valor_total;
        valorB = b.valor_total;
        break;
      default:
        valorA = a.nome.toLowerCase();
        valorB = b.nome.toLowerCase();
    }
    
    if (direcaoOrdenacao === 'asc') {
      return valorA > valorB ? 1 : -1;
    } else {
      return valorA < valorB ? 1 : -1;
    }
  });

  // Calcular totais
  const valorTotal = materiais.reduce((total, material) => total + (material.valor_total || 0), 0);

  // Exportar para CSV
  const exportarCSV = () => {
    // Cabeçalho do CSV
    let csv = 'Nome,Categoria,Unidade,Quantidade,Preço Unitário,Valor Total,Etapas\n';
    
    // Adicionar linhas
    materiaisOrdenados.forEach(material => {
      const etapas = material.etapas && material.etapas.length > 0 
        ? material.etapas.map(etapa => etapa.nome).join(' | ')
        : '';
      csv += `"${material.nome}","${material.categoria}","${material.unidade}",${material.quantidade_total},${material.preco_unitario},${material.valor_total},"${etapas}"\n`;
    });
    
    // Criar blob e link para download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `quantitativo_materiais_obra_${obraId}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Alternar direção de ordenação
  const toggleOrdenacao = (campo) => {
    if (ordenacao.campo === campo) {
      setDirecaoOrdenacao(direcaoOrdenacao === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenacao({ campo, crescente: true });
      setDirecaoOrdenacao('asc');
    }
  };

  if (loading && materiais.length === 0) {
    return (
      <div className="flex justify-center p-4">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Renderizar mensagem de erro com opção de criar tabela
  if (error) {
    return (
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold flex items-center">
            <FaBoxes className="mr-2" /> Quantitativo de Materiais
          </h2>
        </div>
        
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <FaInfoCircle className="h-5 w-5 text-yellow-400" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                Para usar o quantitativo de materiais, você precisa cadastrar materiais nas etapas da obra.
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-red-100 text-red-700 p-4 rounded-md mb-4">
          <h3 className="font-bold flex items-center">
            <FaExclamationTriangle className="mr-2" /> Erro ao carregar materiais
          </h3>
          <p className="mt-2">{error}</p>
          <div className="mt-4">
            <button
              onClick={fetchMateriais}
              className="bg-blue-600 text-white px-4 py-2 rounded-md flex items-center mr-2 inline-flex"
              disabled={loading}
            >
              <FaSync className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Tentar novamente
            </button>
          </div>
        </div>
        
        <div className="text-center py-8 text-gray-500">
          <p className="text-lg">Nenhum material encontrado para esta obra.</p>
          <p className="text-sm mt-2">Adicione materiais nas etapas da obra para visualizá-los aqui.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-4 mb-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold flex items-center">
          <FaBoxes className="mr-2" /> Quantitativo de Materiais
        </h2>
        <button
          onClick={exportarCSV}
          className="bg-green-600 text-white px-4 py-2 rounded-md flex items-center"
          disabled={materiais.length === 0}
        >
          <FaFileExport className="mr-2" /> Exportar CSV
        </button>
      </div>

      {/* Mensagem informativa */}
      <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <FaInfoCircle className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              Este relatório mostra o quantitativo total de materiais cadastrados nas etapas da obra.
              Para adicionar materiais, vá até a aba "Etapas" e adicione materiais em cada etapa.
            </p>
          </div>
        </div>
      </div>

      {/* Filtros e Pesquisa */}
      <div className="flex flex-col md:flex-row gap-4 mb-4">
        <div className="relative flex-grow">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <FaSearch className="text-gray-400" />
          </div>
          <input
            type="text"
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Buscar materiais..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64">
          <select
            className="block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
          >
            <option value="">Todas as categorias</option>
            {categorias.map(categoria => (
              <option key={categoria} value={categoria}>{categoria}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Resumo */}
      <div className="bg-blue-50 p-4 rounded-md mb-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <div className="text-sm text-blue-800 font-medium">Total de Itens</div>
            <div className="text-2xl font-bold">{materiais.length}</div>
          </div>
          <div>
            <div className="text-sm text-blue-800 font-medium">Valor Total</div>
            <div className="text-2xl font-bold">{formatCurrency(valorTotal)}</div>
          </div>
          <div>
            <div className="text-sm text-blue-800 font-medium">Categorias</div>
            <div className="text-2xl font-bold">{categorias.length}</div>
          </div>
        </div>
      </div>

      {/* Tabela de Materiais */}
      {materiaisOrdenados.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <FaExclamationTriangle className="mx-auto text-4xl mb-2 text-yellow-500" />
          <p className="text-lg">Nenhum material encontrado para esta obra.</p>
          <p className="text-sm mt-2">Adicione materiais nas etapas da obra para visualizá-los aqui.</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleOrdenacao('nome')}
                >
                  <div className="flex items-center">
                    Nome
                    {ordenacao.campo === 'nome' && (
                      <span className="ml-1">{direcaoOrdenacao === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleOrdenacao('categoria')}
                >
                  <div className="flex items-center">
                    Categoria
                    {ordenacao.campo === 'categoria' && (
                      <span className="ml-1">{direcaoOrdenacao === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Unidade
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleOrdenacao('quantidade')}
                >
                  <div className="flex items-center">
                    Quantidade
                    {ordenacao.campo === 'quantidade' && (
                      <span className="ml-1">{direcaoOrdenacao === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Preço Unitário
                </th>
                <th 
                  className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer"
                  onClick={() => toggleOrdenacao('valor')}
                >
                  <div className="flex items-center">
                    Valor Total
                    {ordenacao.campo === 'valor' && (
                      <span className="ml-1">{direcaoOrdenacao === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Etapas
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {materiaisOrdenados.map((material) => (
                <tr key={material.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{material.nome}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{material.categoria}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{material.unidade}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{material.quantidade_total}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatCurrency(material.preco_unitario)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatCurrency(material.valor_total)}</div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">
                      {material.etapas && material.etapas.map((etapa, index) => (
                        <span key={etapa.id} className="inline-block bg-gray-100 rounded-full px-2 py-1 text-xs font-semibold text-gray-700 mr-1 mb-1">
                          {etapa.nome}
                        </span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default QuantitativoMateriais; 