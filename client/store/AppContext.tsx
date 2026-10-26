import React, { createContext, useContext, useState, ReactNode, useEffect, useCallback } from 'react';
import { 
  Order, 
  User, 
  OrderStatus, 
  Role, 
  ToastMessage, 
  Priority, 
  Ticket, 
  TicketCategory, 
  TicketPriority, 
  TicketStatus, 
  TicketAttachment 
} from '../types';

const API_URL = '/api';
const TOKEN_KEY = 'flowtrack_token';

interface CreateTicketPayload {
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  relatedOrderId?: string;
  customerName?: string;
  customerEmail?: string;
  assignedToId?: string | null;
  attachments?: TicketAttachment[];
}

interface UpdateTicketPayload {
  title?: string;
  description?: string;
  category?: TicketCategory;
  priority?: TicketPriority;
  status?: TicketStatus;
  assignedToId?: string | null;
}

interface AppState {
  orders: Order[];
  users: User[];
  tickets: Ticket[];
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateOrderStatus: (
    orderId: string, 
    status: OrderStatus, 
    note?: string, 
    updates?: { digitizerId?: string; vendorId?: string; priority?: Priority; digitizerStatus?: string; vendorStatus?: string; shippedItems?: string; }, 
    attachmentFiles?: File[] | null
  ) => Promise<void>;
  addOrderNote: (orderId: string, note: string, targetRole?: string) => Promise<void>;
  editOrderNote: (orderId: string, noteId: string, content: string) => Promise<void>;
  deleteAttachment: (orderId: string, attachmentId: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  importShopifyOrders: (limit?: number, isAutoSync?: boolean) => Promise<{ message: string; importedCount: number; }>;
  uploadFile: (file: File) => Promise<{ url: string; filename: string; size: number } | null>;
  
  // Ticket Operations
  fetchTickets: () => Promise<void>;
  createTicket: (payload: CreateTicketPayload) => Promise<Ticket | null>;
  updateTicket: (ticketId: string, updates: UpdateTicketPayload) => Promise<boolean>;
  pingAdminForTicket: (ticketId: string, requestNote: string) => Promise<boolean>;
  respondToAdminPing: (ticketId: string, action: 'approved' | 'rejected', adminNote?: string, newStatus?: TicketStatus) => Promise<boolean>;
  addTicketComment: (ticketId: string, content: string, attachments?: TicketAttachment[], isInternal?: boolean) => Promise<boolean>;
  addTicketAttachment: (ticketId: string, name: string, url: string, size?: number) => Promise<boolean>;

  isLoading: boolean;
  isAuthLoading: boolean;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const AppContext = createContext<AppState | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast functions
  const addToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`;
    setToasts(currentToasts => [...currentToasts, { id, ...toast }]);
    setTimeout(() => {
      removeToast(id);
    }, 4500);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }, []);

  const getAuthHeaders = (): Record<string, string> => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

  const fetchData = useCallback(async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) setIsLoading(true);
      const [ordersRes, usersRes, ticketsRes] = await Promise.all([
        fetch(`${API_URL}/orders`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/auth/users`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/tickets`, { headers: getAuthHeaders() })
      ]);

      if (ordersRes.status === 401 || usersRes.status === 401) {
        logout();
        return;
      }

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
      }
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
      }
      if (ticketsRes.ok) {
        const ticketsData = await ticketsRes.json();
        setTickets(ticketsData);
      }
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      if (!isInitialLoad) setIsLoading(false);
    }
  }, []);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/tickets`, { headers: getAuthHeaders() });
      if (res.ok) {
        const data = await res.json();
        setTickets(data);
      }
    } catch (err) {
      console.error('Error fetching tickets:', err);
    }
  }, []);

  useEffect(() => {
    const verifyUserSession = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setIsAuthLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/auth/verify`, {
          headers: getAuthHeaders(),
        });

        if (response.ok) {
          const { user } = await response.json();
          setCurrentUser(user);
          await fetchData(true);
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (error) {
        console.error('Session verification failed', error);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsAuthLoading(false);
      }
    };

    verifyUserSession();
  }, [fetchData]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      let data;
      try {
        data = await response.json();
      } catch (e) {
        console.error('Login failed (Non-JSON):', response.statusText);
        addToast({ type: 'error', message: 'Unable to communicate with server.' });
        return false;
      }

      if (!response.ok) {
        addToast({ type: 'error', message: data.message || 'Invalid email or password.' });
        return false;
      }
      
      localStorage.setItem(TOKEN_KEY, data.token);
      setCurrentUser(data.user);
      await fetchData(true);
      addToast({ type: 'success', message: `Welcome back, ${data.user.name}!` });
      return true;
    } catch (error) {
      console.error('Login error', error);
      addToast({ type: 'error', message: 'A network error occurred during login.' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    setCurrentUser(null);
    setOrders([]);
    setUsers([]);
    setTickets([]);
  };

  const handleApiCall = async (apiCall: () => Promise<Response>, successMessage: string) => {
    try {
      setIsLoading(true);
      const response = await apiCall();
      if (!response.ok) {
        let errorData: any = {};
        try {
          errorData = await response.json();
        } catch (e) {
          console.error('Non-JSON response:', response.status);
        }

        if (response.status === 401) {
          logout();
          throw new Error('Session expired. Please log in again.');
        }

        throw new Error(errorData.message || 'Operation failed');
      }
      await fetchData(true);
      addToast({ type: 'success', message: successMessage });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred.';
      addToast({ type: 'error', message: errorMessage });
      console.error('API call failed:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<{ url: string; filename: string; size: number } | null> => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      setIsLoading(true);
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: formData,
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'File upload failed');
      }
      const data = await response.json();
      addToast({ type: 'success', message: 'File uploaded successfully.' });
      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      addToast({ type: 'error', message: errorMessage });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  // Orders
  const updateOrderStatus = async (
    orderId: string, 
    status: OrderStatus, 
    note?: string, 
    updates?: { digitizerId?: string; vendorId?: string; priority?: Priority; digitizerStatus?: string; vendorStatus?: string; shippedItems?: string; }, 
    attachmentFiles?: File[] | null
  ) => {
    const formData = new FormData();
    formData.append('status', status);
    if (note) formData.append('note', note);
    if (updates?.digitizerId) formData.append('digitizerId', updates.digitizerId);
    if (updates?.vendorId) formData.append('vendorId', updates.vendorId);
    if (updates?.priority) formData.append('priority', updates.priority);
    if (updates?.digitizerStatus) formData.append('digitizerStatus', updates.digitizerStatus);
    if (updates?.vendorStatus) formData.append('vendorStatus', updates.vendorStatus);
    if (updates?.shippedItems) formData.append('shippedItems', updates.shippedItems);
    
    if (attachmentFiles && attachmentFiles.length > 0) {
      for (const file of attachmentFiles) {
        formData.append('attachmentFiles', file);
      }
      if (currentUser) {
        formData.append('uploadedBy', currentUser.role);
      }
    }

    await handleApiCall(() => fetch(`${API_URL}/orders/${orderId}/status`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: formData,
    }), 'Order status updated.');
  };

  const addOrderNote = async (orderId: string, note: string, targetRole?: string) => {
    await handleApiCall(() => fetch(`${API_URL}/orders/${orderId}/note`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ note, targetRole }),
    }), `Note added to order ${orderId}.`);
  };

  const editOrderNote = async (orderId: string, noteId: string, content: string) => {
    await handleApiCall(() => fetch(`${API_URL}/orders/${orderId}/notes/${noteId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify({ content }),
    }), 'Note updated.');
  };

  const deleteAttachment = async (orderId: string, attachmentId: string) => {
    await handleApiCall(() => fetch(`${API_URL}/orders/${orderId}/attachments/${attachmentId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }), 'Attachment deleted.');
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(userData),
    }), `User ${userData.name} created.`);
  };

  const updateUser = async (updatedUser: User) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users/${updatedUser.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      body: JSON.stringify(updatedUser),
    }), `User ${updatedUser.name} updated.`);
  };

  const deleteUser = async (userId: string) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users/${userId}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    }), 'User removed.');
  };

  const importShopifyOrders = async (limit = 250, isAutoSync = false) => {
    try {
      if (!isAutoSync) setIsLoading(true);
      const response = await fetch(`${API_URL}/orders/shopify-sync`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ limit })
      });
      const result = await response.json();
      await fetchData(true);
      if (!isAutoSync) addToast({ type: 'success', message: result.message });
      return { message: result.message, importedCount: result.importedOrders?.length || 0 };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Sync failed';
      if (!isAutoSync) addToast({ type: 'error', message: msg });
      return { message: msg, importedCount: 0 };
    } finally {
      if (!isAutoSync) setIsLoading(false);
    }
  };

  // ==========================================
  // TICKET ACTIONS
  // ==========================================
  const createTicket = async (payload: CreateTicketPayload): Promise<Ticket | null> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/tickets`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to create ticket');
      }
      setTickets(prev => [data, ...prev]);
      addToast({ type: 'success', message: `Ticket ${data.id} raised successfully!` });
      return data;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error raising ticket' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateTicket = async (ticketId: string, updates: UpdateTicketPayload): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/tickets/${ticketId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update ticket');
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? data : t));
      addToast({ type: 'success', message: `Ticket ${ticketId} updated.` });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error updating ticket' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const pingAdminForTicket = async (ticketId: string, requestNote: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/tickets/${ticketId}/ping-admin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ requestNote })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to ping Admin');
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? data : t));
      addToast({ type: 'success', message: `Admin has been notified for ticket ${ticketId}!` });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error pinging Admin' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const respondToAdminPing = async (
    ticketId: string, 
    action: 'approved' | 'rejected', 
    adminNote?: string, 
    newStatus?: TicketStatus
  ): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await fetch(`${API_URL}/tickets/${ticketId}/admin-response`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ action, adminNote, newStatus })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to submit response');
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? data : t));
      addToast({ 
        type: 'success', 
        message: action === 'approved' 
          ? `Admin approval registered for ${ticketId}.` 
          : `Admin decision registered for ${ticketId}.` 
      });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error submitting response' });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const addTicketComment = async (
    ticketId: string, 
    content: string, 
    attachments?: TicketAttachment[], 
    isInternal?: boolean
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ content, attachments, isInternal })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to post comment');
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? data : t));
      addToast({ type: 'success', message: 'Comment added.' });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error adding comment' });
      return false;
    }
  };

  const addTicketAttachment = async (
    ticketId: string, 
    name: string, 
    url: string, 
    size?: number
  ): Promise<boolean> => {
    try {
      const res = await fetch(`${API_URL}/tickets/${ticketId}/attachments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ name, url, size })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to attach file');
      }
      setTickets(prev => prev.map(t => t.id === ticketId ? data : t));
      addToast({ type: 'success', message: 'Attachment added.' });
      return true;
    } catch (err: any) {
      addToast({ type: 'error', message: err.message || 'Error attaching file' });
      return false;
    }
  };

  const value: AppState = {
    orders,
    users,
    tickets,
    currentUser,
    login,
    logout,
    updateOrderStatus,
    addOrderNote,
    editOrderNote,
    deleteAttachment,
    addUser,
    updateUser,
    deleteUser,
    importShopifyOrders,
    uploadFile,
    fetchTickets,
    createTicket,
    updateTicket,
    pingAdminForTicket,
    respondToAdminPing,
    addTicketComment,
    addTicketAttachment,
    isLoading,
    isAuthLoading,
    toasts,
    addToast,
    removeToast,
  };

  return (
    <AppContext.Provider value={value}>
      {children}
      {isLoading && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-[1px] z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-white rounded-xl shadow-xl px-5 py-3.5 flex items-center space-x-3 border border-slate-200">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-slate-900 border-t-transparent"></div>
            <span className="text-xs font-medium text-slate-700">Syncing with server...</span>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
};

export const useAppContext = (): AppState => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
