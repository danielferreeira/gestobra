import { createContext, useContext, useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Criando o cliente do Supabase diretamente
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Criar o contexto de autenticação
const AuthContextSimples = createContext();

// Hook personalizado para usar o contexto de autenticação
export const useAuthSimples = () => {
  return useContext(AuthContextSimples);
};

// Provedor do contexto de autenticação
export const AuthProviderSimples = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Verificar se há um usuário autenticado ao carregar a página
  useEffect(() => {
    const checkUser = async () => {
      try {
        setLoading(true);
        
        // Verificar se há um usuário no localStorage
        const storedUser = localStorage.getItem('sb-user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          setUser(parsedUser);
          setLoading(false);
          return;
        }
        
        // Se não houver no localStorage, verificar a sessão atual
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          throw error;
        }
        
        if (data && data.session) {
          const { data: userData } = await supabase.auth.getUser();
          if (userData && userData.user) {
            setUser(userData.user);
            // Armazenar no localStorage para acesso mais rápido
            localStorage.setItem('sb-user', JSON.stringify(userData.user));
          } else {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      } catch (error) {
        console.error('Erro ao verificar autenticação:', error);
        setError(error.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    checkUser();
    
    // Configurar listener para mudanças na autenticação
    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Evento de autenticação:', event);
      
      if (event === 'SIGNED_IN' && session) {
        // Atualizar o usuário quando fizer login
        supabase.auth.getUser().then(({ data }) => {
          if (data && data.user) {
            setUser(data.user);
            localStorage.setItem('sb-user', JSON.stringify(data.user));
          }
        });
      } else if (event === 'SIGNED_OUT') {
        // Limpar o usuário quando fizer logout
        setUser(null);
        localStorage.removeItem('sb-user');
      }
    });
    
    // Limpar listener ao desmontar o componente
    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Função para login
  const login = async (email, password) => {
    try {
      setLoading(true);
      setError(null);
      
      // Limpar qualquer sessão anterior
      localStorage.removeItem('sb-user');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        throw error;
      }
      
      if (data && data.user) {
        setUser(data.user);
        localStorage.setItem('sb-user', JSON.stringify(data.user));
      }
      
      return { data, error: null };
    } catch (error) {
      console.error('Erro ao fazer login:', error);
      setError(error.message);
      return { data: null, error };
    } finally {
      setLoading(false);
    }
  };

  // Função para logout
  const logout = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { error } = await supabase.auth.signOut();
      
      if (error) {
        throw error;
      }
      
      setUser(null);
      localStorage.removeItem('sb-user');
      
      return { error: null };
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      setError(error.message);
      return { error };
    } finally {
      setLoading(false);
    }
  };

  // Valores e funções disponíveis no contexto
  const value = {
    user,
    loading,
    error,
    login,
    logout
  };

  return (
    <AuthContextSimples.Provider value={value}>
      {children}
    </AuthContextSimples.Provider>
  );
};

export default AuthContextSimples; 