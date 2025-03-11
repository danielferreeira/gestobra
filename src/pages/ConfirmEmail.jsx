import { useLocation, Link } from 'react-router-dom';
import { FaEnvelope } from 'react-icons/fa';

const ConfirmEmail = () => {
  const location = useLocation();
  const email = location.state?.email || 'seu email';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-md text-center">
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-3 rounded-full">
            <FaEnvelope className="text-blue-500 text-3xl" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Verifique seu Email</h2>
        <p className="text-gray-600 mb-6">
          Enviamos um link de confirmação para <strong>{email}</strong>. 
          Por favor, verifique sua caixa de entrada e clique no link para ativar sua conta.
        </p>
        
        <div className="bg-blue-50 p-4 rounded-lg mb-6">
          <p className="text-sm text-blue-800">
            Se você não receber o email em alguns minutos, verifique sua pasta de spam ou lixo eletrônico.
          </p>
        </div>
        
        <div className="mt-6">
          <Link
            to="/login"
            className="text-blue-500 hover:text-blue-700 font-medium"
          >
            Voltar para o login
          </Link>
        </div>
      </div>
    </div>
  );
};

export default ConfirmEmail; 