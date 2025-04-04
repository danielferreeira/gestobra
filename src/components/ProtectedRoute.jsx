import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  useEffect(() => {
    // Log para depuração do redirecionamento
    console.log('ProtectedRoute - pathname:', location.pathname);
    console.log('ProtectedRoute - user:', user ? 'autenticado' : 'não autenticado');
  }, [location.pathname, user]);

  // Aguardar a verificação de autenticação
  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Redirecionar para login se não estiver autenticado
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // Renderizar as rotas protegidas
  return children;
};

export default ProtectedRoute; 