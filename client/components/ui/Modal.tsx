
import React, { ReactNode } from 'react';
import { XIcon } from '../icons/Icons';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, footer, className }) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div 
        className={`relative w-full mx-4 bg-white rounded-lg shadow-xl flex flex-col max-h-[90vh] ${className || 'max-w-lg'}`}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex-shrink-0 flex items-start justify-between p-6 pb-4 border-b">
          <h2 className="text-xl font-semibold">{title}</h2>
          <button onClick={onClose} className="p-1 -mt-2 -mr-2 rounded-full text-slate-500 hover:bg-slate-100">
            <XIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-grow overflow-y-auto p-6">
          {children}
        </div>
        {footer && (
            <div className="flex-shrink-0 p-6 pt-4 border-t">
                {footer}
            </div>
        )}
      </div>
    </div>
  );
};

export default Modal;