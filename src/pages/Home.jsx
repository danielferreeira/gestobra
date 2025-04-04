import React from 'react';
import { Link } from 'react-router-dom';
import { FaBuilding, FaChartLine, FaFileAlt, FaTools, FaUsers, FaMoneyBillWave, FaArrowRight } from 'react-icons/fa';

const Home = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <FaBuilding className="h-8 w-8 text-blue-600" />
              <h1 className="ml-2 text-2xl font-bold text-gray-900">GestObra</h1>
            </div>
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
              >
                Login
              </Link>
              <Link
                to="#solicitar-acesso"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
              >
                Solicitar Acesso
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-12 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div className="lg:w-1/2">
              <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
                Gerencie suas obras com eficiência e controle
              </h2>
              <p className="mt-3 max-w-md text-lg text-blue-200">
                Um sistema completo para construtoras e profissionais do setor de construção civil
                gerenciarem projetos, materiais, finanças e documentos em um único lugar.
              </p>
              <div className="mt-8">
                <Link
                  to="/login"
                  className="inline-flex items-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-700 bg-white hover:bg-blue-50"
                >
                  Começar Agora <FaArrowRight className="ml-2" />
                </Link>
              </div>
            </div>
            <div className="mt-10 lg:mt-0 lg:w-1/2">
              <div className="bg-white rounded-lg shadow-xl overflow-hidden">
                <div className="h-64 bg-gray-200 flex items-center justify-center">
                  <FaBuilding className="h-32 w-32 text-gray-400" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Funcionalidades principais
            </h2>
            <p className="mt-4 text-lg text-gray-600">
              Tudo o que você precisa para gerenciar suas obras de forma eficiente
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaBuilding className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Gestão de Obras</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Controle todas as suas obras, etapas e cronogramas em um único sistema
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaTools className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Controle de Materiais</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Gerencie estoque, fornecedores e compras de materiais sem complicações
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaMoneyBillWave className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Financeiro</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Controle de despesas, receitas e orçamentos para cada obra
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaFileAlt className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Documentos</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Organize contratos, plantas, licenças e outros documentos importantes
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaChartLine className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Relatórios</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Gere relatórios detalhados e acompanhe o progresso dos seus projetos
                </p>
              </div>
            </div>

            <div className="bg-white overflow-hidden shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex items-center justify-center h-12 w-12 rounded-md bg-blue-500 text-white">
                  <FaUsers className="h-6 w-6" />
                </div>
                <h3 className="mt-5 text-lg font-medium text-gray-900">Multiusuários</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Trabalhe em equipe com diferentes níveis de acesso para cada colaborador
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section id="solicitar-acesso" className="bg-blue-700 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="lg:flex lg:items-center lg:justify-between">
            <div>
              <h2 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
                Pronto para começar?
              </h2>
              <p className="mt-3 max-w-3xl text-lg text-blue-200">
                Entre em contato conosco para solicitar uma demonstração ou saber mais sobre o sistema.
              </p>
            </div>
            <div className="mt-8 flex lg:mt-0 lg:flex-shrink-0">
              <div className="inline-flex rounded-md shadow">
                <a
                  href="mailto:contato@gestobra.com"
                  className="inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-blue-600 bg-white hover:bg-indigo-50"
                >
                  Solicitar Demonstração
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="border-t border-gray-200 pt-8 md:flex md:items-center md:justify-between">
            <div className="flex space-x-6 md:order-2">
              <a href="#" className="text-gray-400 hover:text-gray-500">
                <span className="sr-only">LinkedIn</span>
                <svg className="h-6 w-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
                </svg>
              </a>
            </div>
            <p className="mt-8 text-base text-gray-500 md:mt-0 md:order-1">
              &copy; 2024 GestObra. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home; 