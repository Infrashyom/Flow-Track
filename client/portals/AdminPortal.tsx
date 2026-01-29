
import React, { useState, useMemo, useEffect } from 'react';
import { Role, OrderStatus, User, Order } from '../types';
import DashboardLayout from '../components/shared/DashboardLayout';
import { useAppContext } from '../store/AppContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { BarChartIcon, ChevronLeftIcon, ChevronRightIcon, EditIcon, PackageIcon, PencilRulerIcon, SearchIcon, TrashIcon, TruckIcon, UsersIcon, ShopifyIcon } from '../components/icons/Icons';
import { IncomingQueueView, ShopifySyncModal } from './TeamPortal';
import OrderDetailsModal from '../components/shared/OrderDetailsModal';

const StatCard: React.FC<{ title: string; value: string | number; icon: React.ElementType }> = ({ title, value, icon: Icon }) => (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-slate-500" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold">{value}</div>
        </CardContent>
    </Card>
);

const UserForm: React.FC<{ user?: User | null; onSave: (user: Omit<User, 'id'> | User) => void; onCancel: () => void; }> = ({ user, onSave, onCancel }) => {
    const [name, setName] = useState(user?.name || '');
    const [email, setEmail] = useState(user?.email || '');
    const [role, setRole] = useState(user?.role || Role.SALES);
    const [password, setPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const userData: Partial<User> = { name, email, role };
        if (password || !user) {
            userData.password = password;
        }
        const finalUserData = user ? { ...user, ...userData } : userData;
        onSave(finalUserData as User);
    };
    
    // Filter out the 'Admin' role from the available options
    const availableRoles = Object.values(Role).filter(r => r !== Role.ADMIN);

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label className="block text-sm font-medium text-slate-700">Name</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Email</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm" />
            </div>
             <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input type="password" value={password} onChange={e => setPassword(e.target.value)} required={!user} placeholder={user ? "Leave blank to keep unchanged" : ""} className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm" />
            </div>
            <div>
                <label className="block text-sm font-medium text-slate-700">Role</label>
                <select value={role} onChange={e => setRole(e.target.value as Role)} required className="mt-1 block w-full px-3 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm">
                    {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
                <Button type="button" variant="outline" onClick={onCancel}>Cancel</Button>
                <Button type="submit">{user ? 'Update User' : 'Add User'}</Button>
            </div>
        </form>
    );
}

const USERS_PER_PAGE = 5;

const AdminPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { orders, users, addUser, updateUser, deleteUser } = useAppContext();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  const stats = useMemo(() => {
    const roleCounts = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    return {
      totalOrders: orders.length,
      totalUsers: users.length,
      sales: roleCounts[Role.SALES] || 0,
      team: roleCounts[Role.TEAM] || 0,
      digitizers: roleCounts[Role.DIGITIZER] || 0,
      vendors: roleCounts[Role.VENDOR] || 0,
    };
  }, [orders, users]);

  const tabCounts = useMemo(() => ({
    incoming_queue: orders.filter(o => [OrderStatus.AT_TEAM, OrderStatus.TEAM_REVIEW].includes(o.status)).length
  }), [orders]);

  const handleSaveUser = (user: Omit<User, 'id'> | User) => {
    if ('id' in user) {
        updateUser(user);
    } else {
        addUser(user);
    }
    setIsModalOpen(false);
    setEditingUser(null);
  }
  
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setIsModalOpen(true);
  }

  const handleAddNewUser = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  }

  const openDeleteModal = (user: User) => {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  };
  
  const handleConfirmDelete = () => {
    if (userToDelete) {
        deleteUser(userToDelete.id);
        setIsDeleteModalOpen(false);
        setUserToDelete(null);
    }
  };

  const OrderStatusOverview = () => {
      const statusCounts = useMemo(() => {
        return orders.reduce((acc, order) => {
            acc[order.status] = (acc[order.status] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
      }, [orders]);
      const total = orders.length;

      const statusColors: Record<string, string> = {
        [OrderStatus.AT_TEAM]: 'bg-blue-600',
        [OrderStatus.AT_DIGITIZER]: 'bg-orange-500',
        [OrderStatus.TEAM_REVIEW]: 'bg-yellow-500',
        [OrderStatus.AT_VENDOR]: 'bg-purple-500',
        [OrderStatus.PARTIALLY_SHIPPED]: 'bg-indigo-500',
        [OrderStatus.OUT_FOR_DELIVERY]: 'bg-green-500',
      };

      return (
          <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => (
                  <div key={status}>
                      <div className="flex justify-between text-sm mb-1">
                          <span className="font-medium text-slate-700">{status}</span>
                          <span className="text-slate-500">{Number(count)}</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                          <div 
                            className={`${statusColors[status as OrderStatus] || 'bg-slate-400'} h-2 rounded-full`} 
                            style={{ width: total > 0 ? `${(Number(count) / total) * 100}%` : '0%'}}
                          ></div>
                      </div>
                  </div>
              ))}
          </div>
      );
  };
  
  const RecentActivity = () => {
    const recentOrders = useMemo(() => {
        return [...orders]
            .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
            .slice(0, 5);
    }, [orders]);
    
    return (
        <div className="space-y-4">
            {recentOrders.map(order => (
                <div key={order.id} className="flex items-center justify-between text-sm pb-2 border-b last:border-0">
                    <div>
                        <p className="font-semibold">{order.id} - <span className="font-normal">{order.productName}</span></p>
                        <p className="text-xs text-slate-500">Updated: {new Date(order.updatedAt).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedOrder(order)}>View</Button>
                </div>
            ))}
        </div>
    );
  };


  const DashboardView = () => (
    <div>
        <h3 className="text-3xl font-bold mb-6">Admin Dashboard</h3>
        <div className="grid gap-6 grid-cols-2 md:grid-cols-3 xl:grid-cols-6">
            <StatCard title="Total Orders" value={stats.totalOrders} icon={PackageIcon} />
            <StatCard title="Total Users" value={stats.totalUsers} icon={UsersIcon} />
            <StatCard title="Sales Reps" value={stats.sales} icon={UsersIcon} />
            <StatCard title="Team Members" value={stats.team} icon={UsersIcon} />
            <StatCard title="Digitizers" value={stats.digitizers} icon={PencilRulerIcon} />
            <StatCard title="Vendors" value={stats.vendors} icon={TruckIcon} />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
            <Card className="lg:col-span-1">
                <CardHeader><CardTitle>Order Status Overview</CardTitle></CardHeader>
                <CardContent><OrderStatusOverview /></CardContent>
            </Card>
            <Card className="lg:col-span-2">
                <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
                <CardContent><RecentActivity /></CardContent>
            </Card>
        </div>
    </div>
  );

  const UserManagementView = () => {
      const [searchTerm, setSearchTerm] = useState('');
      const [filterRole, setFilterRole] = useState<'all' | Role>('all');
      const [currentUserPage, setCurrentUserPage] = useState(1);
      
      useEffect(() => {
        setCurrentUserPage(1);
      }, [searchTerm, filterRole]);

      const processedUsers = useMemo(() => {
        let filteredUsers = [...users];

        if (filterRole !== 'all') {
            filteredUsers = filteredUsers.filter(user => user.role === filterRole);
        }

        if (searchTerm.trim() !== '') {
            const lowercasedTerm = searchTerm.toLowerCase().trim();
            filteredUsers = filteredUsers.filter(user =>
                user.name.toLowerCase().includes(lowercasedTerm) ||
                user.email.toLowerCase().includes(lowercasedTerm)
            );
        }
        
        // Admins should not be visible in the user management table
        return filteredUsers.filter(user => user.role !== Role.ADMIN);

      }, [users, searchTerm, filterRole]);


      const totalUserPages = Math.ceil(processedUsers.length / USERS_PER_PAGE);
      const paginatedUsers = processedUsers.slice(
          (currentUserPage - 1) * USERS_PER_PAGE,
          currentUserPage * USERS_PER_PAGE
      );

      const handleUserPageChange = (newPage: number) => {
          if (newPage > 0 && newPage <= totalUserPages) {
              setCurrentUserPage(newPage);
          }
      };
      
      const availableRoles = Object.values(Role).filter(r => r !== Role.ADMIN);

      return (
          <div>
              <div className="flex flex-wrap gap-4 justify-between items-center mb-6">
                  <h3 className="text-3xl font-bold">User Management</h3>
                  <div className="flex items-center space-x-2">
                      <div className="relative">
                          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                          <input
                              type="text"
                              placeholder="Search users..."
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                              className="w-full sm:w-40 pl-10 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
                              aria-label="Search users"
                          />
                      </div>
                      <select
                          value={filterRole}
                          onChange={(e) => setFilterRole(e.target.value as 'all' | Role)}
                          className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm"
                          aria-label="Filter by role"
                      >
                          <option value="all">All Roles</option>
                          {availableRoles.map(r => <option key={r} value={r}>{r}</option>)}
                      </select>
                      <Button onClick={handleAddNewUser}>Add User</Button>
                  </div>
              </div>
              <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-slate-500">
                        <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 whitespace-nowrap">Name</th>
                                <th scope="col" className="px-6 py-3 whitespace-nowrap">Email</th>
                                <th scope="col" className="px-6 py-3">Role</th>
                                <th scope="col" className="px-6 py-3">Password</th>
                                <th scope="col" className="px-6 py-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {paginatedUsers.map(user => (
                                <tr key={user.id} className="bg-white border-b">
                                    <td className="px-6 py-4 font-medium text-slate-900 whitespace-nowrap">{user.name}</td>
                                    <td className="px-6 py-4 whitespace-nowrap">{user.email}</td>
                                    <td className="px-6 py-4">{user.role}</td>
                                    <td className="px-6 py-4 font-mono">********</td>
                                    <td className="px-6 py-4 flex space-x-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleEditUser(user)}>
                                            <EditIcon className="h-4 w-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="text-red-600 hover:text-red-700" onClick={() => openDeleteModal(user)}>
                                            <TrashIcon className="h-4 w-4" />
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                  </div>
                  {processedUsers.length === 0 && (
                     <div className="text-center py-8">
                        <p className="text-slate-500">No users found matching your criteria.</p>
                     </div>
                  )}
              </Card>
              {totalUserPages > 1 && (
                  <div className="flex justify-center items-center mt-8 space-x-4">
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserPageChange(currentUserPage - 1)}
                          disabled={currentUserPage === 1}
                      >
                          <ChevronLeftIcon className="w-4 h-4 mr-2" />
                          Previous
                      </Button>
                      <span className="text-sm font-medium">
                          Page {currentUserPage} of {totalUserPages}
                      </span>
                      <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleUserPageChange(currentUserPage + 1)}
                          disabled={currentUserPage === totalUserPages}
                      >
                          Next
                          <ChevronRightIcon className="w-4 h-4 ml-2" />
                      </Button>
                  </div>
              )}
          </div>
      );
  };

  const headerContent = (
    <div className="flex items-center gap-2">
        <p className="text-xs text-slate-500 hidden md:block">To see more orders, sync with Shopify</p>
        <Button variant="outline" onClick={() => setIsSyncModalOpen(true)}>
            <ShopifyIcon className="w-5 h-5 mr-2" />
            Sync with Shopify
        </Button>
    </div>
  );

  const renderContent = () => {
    switch(activeTab) {
        case 'users':
            return <UserManagementView />;
        case 'incoming_queue':
            return <IncomingQueueView onViewOrderDetails={setSelectedOrder} />;
        case 'dashboard':
        default:
            return <DashboardView />;
    }
  };

  return (
    <DashboardLayout role={Role.ADMIN} onLogout={onLogout} activeTab={activeTab} onTabChange={setActiveTab} headerContent={headerContent} tabCounts={tabCounts}>
      {renderContent()}
      <Modal isOpen={isModalOpen} onClose={() => {setIsModalOpen(false); setEditingUser(null)}} title={editingUser ? 'Edit User' : 'Add New User'}>
        <UserForm user={editingUser} onSave={handleSaveUser} onCancel={() => {setIsModalOpen(false); setEditingUser(null)}} />
      </Modal>
      <Modal 
          isOpen={isDeleteModalOpen} 
          onClose={() => setIsDeleteModalOpen(false)} 
          title="Confirm User Deletion"
          footer={
              <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                  <Button variant="destructive" onClick={handleConfirmDelete}>Confirm Delete</Button>
              </div>
          }
      >
          <p>Are you sure you want to delete the user <strong>{userToDelete?.name}</strong>?</p>
          <p className="text-sm text-slate-600 mt-2">This action cannot be undone.</p>
      </Modal>
      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <ShopifySyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
    </DashboardLayout>
  );
};

export default AdminPortal;
