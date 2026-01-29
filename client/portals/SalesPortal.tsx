import React, { useState, useMemo, useEffect } from 'react';
import { Role, OrderStatus, Order, Priority } from '../types';
import DashboardLayout from '../components/shared/DashboardLayout';
import { useAppContext } from '../store/AppContext';
import OrderCard from '../components/shared/OrderCard';
import OrderDetailsModal from '../components/shared/OrderDetailsModal';
import Button from '../components/ui/Button';
import { SearchIcon, ChevronLeftIcon, ChevronRightIcon } from '../components/icons/Icons';
import Modal from '../components/ui/Modal';


const ITEMS_PER_PAGE = 12;

interface SalesDashboardContentProps {
  searchTerm: string;
}

export const SalesDashboardContent: React.FC<SalesDashboardContentProps> = ({ searchTerm }) => {
  const { orders, addOrderNote, isLoading } = useAppContext();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  // State for the remark modal
  const [isRemarkModalOpen, setIsRemarkModalOpen] = useState(false);
  const [orderForRemark, setOrderForRemark] = useState<Order | null>(null);
  const [remarkText, setRemarkText] = useState('');
  
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortOrder, filterPriority]);

  const processedOrders = useMemo(() => {
    let filteredOrders = [...orders];

    if (filterStatus !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.status === filterStatus);
    }

    if (filterPriority !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.priority === filterPriority);
    }

    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase().trim();
      filteredOrders = filteredOrders.filter(order =>
        (order.shopifyOrderNumber || order.id).toLowerCase().includes(lowercasedTerm) ||
        order.customerName.toLowerCase().includes(lowercasedTerm) ||
        order.productName.toLowerCase().includes(lowercasedTerm)
      );
    }

    switch (sortOrder) {
      case 'newest':
        filteredOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
        break;
      case 'oldest':
        filteredOrders.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime());
        break;
      case 'customer_asc':
        filteredOrders.sort((a, b) => a.customerName.localeCompare(b.customerName));
        break;
      case 'customer_desc':
        filteredOrders.sort((a, b) => b.customerName.localeCompare(a.customerName));
        break;
      case 'status':
        filteredOrders.sort((a, b) => a.status.localeCompare(b.status));
        break;
    }

    return filteredOrders;
  }, [orders, searchTerm, filterStatus, sortOrder, filterPriority]);

  const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = processedOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const openRemarkModal = (order: Order) => {
    setOrderForRemark(order);
    setRemarkText('');
    setIsRemarkModalOpen(true);
  };
  
  const closeRemarkModal = () => {
    setIsRemarkModalOpen(false);
    setOrderForRemark(null);
    setRemarkText('');
  };

  const handleSaveRemark = async () => {
    if (orderForRemark && remarkText.trim()) {
      await addOrderNote(orderForRemark.id, remarkText.trim());
      closeRemarkModal();
    }
  };
  
  return (
    <>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-3xl font-bold">Sales Dashboard</h3>
          <span className="bg-slate-200 text-slate-700 text-sm font-semibold px-3 py-1 rounded-full">{processedOrders.length} Orders</span>
        </div>
        
        <div className="flex items-center space-x-2">
          <select
            value={filterStatus}
            onChange={(e) => { setFilterStatus(e.target.value as OrderStatus | 'all'); }}
            className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm"
            aria-label="Filter by status"
          >
            <option value="all">All Statuses</option>
            {Object.values(OrderStatus).map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => { setFilterPriority(e.target.value as Priority | 'all'); }}
            className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm"
            aria-label="Filter by priority"
          >
            <option value="all">All Priorities</option>
            {Object.values(Priority).map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
          <select
            value={sortOrder}
            onChange={(e) => { setSortOrder(e.target.value); }}
            className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm"
            aria-label="Sort orders"
          >
            <option value="newest">Sort by: Newest</option>
            <option value="oldest">Sort by: Oldest</option>
            <option value="customer_asc">Customer (A-Z)</option>
            <option value="customer_desc">Customer (Z-A)</option>
            <option value="status">Status</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={() => setSelectedOrder(order)}
            actions={
              <Button size="sm" variant="secondary" onClick={() => openRemarkModal(order)}>
                Add Remark
              </Button>
            }
          />
        ))}
      </div>
      
      {processedOrders.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border">
            <p className="text-slate-500">No orders found matching your criteria.</p>
          </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeftIcon className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <span className="text-sm font-medium">
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
            <ChevronRightIcon className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}

      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <Modal
        isOpen={isRemarkModalOpen}
        onClose={closeRemarkModal}
        title={`Add Remark for Order ${orderForRemark?.shopifyOrderNumber || orderForRemark?.id}`}
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeRemarkModal}>Cancel</Button>
            <Button onClick={handleSaveRemark} disabled={!remarkText.trim() || isLoading}>
              {isLoading ? 'Saving...' : 'Save Remark'}
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          <label htmlFor="remark-textarea" className="block text-sm font-medium text-slate-700">
            Enter your note or update below. It will be added to the order's history.
          </label>
          <textarea
            id="remark-textarea"
            value={remarkText}
            onChange={(e) => setRemarkText(e.target.value)}
            className="w-full mt-2 p-2 border rounded-md bg-slate-50 border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-shadow"
            placeholder="e.g., Customer called to confirm the shipping address..."
            rows={4}
            aria-label="Remark input"
          />
        </div>
      </Modal>
    </>
  )
}

const SalesPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const headerContent = (
    <div className="flex items-center gap-4">
      <div className="relative">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Search orders..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full md:w-64 pl-10 pr-4 py-2 border rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-800"
          aria-label="Search orders"
        />
      </div>
    </div>
  );

  return (
    <DashboardLayout role={Role.SALES} onLogout={onLogout} headerContent={headerContent} showSidebar={false}>
      <SalesDashboardContent searchTerm={searchTerm} />
    </DashboardLayout>
  );
};

export default SalesPortal;