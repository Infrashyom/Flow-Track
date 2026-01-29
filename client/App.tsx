
import React from 'react';
import { Role } from './types';
import LoginPage from './portals/LoginPage';
import SalesPortal from './portals/SalesPortal';
import TeamPortal from './portals/TeamPortal';
import DigitizerPortal from './portals/DigitizerPortal';
import VendorPortal from './portals/VendorPortal';
import AdminPortal from './portals/AdminPortal';
import { useAppContext } from './store/AppContext';
import Toast from './components/ui/Toast';

const App: React.FC = () => {
  const { currentUser, logout, isAuthLoading, toasts, removeToast } = useAppContext();

  if (isAuthLoading) {
    return (
      <div className="fixed inset-0 bg-white z-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900"></div>
      </div>
    );
  }

  const renderPortal = () => {
    if (!currentUser) {
      return <LoginPage />;
    }

    switch (currentUser.role) {
      case Role.SALES:
        return <SalesPortal onLogout={logout} />;
      case Role.TEAM:
        return <TeamPortal onLogout={logout} />;
      case Role.DIGITIZER:
        return <DigitizerPortal onLogout={logout} />;
      case Role.VENDOR:
        return <VendorPortal onLogout={logout} />;
      case Role.ADMIN:
        return <AdminPortal onLogout={logout} />;
      default:
        return <LoginPage />;
    }
  };

  return (
    <div className="min-h-screen w-full">
      {renderPortal()}
      
      {/* Toast Container */}
      <div aria-live="assertive" className="fixed inset-0 flex items-end px-4 py-6 pointer-events-none sm:p-6 sm:items-start z-[100]">
        <div className="w-full flex flex-col items-center space-y-2 sm:items-end">
          {toasts.map((toast) => (
            <Toast key={toast.id} toast={toast} onDismiss={removeToast} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
