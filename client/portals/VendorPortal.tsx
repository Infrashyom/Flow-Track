
import React, { useState, useMemo } from 'react';
import { Role, OrderStatus, Order, Priority, LineItem } from '../types';
import DashboardLayout from '../components/shared/DashboardLayout';
import { useAppContext } from '../store/AppContext';
import OrderCard from '../components/shared/OrderCard';
import OrderDetailsModal from '../components/shared/OrderDetailsModal';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { TruckIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, FileUpIcon, PencilRulerIcon, CheckCircleIcon } from '../components/icons/Icons';

const ITEMS_PER_PAGE = 12;

const VendorPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { orders, currentUser, updateOrderStatus, isLoading, addToast } = useAppContext();

  // Modal and data state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isShipModalOpen, setIsShipModalOpen] = useState(false);
  const [orderToShip, setOrderToShip] = useState<Order | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [shippingNote, setShippingNote] = useState('');
  
  // Partial shipping state
  const [selectedItems, setSelectedItems] = useState<{ name: string; quantity: number }[]>([]);

  // Search, filter, and pagination state
  const [queueTab, setQueueTab] = useState<'new' | 'in_progress' | 'shipped'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);

  const CURRENT_VENDOR_ID = currentUser?.id;

  const vendorOrders = useMemo(() => {
    if (!CURRENT_VENDOR_ID) return [];
    return orders.filter(o => o.vendorId === CURRENT_VENDOR_ID);
  }, [orders, CURRENT_VENDOR_ID]);

  const { newOrders, inProgressOrders, shippedOrders } = useMemo(() => {
      const fresh: Order[] = [];
      const inProgress: Order[] = [];
      const shipped: Order[] = [];

      for (const order of vendorOrders) {
          if (order.status === OrderStatus.OUT_FOR_DELIVERY) {
              shipped.push(order);
          } else if (order.status === OrderStatus.AT_VENDOR || order.status === OrderStatus.PARTIALLY_SHIPPED) {
              if (order.vendorStatus === 'InProgress') {
                  inProgress.push(order);
              } else {
                  fresh.push(order);
              }
          }
      }
      return { newOrders: fresh, inProgressOrders: inProgress, shippedOrders: shipped };
  }, [vendorOrders]);

  const ordersToDisplay = useMemo(() => {
      if (queueTab === 'new') return newOrders;
      if (queueTab === 'in_progress') return inProgressOrders;
      return shippedOrders;
  }, [queueTab, newOrders, inProgressOrders, shippedOrders]);
  

  const processedOrders = useMemo(() => {
    let filteredOrders = [...ordersToDisplay];

    if (filterPriority !== 'all') {
      filteredOrders = filteredOrders.filter(order => order.priority === filterPriority);
    }

    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase().trim();
      filteredOrders = filteredOrders.filter(order =>
        order.id.toLowerCase().includes(lowercasedTerm) ||
        (order.shopifyOrderNumber && order.shopifyOrderNumber.toLowerCase().includes(lowercasedTerm)) ||
        order.productName.toLowerCase().includes(lowercasedTerm) ||
        order.customerName.toLowerCase().includes(lowercasedTerm)
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
    }

    return filteredOrders;
  }, [ordersToDisplay, searchTerm, sortOrder, filterPriority]);

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

  const handleStartProduction = async (order: Order) => {
      try {
          await updateOrderStatus(order.id, order.status, undefined, { vendorStatus: 'InProgress' });
      } catch (error) {
          console.error("Failed to start production:", error);
      }
  };

  const getEffectiveLineItems = (order: Order | null): LineItem[] => {
      if (!order) return [];
      
      // If lineItems are populated from backend, use them directly as they contain shippedQuantity
      if (order.lineItems && order.lineItems.length > 0) {
          return order.lineItems;
      }
      
      // Fallback: parse comma separated product names into individual line items
      return order.productName.split(', ').map(p => {
          const match = p.match(/^(\d+)\s*x\s*(.*)$/i);
          if (match) {
              return { name: match[2].trim(), quantity: parseInt(match[1]), shippedQuantity: 0 };
          }
          return { name: p.trim(), quantity: 1, shippedQuantity: 0 };
      });
  };

  const openShipModal = (order: Order) => {
    setOrderToShip(order);
    const lineItems = getEffectiveLineItems(order);
    
    // Auto-select items that have remaining quantity
    const itemsToSelect = lineItems
        .filter(li => (li.quantity - (li.shippedQuantity || 0)) > 0)
        .map(li => ({ name: li.name, quantity: li.quantity - (li.shippedQuantity || 0) }));

    setSelectedItems(itemsToSelect);
    setIsShipModalOpen(true);
  };

  const closeShipModal = () => {
    setOrderToShip(null);
    setFilesToUpload([]);
    setShippingNote('');
    setSelectedItems([]);
    setIsShipModalOpen(false);
  };
  
  const handleConfirmShip = async () => {
    if (orderToShip) {
      if (filesToUpload.length > 0) {
          if (filesToUpload.length > 10) {
              addToast({ type: 'error', message: 'You cannot upload more than 10 files at once.' });
              return;
          }
          const oversizeFile = filesToUpload.find(f => f.size > 5 * 1024 * 1024);
          if (oversizeFile) {
              addToast({ type: 'error', message: `File ${oversizeFile.name} exceeds the 5MB limit.` });
              return;
          }
      }

      if (selectedItems.length === 0) {
          addToast({ type: 'error', message: 'Please select at least one item to ship.' });
          return;
      }

      try {
        const effectiveLineItems = getEffectiveLineItems(orderToShip);
        
        // Calculate new status locally just for immediate UI check or future logic, 
        // though backend handles the truth source.
        let isOrderFullyShippedAfterThis = true;
        
        for (const item of effectiveLineItems) {
            const currentShipped = item.shippedQuantity || 0;
            const sendingNow = selectedItems.find(si => si.name === item.name)?.quantity || 0;
            const totalShippedAfter = currentShipped + sendingNow;
            
            if (totalShippedAfter < item.quantity) {
                isOrderFullyShippedAfterThis = false;
                break;
            }
        }

        const updates: any = { shippedItems: JSON.stringify(selectedItems) };
        
        // Use the newStatus for the optimistic UI update call.
        // We pass 'shippingNote' as the note. The server will prefix it with "Order partially shipped."
        // We do NOT add that prefix here to avoid duplication.
        const newStatus = isOrderFullyShippedAfterThis ? OrderStatus.OUT_FOR_DELIVERY : OrderStatus.PARTIALLY_SHIPPED;

        await updateOrderStatus(orderToShip.id, newStatus, shippingNote, updates, filesToUpload);
        
        closeShipModal();
      } catch (error) {
        console.error("Error confirming shipment:", error);
      }
    }
  };

  const handleItemQuantityChange = (name: string, quantity: number) => {
      setSelectedItems(prev => prev.map(item => item.name === name ? { ...item, quantity: Math.max(1, quantity) } : item));
  };

  const toggleItemSelection = (name: string, remainingQty: number) => {
      setSelectedItems(prev => {
          const exists = prev.find(i => i.name === name);
          if (exists) return prev.filter(i => i.name !== name);
          return [...prev, { name, quantity: remainingQty }];
      });
  };

  const effectiveLineItemsForModal = useMemo(() => getEffectiveLineItems(orderToShip), [orderToShip]);

  return (
    <DashboardLayout role={Role.VENDOR} onLogout={onLogout} showSidebar={false}>
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <h3 className="text-3xl font-bold text-slate-900">Vendor Portal</h3>
      </div>

       <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
            <div className="border-b border-slate-200">
              <button
                onClick={() => { setQueueTab('new'); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'new' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                New Orders <span className="bg-slate-200 text-slate-600 text-xs font-semibold ml-1 px-2 py-0.5 rounded-full">{newOrders.length}</span>
              </button>
              <button
                onClick={() => { setQueueTab('in_progress'); setCurrentPage(1); }}
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'in_progress' ? 'border-b-2 border-purple-500 text-purple-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                In Progress <span className={`text-xs font-semibold ml-1 px-2 py-0.5 rounded-full ${queueTab === 'in_progress' ? 'bg-purple-100 text-purple-600' : 'bg-slate-200 text-slate-600'}`}>{inProgressOrders.length}</span>
              </button>
              <button
                onClick={() => { setQueueTab('shipped'); setCurrentPage(1); }} 
                className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'shipped' ? 'border-b-2 border-green-600 text-green-600' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Shipped <span className={`text-xs font-semibold ml-1 px-2 py-0.5 rounded-full ${queueTab === 'shipped' ? 'bg-green-100 text-green-600' : 'bg-slate-200 text-slate-600'}`}>{shippedOrders.length}</span>
              </button>
            </div>

            <div className="flex items-center space-x-2">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-48 pl-10 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800" />
                </div>
                <select value={filterPriority} onChange={(e) => { setFilterPriority(e.target.value as Priority | 'all'); setCurrentPage(1); }} className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm">
                    <option value="all">All Priorities</option>
                    {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <select value={sortOrder} onChange={(e) => { setSortOrder(e.target.value); }} className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm">
                    <option value="newest">Sort by: Newest</option>
                    <option value="oldest">Sort by: Oldest</option>
                </select>
            </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {paginatedOrders.map(order => (
          <OrderCard
            key={order.id}
            order={order}
            onViewDetails={() => setSelectedOrder(order)}
            hideCustomerInfo={true}
            actions={
              (order.status === OrderStatus.AT_VENDOR || order.status === OrderStatus.PARTIALLY_SHIPPED) && (
                  <div className="w-full">
                       {order.vendorStatus === 'InProgress' ? (
                           <Button size="sm" onClick={() => openShipModal(order)} className="w-full">
                                <TruckIcon className="w-4 h-4 mr-2" />
                                {order.status === OrderStatus.PARTIALLY_SHIPPED ? 'Ship More Items' : 'Mark as Shipped'}
                            </Button>
                       ) : (
                           <Button size="sm" variant="secondary" onClick={() => handleStartProduction(order)} className="w-full">
                                <PencilRulerIcon className="w-4 h-4 mr-2" />
                                Start Production
                           </Button>
                       )}
                  </div>
              )
            }
          />
        ))}
      </div>

      {processedOrders.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border">
              <p className="text-slate-500">No orders found.</p>
          </div>
      )}

      {totalPages > 1 && (
        <div className="flex justify-center items-center mt-8 space-x-4">
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="w-4 h-4 mr-2" /> Previous</Button>
          <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
          <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next <ChevronRightIcon className="w-4 h-4 ml-2" /></Button>
        </div>
      )}

      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} hideCustomerInfo={true} hideAssociatedStaff={true} />
      
      <Modal 
        isOpen={isShipModalOpen} 
        onClose={closeShipModal} 
        title={`Ship Order #${orderToShip?.shopifyOrderNumber || orderToShip?.id}`}
        className="max-w-2xl"
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeShipModal}>Cancel</Button>
            <Button onClick={handleConfirmShip} disabled={isLoading || selectedItems.length === 0}>
                {selectedItems.length < (effectiveLineItemsForModal.filter(li => (li.quantity - (li.shippedQuantity || 0)) > 0).length) ? 'Ship Selected' : 'Confirm Shipment'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          {/* Products List Selection */}
          <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
             <label className="block text-sm font-medium text-slate-700 mb-2">Select Items to Ship</label>
             <div className="space-y-2">
                  {effectiveLineItemsForModal.map((item, idx) => {
                      const shippedQty = item.shippedQuantity || 0;
                      const remainingQty = item.quantity - shippedQty;
                      const isFullyShipped = remainingQty <= 0;
                      
                      const selectedItem = selectedItems.find(i => i.name === item.name);
                      
                      return (
                          <div key={idx} className={`flex items-center p-3 border-b border-slate-200 last:border-0 rounded-sm ${isFullyShipped ? 'bg-slate-100 opacity-70' : 'bg-white'}`}>
                              {!isFullyShipped ? (
                                  <input 
                                    type="checkbox" 
                                    checked={!!selectedItem} 
                                    onChange={() => toggleItemSelection(item.name, remainingQty)}
                                    className="w-4 h-4 rounded text-slate-800 focus:ring-slate-500 border-slate-300 cursor-pointer mr-3"
                                  />
                              ) : (
                                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                              )}
                              
                              <div className="flex-1 text-sm">
                                  <div className="flex items-center gap-2">
                                      <span className={`font-semibold ${isFullyShipped ? 'text-slate-500' : 'text-slate-800'}`}>{item.name}</span>
                                      {isFullyShipped && <span className="text-[10px] uppercase font-bold bg-green-100 text-green-700 px-1.5 rounded">Completed</span>}
                                  </div>
                                  <p className="text-xs text-slate-500 mt-0.5">
                                      Ordered: {item.quantity} | Shipped: {shippedQty} | <span className={remainingQty > 0 ? "font-medium text-slate-700" : ""}>Remaining: {remainingQty > 0 ? remainingQty : 0}</span>
                                  </p>
                              </div>
                              
                              {!isFullyShipped && selectedItem && (
                                  <div className="flex items-center ml-2">
                                      <span className="text-xs font-semibold text-slate-500 mr-2">Qty:</span>
                                      <input 
                                        type="number" 
                                        min="1" 
                                        max={remainingQty} 
                                        value={selectedItem.quantity}
                                        onChange={(e) => handleItemQuantityChange(item.name, parseInt(e.target.value))}
                                        className="w-16 p-1 border rounded text-center text-sm font-medium text-slate-900 focus:ring-slate-500 focus:border-slate-500"
                                      />
                                  </div>
                              )}
                          </div>
                      );
                  })}
              </div>
          </div>

          <p className="text-sm text-slate-600">Please upload the final product image(s) or shipping document(s). This is optional.</p>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Attach Final File(s) (Optional)</label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md bg-slate-50 hover:bg-slate-100 transition-colors">
                <div className="space-y-1 text-center">
                    <FileUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                    <div className="flex text-sm text-slate-600">
                        <label htmlFor="shipment-file-upload" className="relative cursor-pointer bg-white px-2 py-1 rounded-md font-medium text-slate-800 hover:text-slate-600 focus-within:outline-none border shadow-sm">
                            <span>Upload files</span>
                            <input id="shipment-file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={e => setFilesToUpload(e.target.files ? Array.from(e.target.files) : [])} />
                        </label>
                    </div>
                    <p className="text-xs text-slate-500 text-center">Images or PDFs, max 5MB</p>
                </div>
            </div>
            {filesToUpload.length > 0 && (
                <div className="mt-3">
                    <ul className="list-disc list-inside bg-white p-2 rounded-md border border-slate-200 text-xs text-slate-600">
                        {filesToUpload.map((file, index) => (
                            <li key={index} className="truncate">{file.name}</li>
                        ))}
                    </ul>
                </div>
            )}
          </div>
          <div>
            <label htmlFor="shipping-note" className="block text-sm font-medium text-slate-700">Add an optional note for the team:</label>
            <textarea 
                id="shipping-note"
                value={shippingNote}
                onChange={(e) => setShippingNote(e.target.value)}
                className="w-full mt-1 p-3 border border-slate-300 rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 transition-shadow text-sm" 
                placeholder="e.g., Shipped via Express Courier, tracking #XYZ." 
                rows={3}
            />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default VendorPortal;
