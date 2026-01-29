
import React, { useEffect, useState } from 'react';
import { ToastMessage } from '../../types';
import { CheckCircleIcon, XCircleIcon, XIcon } from '../icons/Icons';

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ toast, onDismiss }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Animate in
    setIsVisible(true);
  }, []);
  
  const handleDismiss = () => {
      setIsVisible(false);
      // Allow time for fade-out animation before removing from DOM
      setTimeout(() => onDismiss(toast.id), 300);
  }

  const isSuccess = toast.type === 'success';

  const containerClasses = `
    w-full max-w-sm bg-white shadow-lg rounded-lg pointer-events-auto ring-1 ring-black ring-opacity-5 overflow-hidden
    transition-all duration-300 ease-in-out
    ${isVisible ? 'transform-gpu opacity-100 translate-y-0' : 'transform-gpu opacity-0 -translate-y-4'}
  `;

  const iconClasses = isSuccess ? 'text-green-500' : 'text-red-500';
  const Icon = isSuccess ? CheckCircleIcon : XCircleIcon;

  return (
    <div className={containerClasses}>
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <Icon className={`h-6 w-6 ${iconClasses}`} aria-hidden="true" />
          </div>
          <div className="ml-3 w-0 flex-1 pt-0.5">
            <p className="text-sm font-medium text-slate-900">{isSuccess ? 'Success' : 'Error'}</p>
            <p className="mt-1 text-sm text-slate-500">{toast.message}</p>
          </div>
          <div className="ml-4 flex-shrink-0 flex">
            <button
              onClick={handleDismiss}
              className="bg-white rounded-md inline-flex text-slate-400 hover:text-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-500"
            >
              <span className="sr-only">Close</span>
              <XIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Toast;
