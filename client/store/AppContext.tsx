
import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { Order, User, Attachment, OrderStatus, Role, ToastMessage, Priority } from '../types';

// Base URL for your backend API
const API_URL = '/api';
const TOKEN_KEY = 'flowtrack_token';

interface AppState {
  orders: Order[];
  users: User[];
  currentUser: User | null;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  updateOrderStatus: (orderId: string, status: OrderStatus, note?: string, updates?: { digitizerId?: string; vendorId?: string; priority?: Priority; digitizerStatus?: string; vendorStatus?: string; shippedItems?: string; }, attachmentFiles?: File[] | null) => Promise<void>;
  addOrderNote: (orderId: string, note: string, targetRole?: string) => Promise<void>;
  editOrderNote: (orderId: string, noteId: string, content: string) => Promise<void>;
  deleteAttachment: (orderId: string, attachmentId: string) => Promise<void>;
  addUser: (user: Omit<User, 'id'>) => Promise<void>;
  updateUser: (user: User) => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  importShopifyOrders: (limit?: number, isAutoSync?: boolean) => Promise<{ message: string; importedCount: number; }>;
  uploadFile: (file: File) => Promise<string | null>;
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
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isAuthLoading, setIsAuthLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Toast functions
  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = `toast-${Date.now()}`;
    setToasts(currentToasts => [...currentToasts, { id, ...toast }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Auto-dismiss after 5 seconds
  };

  const removeToast = (id: string) => {
    setToasts(currentToasts => currentToasts.filter(toast => toast.id !== id));
  };


  // Helper function to get authorization headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem(TOKEN_KEY);
    return token ? { 'Authorization': `Bearer ${token}` } : {};
  };

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
          await fetchData(true); // Fetch initial data without setting global loading
        } else {
          localStorage.removeItem(TOKEN_KEY);
        }
      } catch (error) {
        console.error("Session verification failed", error);
        localStorage.removeItem(TOKEN_KEY);
      } finally {
        setIsAuthLoading(false);
      }
    };

    verifyUserSession();
  }, []);


  const fetchData = async (isInitialLoad = false) => {
    try {
      if (!isInitialLoad) setIsLoading(true);
      const [ordersRes, usersRes] = await Promise.all([
        fetch(`${API_URL}/orders`, { headers: getAuthHeaders() }),
        fetch(`${API_URL}/auth/users`, { headers: getAuthHeaders() }),
      ]);

      if (!ordersRes.ok || !usersRes.ok) {
        logout();
        return;
      }

      const ordersData = await ordersRes.json();
      const usersData = await usersRes.json();
      setOrders(ordersData);
      setUsers(usersData);
    } catch (error) {
      console.error("Failed to fetch data", error);
    } finally {
      if (!isInitialLoad) setIsLoading(false);
    }
  };

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
          console.error("Login failed (Server Error):", response.statusText);
          addToast({ type: 'error', message: 'Internal Server Error.' });
          return false;
      }

      if (!response.ok) {
        addToast({ type: 'error', message: data.message || 'Invalid email or password.' });
        return false;
      }
      
      localStorage.setItem(TOKEN_KEY, data.token);
      setCurrentUser(data.user);
      await fetchData(true);
      addToast({ type: 'success', message: 'Login successful!' });

      // Auto-sync on login for Team/Admin users and show a toast with the result
      if (data.user.role === Role.TEAM || data.user.role === Role.ADMIN) {
        console.log('Performing automatic Shopify sync on login...');
        const syncResult = await importShopifyOrders(250, true); // Wait for sync to complete
        addToast({ type: 'success', message: syncResult.message });
      }

      return true;
    } catch (error) {
      console.error("Login failed", error);
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
  };
  
  const handleApiCall = async (apiCall: () => Promise<Response>, successMessage: string) => {
    try {
        setIsLoading(true);
        const response = await apiCall();
        if (!response.ok) {
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                // If JSON parsing fails, it's likely a 500 error or HTML response
                console.error("Non-JSON API Error Response:", response.status, response.statusText);
                throw new Error("Internal Server Error");
            }

            if (response.status === 401) {
                logout();
                throw new Error("Session expired. Please log in again.");
            }
            
            // Log the actual server error to console for debugging
            console.error("API Error Detail:", errorData);

            // Display generic error for 500 status, specific for others if safe
            if (response.status >= 500) {
                throw new Error("Internal Server Error");
            } else {
                throw new Error(errorData.message || 'API request failed');
            }
        }
        await fetchData(true);
        addToast({ type: 'success', message: successMessage });
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        addToast({ type: 'error', message: errorMessage });
        console.error("API call failed:", error);
        throw error;
    } finally {
        setIsLoading(false);
    }
  };

  const uploadFile = async (file: File): Promise<string | null> => {
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
            let errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                console.error("Upload Error (Non-JSON):", response.statusText);
                throw new Error("Internal Server Error");
            }
            throw new Error(errorData.message || 'File upload failed');
        }
        const data = await response.json();
        addToast({ type: 'success', message: 'File uploaded successfully.' });
        return data.url;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        addToast({ type: 'error', message: `Upload failed: ${errorMessage}` });
        return null;
    } finally {
        setIsLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus, note?: string, updates?: { digitizerId?: string; vendorId?: string; priority?: Priority; digitizerStatus?: string; vendorStatus?: string; shippedItems?: string; }, attachmentFiles?: File[] | null) => {
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
        headers: getAuthHeaders(), // No 'Content-Type', browser sets it for FormData
        body: formData,
    }), `Order updated successfully.`);
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
    }), `Note updated successfully.`);
  };

  const deleteAttachment = async (orderId: string, attachmentId: string) => {
    await handleApiCall(() => fetch(`${API_URL}/orders/${orderId}/attachments/${attachmentId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    }), `Attachment deleted successfully.`);
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(userData),
    }), `User ${userData.name} added successfully.`);
  };

  const updateUser = async (updatedUser: User) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users/${updatedUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify(updatedUser),
    }), `User ${updatedUser.name} updated successfully.`);
  };

  const deleteUser = async (userId: string) => {
    await handleApiCall(() => fetch(`${API_URL}/auth/users/${userId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
    }), 'User deleted successfully.');
  };
  
  const importShopifyOrders = async (limit: number = 250, isAutoSync: boolean = false) => {
    try {
      if (!isAutoSync) setIsLoading(true);
      const response = await fetch(`${API_URL}/orders/shopify-sync`, { 
          method: 'POST',
          headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
          body: JSON.stringify({ limit })
      });
      
      let result;
      try {
          result = await response.json();
      } catch (e) {
          console.error("Shopify Sync Server Error (Non-JSON):", response.statusText);
          if (!isAutoSync) addToast({ type: 'error', message: 'Internal Server Error during sync.' });
          return { message: 'Internal Error', importedCount: 0 };
      }

      if (!response.ok) throw new Error(result.message || 'Shopify sync failed');
      
      await fetchData(true); // Refresh data
      
      if (!isAutoSync) {
        addToast({ type: 'success', message: result.message });
      } else {
        console.log(`Auto-sync complete: ${result.message}`);
      }

      return { message: result.message, importedCount: result.importedOrders?.length || 0 };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      if (!isAutoSync) {
        addToast({ type: 'error', message: `Sync failed: ${errorMessage}` });
      }
      console.error("Shopify sync error:", error);
      return { message: 'An error occurred during sync.', importedCount: 0 };
    } finally {
      if (!isAutoSync) setIsLoading(false);
    }
  };

  const value: AppState = {
    orders,
    users,
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
        <div className="fixed inset-0 bg-black bg-opacity-20 z-50 flex items-center justify-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-slate-900"></div>
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
