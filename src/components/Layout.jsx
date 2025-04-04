import React, { useState } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { FaHome, FaBuilding, FaMoneyBillWave, FaBoxes, FaFileInvoice, FaChartBar, FaUserCog, FaBars, FaSignOutAlt } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../services/supabaseClient';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
      alert('Erro ao fazer logout. Tente novamente.');
    }
  };

  // Função para navegar quando um item do menu é clicado
  const handleMenuItemClick = (path) => {
    console.log('Navegando para:', path);
    navigate(path);
  };

  const menuItems = [
    { path: '/dashboard', icon: <FaHome />, label: 'Dashboard' },
    { path: '/obras', icon: <FaBuilding />, label: 'Obras' },
    { path: '/financeiro', icon: <FaMoneyBillWave />, label: 'Financeiro' },
    { path: '/fornecedores', icon: <FaBoxes />, label: 'Fornecedores' },
    { path: '/relatorios', icon: <FaChartBar />, label: 'Relatórios' },
    { path: '/configuracoes', icon: <FaUserCog />, label: 'Configurações' },
  ];

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
      <div 
        className={`bg-blue-800 text-white ${sidebarOpen ? 'w-64' : 'w-20'} transition-all duration-300 ease-in-out flex flex-col`}
      >
        {/* Logo */}
        <div className="p-4 flex items-center justify-between">
          {sidebarOpen && <h1 className="text-xl font-bold">GestObra</h1>}
          <button 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 rounded-md hover:bg-blue-700"
          >
            <FaBars />
          </button>
        </div>

        {/* Menu Items */}
        <nav className="flex-1 overflow-y-auto">
          <ul className="py-4">
            {menuItems.map((item) => (
              <li key={item.path}>
                <button
                  onClick={() => handleMenuItemClick(item.path)}
                  className={`w-full flex items-center py-3 px-4 text-left ${
                    location.pathname === item.path ? 'bg-blue-700' : 'hover:bg-blue-700'
                  } transition-colors duration-200`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {sidebarOpen && <span className="ml-3">{item.label}</span>}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* User Profile & Logout */}
        <div className="p-4 border-t border-blue-700">
          <div className="flex items-center mb-4">
            <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-lg font-semibold">
              {user?.email?.charAt(0).toUpperCase() || 'U'}
            </div>
            {sidebarOpen && (
              <div className="ml-3 overflow-hidden">
                <p className="text-sm font-medium truncate">{user?.email || 'Usuário'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center w-full py-2 px-4 rounded-md hover:bg-blue-700 transition-colors duration-200"
          >
            <FaSignOutAlt />
            {sidebarOpen && <span className="ml-3">Sair</span>}
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm z-10">
          <div className="px-4 py-3 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">
              {menuItems.find(item => item.path === location.pathname)?.label || 'Dashboard'}
            </h2>
            <div className="flex items-center space-x-4">
              {/* Notificações, perfil, etc. podem ser adicionados aqui */}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 bg-gray-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default Layout; 