import { useState, useEffect } from 'react';
import { FaSave, FaUserCog, FaBell, FaLock, FaPalette, FaDatabase } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

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

  // Carregar dados do usuário
  useEffect(() => {
    if (user) {
      // Em uma implementação real, buscaríamos mais dados do usuário do backend
      setPerfilForm(prev => ({
        ...prev,
        email: user.email || '',
        nome: user.user_metadata?.nome || ''
      }));
    }
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

  // Salvar configurações
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);
      
      // Aqui seria implementada a lógica para salvar as configurações
      // Por enquanto, apenas simulamos um atraso
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccess(true);
      setLoading(false);
      
      // Limpar mensagem de sucesso após 3 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      setError(error.message || 'Erro ao salvar configurações');
      setLoading(false);
    }
  };

  // Verificar se as senhas coincidem
  const senhasNaoCoincidem = senhaForm.novaSenha !== senhaForm.confirmarSenha;

  return (
    <div className="space-y-6">
      {/* Mensagem de erro */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <p className="font-bold">Erro</p>
          <p>{error}</p>
        </div>
      )}
      
      {/* Mensagem de sucesso */}
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
          <p className="font-bold">Sucesso</p>
          <p>Configurações salvas com sucesso!</p>
        </div>
      )}
      
      {/* Cabeçalho */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Configurações</h1>
        <p className="mt-2 text-gray-600">Gerencie suas preferências e configurações da conta</p>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden">
        {/* Abas */}
        <div className="flex border-b">
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'perfil'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('perfil')}
          >
            <FaUserCog className="mr-2" /> Perfil
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'senha'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('senha')}
          >
            <FaLock className="mr-2" /> Senha
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'notificacoes'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('notificacoes')}
          >
            <FaBell className="mr-2" /> Notificações
          </button>
          <button
            className={`px-4 py-3 text-sm font-medium flex items-center ${
              activeTab === 'aparencia'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('aparencia')}
          >
            <FaPalette className="mr-2" /> Aparência
          </button>
        </div>

        {/* Conteúdo das abas */}
        <div className="p-6">
          {/* Aba de Perfil */}
          {activeTab === 'perfil' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="flex items-center space-x-4 mb-6">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center text-blue-500 text-2xl font-semibold overflow-hidden">
                  {perfilForm.avatar ? (
                    <img 
                      src={URL.createObjectURL(perfilForm.avatar)} 
                      alt="Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    perfilForm.nome.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase() || 'U'
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Foto de Perfil</label>
                  <input
                    type="file"
                    name="avatar"
                    onChange={handlePerfilChange}
                    className="mt-1 block w-full text-sm text-gray-500
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-md file:border-0
                      file:text-sm file:font-semibold
                      file:bg-blue-50 file:text-blue-700
                      hover:file:bg-blue-100"
                    accept="image/*"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="nome" className="block text-sm font-medium text-gray-700">Nome Completo</label>
                  <input
                    type="text"
                    id="nome"
                    name="nome"
                    value={perfilForm.nome}
                    onChange={handlePerfilChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={perfilForm.email}
                    onChange={handlePerfilChange}
                    disabled
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 bg-gray-50 text-gray-500 sm:text-sm"
                  />
                  <p className="mt-1 text-xs text-gray-500">O email não pode ser alterado</p>
                </div>
                
                <div>
                  <label htmlFor="cargo" className="block text-sm font-medium text-gray-700">Cargo</label>
                  <input
                    type="text"
                    id="cargo"
                    name="cargo"
                    value={perfilForm.cargo}
                    onChange={handlePerfilChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
                
                <div>
                  <label htmlFor="telefone" className="block text-sm font-medium text-gray-700">Telefone</label>
                  <input
                    type="tel"
                    id="telefone"
                    name="telefone"
                    value={perfilForm.telefone}
                    onChange={handlePerfilChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Salvar Alterações
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Aba de Senha */}
          {activeTab === 'senha' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="senhaAtual" className="block text-sm font-medium text-gray-700">Senha Atual</label>
                <input
                  type="password"
                  id="senhaAtual"
                  name="senhaAtual"
                  value={senhaForm.senhaAtual}
                  onChange={handleSenhaChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label htmlFor="novaSenha" className="block text-sm font-medium text-gray-700">Nova Senha</label>
                <input
                  type="password"
                  id="novaSenha"
                  name="novaSenha"
                  value={senhaForm.novaSenha}
                  onChange={handleSenhaChange}
                  required
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                />
                <p className="mt-1 text-xs text-gray-500">A senha deve ter pelo menos 8 caracteres</p>
              </div>
              
              <div>
                <label htmlFor="confirmarSenha" className="block text-sm font-medium text-gray-700">Confirmar Nova Senha</label>
                <input
                  type="password"
                  id="confirmarSenha"
                  name="confirmarSenha"
                  value={senhaForm.confirmarSenha}
                  onChange={handleSenhaChange}
                  required
                  className={`mt-1 block w-full border rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm ${
                    senhasNaoCoincidem && senhaForm.confirmarSenha 
                      ? 'border-red-300' 
                      : 'border-gray-300'
                  }`}
                />
                {senhasNaoCoincidem && senhaForm.confirmarSenha && (
                  <p className="mt-1 text-xs text-red-500">As senhas não coincidem</p>
                )}
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading || senhasNaoCoincidem || !senhaForm.novaSenha}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Alterando...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Alterar Senha
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Aba de Notificações */}
          {activeTab === 'notificacoes' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emailAlertaEstoque"
                      name="emailAlertaEstoque"
                      type="checkbox"
                      checked={notificacoesForm.emailAlertaEstoque}
                      onChange={handleNotificacoesChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emailAlertaEstoque" className="font-medium text-gray-700">Alertas de Estoque Baixo</label>
                    <p className="text-gray-500">Receber notificações quando o estoque de materiais estiver abaixo do mínimo</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emailOrcamentoExcedido"
                      name="emailOrcamentoExcedido"
                      type="checkbox"
                      checked={notificacoesForm.emailOrcamentoExcedido}
                      onChange={handleNotificacoesChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emailOrcamentoExcedido" className="font-medium text-gray-700">Orçamento Excedido</label>
                    <p className="text-gray-500">Receber notificações quando o orçamento de uma obra for excedido</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emailNovaObra"
                      name="emailNovaObra"
                      type="checkbox"
                      checked={notificacoesForm.emailNovaObra}
                      onChange={handleNotificacoesChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emailNovaObra" className="font-medium text-gray-700">Novas Obras</label>
                    <p className="text-gray-500">Receber notificações quando uma nova obra for cadastrada</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="emailRelatorios"
                      name="emailRelatorios"
                      type="checkbox"
                      checked={notificacoesForm.emailRelatorios}
                      onChange={handleNotificacoesChange}
                      className="focus:ring-blue-500 h-4 w-4 text-blue-600 border-gray-300 rounded"
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="emailRelatorios" className="font-medium text-gray-700">Relatórios Semanais</label>
                    <p className="text-gray-500">Receber relatórios semanais por email</p>
                  </div>
                </div>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Salvar Preferências
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Aba de Aparência */}
          {activeTab === 'aparencia' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="tema" className="block text-sm font-medium text-gray-700">Tema</label>
                <select
                  id="tema"
                  name="tema"
                  value={aparenciaForm.tema}
                  onChange={handleAparenciaChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="claro">Claro</option>
                  <option value="escuro">Escuro</option>
                  <option value="sistema">Usar Configuração do Sistema</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="corPrimaria" className="block text-sm font-medium text-gray-700">Cor Primária</label>
                <div className="mt-1 flex items-center">
                  <input
                    type="color"
                    id="corPrimaria"
                    name="corPrimaria"
                    value={aparenciaForm.corPrimaria}
                    onChange={handleAparenciaChange}
                    className="h-8 w-8 border border-gray-300 rounded-md"
                  />
                  <span className="ml-2 text-sm text-gray-500">{aparenciaForm.corPrimaria}</span>
                </div>
              </div>
              
              <div>
                <label htmlFor="tamanhoFonte" className="block text-sm font-medium text-gray-700">Tamanho da Fonte</label>
                <select
                  id="tamanhoFonte"
                  name="tamanhoFonte"
                  value={aparenciaForm.tamanhoFonte}
                  onChange={handleAparenciaChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                >
                  <option value="pequeno">Pequeno</option>
                  <option value="medio">Médio</option>
                  <option value="grande">Grande</option>
                </select>
              </div>
              
              <div className="pt-4">
                <button
                  type="submit"
                  className="inline-flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="animate-spin mr-2 h-4 w-4 border-t-2 border-b-2 border-white rounded-full"></span>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <FaSave className="mr-2" />
                      Salvar Preferências
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Informações do Sistema */}
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
        <div className="flex items-center">
          <FaDatabase className="text-gray-400 mr-2" />
          <h3 className="text-sm font-medium text-gray-700">Informações do Sistema</h3>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-4 text-sm text-gray-500">
          <div>
            <p>Versão: 1.0.0</p>
            <p>Banco de Dados: Supabase</p>
          </div>
          <div>
            <p>Última Atualização: {new Date().toLocaleDateString('pt-BR')}</p>
            <p>Suporte: suporte@gestobra.com</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuracoes; 