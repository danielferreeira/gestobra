import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient';

const LoginSimples = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Limpar qualquer cache existente
  const limparCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      
      // Limpar cookies relacionados à autenticação
      document.cookie.split(';').forEach(cookie => {
        const [name] = cookie.trim().split('=');
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
      });
      
      console.log('Cache limpo com sucesso');
    } catch (err) {
      console.error('Erro ao limpar cache:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('Por favor, preencha email e senha');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      // Limpar cache antes de tentar login
      limparCache();
      
      console.log('Tentando login com:', email);
      
      // Usar diretamente o cliente Supabase para login
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (loginError) {
        throw new Error(loginError.message || 'Falha na autenticação');
      }
      
      if (!data || !data.user) {
        throw new Error('Dados de usuário não encontrados');
      }
      
      console.log('Login bem-sucedido:', data.user.email);
      
      // Armazenar token de sessão manualmente
      localStorage.setItem('sb-user', JSON.stringify(data.user));
      
      // Redirecionar para o dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Erro no login:', err);
      setError(err.message || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">GestObra</h2>
        <h3 className="text-xl font-semibold text-center text-gray-700 mb-6">Login Simplificado</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <form onSubmit={handleLogin}>
          <div className="mb-4">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="seu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Senha
            </label>
            <input
              id="password"
              type="password"
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          
          <div className="flex items-center justify-between mb-6">
            <button
              type="submit"
              className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            Acesso restrito. Contate o administrador para obter uma conta.
          </p>
          <button 
            onClick={limparCache}
            className="mt-4 text-xs text-blue-500 hover:text-blue-700"
          >
            Limpar dados de autenticação
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginSimples; 