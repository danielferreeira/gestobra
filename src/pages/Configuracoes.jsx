import React, { useState, useEffect } from 'react';
import { FaSave, FaUserCog, FaBell, FaLock, FaPalette, FaDatabase } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { 
  atualizarPerfil, 
  atualizarSenha, 
  salvarPreferenciasNotificacoes, 
  salvarPreferenciasAparencia,
  carregarPreferencias
} from '../services/usuarioService';

const Configuracoes = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('perfil');
  
  const [perfilForm, setPerfilForm] = useState({
    nome: '',
    email: '',
    cargo: '',
    telefone: '',
    avatar: null
  });
  
  const [senhaForm, setSenhaForm] = useState({
    senhaAtual: '',
    novaSenha: '',
    confirmarSenha: ''
  });
  
  const [notificacoesForm, setNotificacoesForm] = useState({
    emailAlertaEstoque: true,
    emailOrcamentoExcedido: true,
    emailNovaObra: true,
    emailRelatorios: false
  });
  
  const [aparenciaForm, setAparenciaForm] = useState({
    tema: 'claro',
    corPrimaria: '#3B82F6',
    tamanhoFonte: 'medio'
  });

  const [darkMode, setDarkMode] = useState(false);
  const [corPrimaria, setCorPrimaria] = useState('#3B82F6');
  const [tamanhoFonte, setTamanhoFonte] = useState('medio');

  // Carregar dados do usuário e preferências
  useEffect(() => {
    if (user) {
      // Carregar dados básicos do usuário
      setPerfilForm(prev => ({
        ...prev,
        email: user.email || '',
        nome: user.user_metadata?.nome || '',
        cargo: user.user_metadata?.cargo || '',
        telefone: user.user_metadata?.telefone || '',
      }));
      
      // Carregar preferências do usuário
      const carregarDadosUsuario = async () => {
        try {
          const { data, error } = await carregarPreferencias(user.id);
          
          if (error) throw error;
          
          if (data) {
            // Atualizar formulários com dados do banco
            if (data.notificacoes) {
              setNotificacoesForm(data.notificacoes);
            }
            
            if (data.aparencia) {
              setAparenciaForm(data.aparencia);
            }
          }
        } catch (error) {
          console.error('Erro ao carregar preferências:', error);
          // Não exibimos erro ao usuário pois usaremos valores padrão
        }
      };
      
      carregarDadosUsuario();
    }

    // Carregar configurações
    const savedDarkMode = localStorage.getItem('darkMode') === 'true';
    const savedCorPrimaria = localStorage.getItem('corPrimaria') || '#3B82F6';
    const savedTamanhoFonte = localStorage.getItem('tamanhoFonte') || 'medio';
    
    setDarkMode(savedDarkMode);
    setCorPrimaria(savedCorPrimaria);
    setTamanhoFonte(savedTamanhoFonte);
  }, [user]);

  // Manipular mudanças no formulário de perfil
  const handlePerfilChange = (e) => {
    const { name, value, files } = e.target;
    
    if (name === 'avatar' && files && files[0]) {
      setPerfilForm(prev => ({ ...prev, avatar: files[0] }));
    } else {
      setPerfilForm(prev => ({ ...prev, [name]: value }));
    }
  };

  // Manipular mudanças no formulário de senha
  const handleSenhaChange = (e) => {
    const { name, value } = e.target;
    setSenhaForm(prev => ({ ...prev, [name]: value }));
  };

  // Manipular mudanças no formulário de notificações
  const handleNotificacoesChange = (e) => {
    const { name, checked } = e.target;
    setNotificacoesForm(prev => ({ ...prev, [name]: checked }));
  };

  // Manipular mudanças no formulário de aparência
  const handleAparenciaChange = (e) => {
    const { name, value } = e.target;
    setAparenciaForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDarkModeToggle = () => {
    const newValue = !darkMode;
    setDarkMode(newValue);
    localStorage.setItem('darkMode', newValue);
    
    if (newValue) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleCorPrimariaChange = (e) => {
    const newValue = e.target.value;
    setCorPrimaria(newValue);
    localStorage.setItem('corPrimaria', newValue);
    document.documentElement.style.setProperty('--color-primary', newValue);
  };

  const handleTamanhoFonteChange = (e) => {
    const newValue = e.target.value;
    setTamanhoFonte(newValue);
    localStorage.setItem('tamanhoFonte', newValue);
    
    const fontSizeMap = {
      pequeno: '0.875rem',
      medio: '1rem',
      grande: '1.125rem',
      extraGrande: '1.25rem'
    };
    
    document.documentElement.style.fontSize = fontSizeMap[newValue] || '1rem';
  };

  // Salvar configurações
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user) {
      setError('Usuário não autenticado. Faça login novamente.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Determinar qual formulário está sendo enviado com base na aba ativa
      switch (activeTab) {
        case 'perfil':
          const { error: perfilError } = await atualizarPerfil(user.id, perfilForm);
          if (perfilError) throw perfilError;
          break;
          
        case 'senha':
          if (senhaForm.novaSenha !== senhaForm.confirmarSenha) {
            throw new Error('As senhas não coincidem');
          }
          
          if (senhaForm.novaSenha.length < 8) {
            throw new Error('A nova senha deve ter pelo menos 8 caracteres');
          }
          
          const { error: senhaError } = await atualizarSenha(senhaForm.senhaAtual, senhaForm.novaSenha);
          if (senhaError) throw senhaError;
          
          // Limpar formulário após alteração bem-sucedida
          setSenhaForm({
            senhaAtual: '',
            novaSenha: '',
            confirmarSenha: ''
          });
          break;
          
        case 'notificacoes':
          const { error: notificacoesError } = await salvarPreferenciasNotificacoes(user.id, notificacoesForm);
          if (notificacoesError) throw notificacoesError;
          break;
          
        case 'aparencia':
          const { error: aparenciaError } = await salvarPreferenciasAparencia(user.id, aparenciaForm);
          if (aparenciaError) throw aparenciaError;
          break;
          
        default:
          throw new Error('Aba desconhecida');
      }
      
      setSuccess(true);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error(`Erro ao salvar ${activeTab}:`, error);
      setError(error.message || `Erro ao salvar configurações de ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se as senhas coincidem
  const senhasNaoCoincidem = senhaForm.novaSenha !== senhaForm.confirmarSenha;

  // Renderizar abas de configuração
  const renderTabContent = () => {
    switch (activeTab) {
      case 'perfil':
        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Perfil do Usuário</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Nome</label>
                <input
                  type="text"
                  name="nome"
                  value={perfilForm.nome}
                  onChange={handlePerfilChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu nome completo"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Email</label>
                <input
                  type="email"
                  name="email"
                  value={perfilForm.email}
                  disabled
                  className="w-full p-3 border rounded-md bg-gray-100 text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-500 mt-1">O email não pode ser alterado.</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Cargo</label>
                <input
                  type="text"
                  name="cargo"
                  value={perfilForm.cargo}
                  onChange={handlePerfilChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="Seu cargo na empresa"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2 text-gray-700">Telefone</label>
                <input
                  type="text"
                  name="telefone"
                  value={perfilForm.telefone}
                  onChange={handlePerfilChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  placeholder="(00) 00000-0000"
                />
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-blue-500 hover:bg-blue-600 text-white font-medium py-3 px-4 rounded-md flex items-center transition-colors duration-200"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" /> Salvar Perfil
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        );
        
      case 'senha':
        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Alterar Senha</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Senha Atual</label>
                <input
                  type="password"
                  name="senhaAtual"
                  value={senhaForm.senhaAtual}
                  onChange={handleSenhaChange}
                  className="w-full p-2 border rounded-md"
                />
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Nova Senha</label>
                <input
                  type="password"
                  name="novaSenha"
                  value={senhaForm.novaSenha}
                  onChange={handleSenhaChange}
                  className="w-full p-2 border rounded-md"
                />
                <p className="text-xs text-gray-500 mt-1">Mínimo de 8 caracteres.</p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Confirmar Nova Senha</label>
                <input
                  type="password"
                  name="confirmarSenha"
                  value={senhaForm.confirmarSenha}
                  onChange={handleSenhaChange}
                  className={`w-full p-2 border rounded-md ${senhasNaoCoincidem && senhaForm.confirmarSenha ? 'border-red-500' : ''}`}
                />
                {senhasNaoCoincidem && senhaForm.confirmarSenha && (
                  <p className="text-xs text-red-500 mt-1">As senhas não coincidem.</p>
                )}
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
                  disabled={loading || senhasNaoCoincidem}
                >
                  {loading ? 'Salvando...' : <><FaSave className="mr-2" /> Alterar Senha</>}
                </button>
              </div>
            </form>
          </div>
        );
        
      case 'notificacoes':
        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Preferências de Notificações</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="emailAlertaEstoque"
                    checked={notificacoesForm.emailAlertaEstoque}
                    onChange={handleNotificacoesChange}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span>Receber alertas de estoque baixo por email</span>
                </label>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="emailOrcamentoExcedido"
                    checked={notificacoesForm.emailOrcamentoExcedido}
                    onChange={handleNotificacoesChange}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span>Receber alertas de orçamento excedido por email</span>
                </label>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="emailNovaObra"
                    checked={notificacoesForm.emailNovaObra}
                    onChange={handleNotificacoesChange}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span>Receber notificações sobre novas obras por email</span>
                </label>
              </div>
              
              <div className="mb-4">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    name="emailRelatorios"
                    checked={notificacoesForm.emailRelatorios}
                    onChange={handleNotificacoesChange}
                    className="h-4 w-4 text-blue-600 mr-2"
                  />
                  <span>Receber relatórios semanais por email</span>
                </label>
              </div>
              
              <div className="mt-6">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : <><FaSave className="mr-2" /> Salvar Preferências</>}
                </button>
              </div>
            </form>
          </div>
        );
        
      case 'aparencia':
        return (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Aparência</h2>
            <form onSubmit={handleSubmit}>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tema</label>
                <div className="flex space-x-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="tema"
                      value="claro"
                      checked={aparenciaForm.tema === 'claro'}
                      onChange={handleAparenciaChange}
                      className="h-4 w-4 text-blue-600 mr-2"
                    />
                    <span>Claro</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="tema"
                      value="escuro"
                      checked={aparenciaForm.tema === 'escuro'}
                      onChange={handleAparenciaChange}
                      className="h-4 w-4 text-blue-600 mr-2"
                    />
                    <span>Escuro</span>
                  </label>
                  
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="tema"
                      value="sistema"
                      checked={aparenciaForm.tema === 'sistema'}
                      onChange={handleAparenciaChange}
                      className="h-4 w-4 text-blue-600 mr-2"
                    />
                    <span>Sistema</span>
                  </label>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Cor Primária</label>
                <div className="flex items-center">
                  <input
                    type="color"
                    name="corPrimaria"
                    value={aparenciaForm.corPrimaria}
                    onChange={handleAparenciaChange}
                    className="h-10 w-20 rounded cursor-pointer"
                  />
                  <span className="ml-3 text-sm">{aparenciaForm.corPrimaria}</span>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Tamanho da Fonte</label>
                <select
                  name="tamanhoFonte"
                  value={aparenciaForm.tamanhoFonte}
                  onChange={handleAparenciaChange}
                  className="block w-full max-w-xs rounded-md border-gray-300 shadow-sm"
                >
                  <option value="pequeno">Pequeno</option>
                  <option value="medio">Médio</option>
                  <option value="grande">Grande</option>
                  <option value="extraGrande">Extra Grande</option>
                </select>
              </div>
              
              <div className="mt-6 mb-4">
                <button
                  type="submit"
                  className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center"
                  disabled={loading}
                >
                  {loading ? 'Salvando...' : <><FaSave className="mr-2" /> Salvar Preferências</>}
                </button>
              </div>
            </form>
          
            <div className="mt-6 border-t pt-6">
              <h3 className="font-semibold mb-4">Visualização:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="font-semibold mb-2">Componentes com cor primária:</div>
                  <button className="bg-blue-500 text-white px-4 py-2 rounded-md mr-2">Botão</button>
                  <span className="text-blue-500">Texto</span>
                  <div className="border border-blue-500 p-2 mt-2 inline-block">Borda</div>
                </div>
                
                <div className="bg-white p-4 rounded-lg shadow">
                  <div className="font-semibold mb-2">Texto:</div>
                  <p>Este é um exemplo de texto com o tamanho atual.</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return (
    <div className="p-6 bg-gray-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Configurações</h1>
      
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4 mb-6">
          <p>Configurações salvas com sucesso!</p>
        </div>
      )}
      
      <div className="flex flex-col md:flex-row gap-6">
        <div className="md:w-1/4">
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <button
              onClick={() => setActiveTab('perfil')}
              className={`w-full flex items-center p-4 text-left border-l-4 ${
                activeTab === 'perfil' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <FaUserCog className={`mr-3 ${activeTab === 'perfil' ? 'text-blue-500' : 'text-gray-500'}`} /> 
              <span className="font-medium">Perfil</span>
            </button>
            
            <button
              onClick={() => setActiveTab('senha')}
              className={`w-full flex items-center p-4 text-left border-l-4 ${
                activeTab === 'senha' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <FaLock className={`mr-3 ${activeTab === 'senha' ? 'text-blue-500' : 'text-gray-500'}`} /> 
              <span className="font-medium">Senha</span>
            </button>
            
            <button
              onClick={() => setActiveTab('notificacoes')}
              className={`w-full flex items-center p-4 text-left border-l-4 ${
                activeTab === 'notificacoes' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <FaBell className={`mr-3 ${activeTab === 'notificacoes' ? 'text-blue-500' : 'text-gray-500'}`} /> 
              <span className="font-medium">Notificações</span>
            </button>
            
            <button
              onClick={() => setActiveTab('aparencia')}
              className={`w-full flex items-center p-4 text-left border-l-4 ${
                activeTab === 'aparencia' 
                  ? 'bg-blue-50 border-blue-500 text-blue-700' 
                  : 'border-transparent hover:bg-gray-50'
              }`}
            >
              <FaPalette className={`mr-3 ${activeTab === 'aparencia' ? 'text-blue-500' : 'text-gray-500'}`} /> 
              <span className="font-medium">Aparência</span>
            </button>
          </div>
        </div>
        
        <div className="md:w-3/4">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
};

export default Configuracoes; 