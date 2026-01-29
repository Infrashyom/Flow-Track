import React, { useState } from 'react';
import { Role } from '../../types';
import { HomeIcon, ClipboardListIcon, UsersIcon, BarChartIcon, PencilRulerIcon, TruckIcon, MenuIcon, LogOutIcon, PackageIcon, CheckCircleIcon } from '../icons/Icons';
import { useAppContext } from '../../store/AppContext';

interface DashboardLayoutProps {
  role: Role;
  onLogout: () => void;
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  headerContent?: React.ReactNode;
  showSidebar?: boolean;
  tabCounts?: { [key: string]: number };
}

const sidebarLinks: { [key in Role]?: { name: string; icon: React.ElementType, id: string }[] } = {
  [Role.ADMIN]: [
    { name: 'Dashboard', icon: BarChartIcon, id: 'dashboard' },
    { name: 'User Management', icon: UsersIcon, id: 'users' },
    { name: 'Incoming Queue', icon: ClipboardListIcon, id: 'incoming_queue' },
  ],
  [Role.TEAM]: [
    { name: 'Incoming Queue', icon: ClipboardListIcon, id: 'incoming_queue' },
    { name: 'Track Progress', icon: TruckIcon, id: 'track_progress' },
    { name: 'Out for Delivery', icon: CheckCircleIcon, id: 'out_for_delivery' },
    { name: 'Digitizer Records', icon: PencilRulerIcon, id: 'digitizer_records' },
    { name: 'Vendor Records', icon: PackageIcon, id: 'vendor_records' },
  ],
};


const DashboardLayout: React.FC<DashboardLayoutProps> = ({ role, onLogout, children, activeTab, onTabChange, headerContent, showSidebar = true, tabCounts }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { currentUser } = useAppContext();
  const links = sidebarLinks[role];
  
  const sidebarContent = (
    <>
      <div className="h-16 flex items-center justify-center border-b px-4 flex-shrink-0">
        <h1 className="text-xl font-bold text-slate-800">FlowTrack</h1>
      </div>
      <nav className="flex-grow p-4 space-y-2 overflow-y-auto">
        {links && onTabChange && links.map(link => {
          const count = tabCounts ? tabCounts[link.id] : undefined;
          return (
            <button
              key={link.id}
              onClick={() => {
                onTabChange(link.id);
                setIsSidebarOpen(false); // Close sidebar on mobile after navigation
              }}
              className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                activeTab === link.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <link.icon className="w-5 h-5 mr-3" />
              {link.name}
              {typeof count === 'number' && (
                <span className="ml-auto bg-slate-200 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </nav>
      <div className="p-4 border-t flex-shrink-0">
        <button
          onClick={onLogout}
          className="w-full flex items-center px-4 py-2 text-sm font-medium rounded-md text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <LogOutIcon className="w-5 h-5 mr-3" />
          Logout
        </button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-slate-100">
      {showSidebar && (
        <>
          {/* Overlay for mobile */}
          <div
            className={`fixed inset-0 bg-black/60 z-20 md:hidden transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsSidebarOpen(false)}
            aria-hidden="true"
          />
          {/* Sidebar Panel */}
          <aside className={`fixed top-0 left-0 h-full w-64 bg-white border-r flex flex-col z-30 transform transition-transform md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            {sidebarContent}
          </aside>
        </>
      )}

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-16 bg-white border-b flex items-center px-4 md:px-6 justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            {showSidebar && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 md:hidden"
                aria-label="Open sidebar"
              >
                <MenuIcon className="w-6 h-6" />
              </button>
            )}
            {!showSidebar && (
              <button
                onClick={onLogout}
                title="Logout"
                className="p-2 rounded-full text-slate-500 hover:bg-slate-100 transition-colors"
                aria-label="Logout"
              >
                <LogOutIcon className="w-5 h-5" />
              </button>
            )}
            <h2 className="text-lg md:text-2xl font-semibold text-slate-800 whitespace-nowrap">{role} Portal</h2>
          </div>
          <div className="flex items-center gap-4">
            {headerContent}
            {currentUser && (
              <div className="text-right hidden sm:block border-l pl-4 ml-2">
                <p className="text-sm font-semibold text-slate-800 truncate" title={currentUser.name}>
                  {currentUser.name}
                </p>
                <p className="text-xs text-slate-500">{currentUser.role}</p>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;