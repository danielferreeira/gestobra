import React, { useState, useEffect } from 'react';
import { FaCheck, FaExclamationTriangle, FaTimes, FaInfo } from 'react-icons/fa';

export const Toast = ({ message, type = 'success', duration = 5000, onClose }) => {
  const [visible, setVisible] = useState(true);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      if (onClose) {
        onClose();
      }
    }, duration);
    
    return () => clearTimeout(timer);
  }, [duration, onClose]);
  
  const handleClose = () => {
    setVisible(false);
    if (onClose) {
      onClose();
    }
  };
  
  if (!visible) return null;
  
  // Configurações baseadas no tipo
  const config = {
    success: {
      bgColor: 'bg-green-100',
      borderColor: 'border-green-400',
      textColor: 'text-green-700',
      icon: <FaCheck className="h-5 w-5 text-green-500" />
    },
    error: {
      bgColor: 'bg-red-100',
      borderColor: 'border-red-400',
      textColor: 'text-red-700',
      icon: <FaExclamationTriangle className="h-5 w-5 text-red-500" />
    },
    warning: {
      bgColor: 'bg-yellow-100',
      borderColor: 'border-yellow-400',
      textColor: 'text-yellow-700',
      icon: <FaExclamationTriangle className="h-5 w-5 text-yellow-500" />
    },
    info: {
      bgColor: 'bg-blue-100',
      borderColor: 'border-blue-400',
      textColor: 'text-blue-700',
      icon: <FaInfo className="h-5 w-5 text-blue-500" />
    }
  };
  
  const { bgColor, borderColor, textColor, icon } = config[type] || config.info;
  
  return (
    <div className="fixed top-5 right-5 z-50">
      <div className={`${bgColor} border ${borderColor} ${textColor} px-4 py-3 rounded shadow-md max-w-md`} role="alert">
        <div className="flex items-center">
          <div className="flex-shrink-0 mr-3">
            {icon}
          </div>
          <div className="flex-grow">
            <p>{message}</p>
          </div>
          <div>
            <button 
              type="button" 
              className={`${textColor} inline-flex focus:outline-none`}
              onClick={handleClose}
              aria-label="Fechar"
            >
              <FaTimes className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 