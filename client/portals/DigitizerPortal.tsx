
import React, { useState, useMemo, useEffect } from 'react';
import { Role, OrderStatus, Order, User, Priority } from '../types';
import DashboardLayout from '../components/shared/DashboardLayout';
import { useAppContext } from '../store/AppContext';
import OrderCard from '../components/shared/OrderCard';
import OrderDetailsModal from '../components/shared/OrderDetailsModal';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card';
import { FileUpIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, PackageIcon, PencilRulerIcon, ClipboardListIcon, CheckCircleIcon } from '../components/icons/Icons';

const ITEMS_PER_PAGE = 12;

// Copied from TeamPortal.tsx to be used for the new My Records view
const OrdersDashboard: React.FC<{
  title?: string;
  orders: Order[];
  onViewDetails: (order: Order) => void;
  renderActions?: (order: Order) => React.ReactNode;
}> = ({ title, orders, onViewDetails, renderActions }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState<OrderStatus | 'all'>('all');
    const [filterPriority, setFilterPriority] = useState<Priority | 'all'>('all');
    const [sortOrder, setSortOrder] = useState('newest');
    const [currentPage, setCurrentPage] = useState(1);

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
                order.id.toLowerCase().includes(lowercasedTerm) ||
                (order.shopifyOrderNumber && order.shopifyOrderNumber.toLowerCase().includes(lowercasedTerm)) ||
                (order.customerName && order.customerName.toLowerCase().includes(lowercasedTerm)) ||
                order.productName.toLowerCase().includes(lowercasedTerm)
            );
        }

        switch (sortOrder) {
            case 'newest': filteredOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break;
            case 'oldest': filteredOrders.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()); break;
            case 'status': filteredOrders.sort((a, b) => a.status.localeCompare(b.status)); break;
        }

        return filteredOrders;
    }, [orders, searchTerm, filterStatus, sortOrder, filterPriority]);

    const totalPages = Math.ceil(processedOrders.length / ITEMS_PER_PAGE);
    const paginatedOrders = processedOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
    
    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) setCurrentPage(newPage);
    };

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6 mt-8">
                {title && <h3 className="text-2xl font-bold">{title}</h3>}
                <div className={`flex items-center gap-2 flex-wrap ${!title ? 'w-full' : ''} justify-end`}>
                    <div className="relative">
                      <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                      <input type="text" placeholder="Search..." value={searchTerm} onChange={e => { setSearchTerm(e.target.value); setCurrentPage(1); }} className="w-full sm:w-48 pl-10 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800" />
                    </div>
                    <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value as OrderStatus | 'all'); setCurrentPage(1); }} className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm">
                        <option value="all">All Statuses</option>
                        {Object.values(OrderStatus).map(status => <option key={status} value={status}>{status}</option>)}
                    </select>
                    <select value={filterPriority} onChange={e => { setFilterPriority(e.target.value as Priority | 'all'); setCurrentPage(1); }} className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm">
                        <option value="all">All Priorities</option>
                        {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    <select value={sortOrder} onChange={e => { setSortOrder(e.target.value); setCurrentPage(1); }} className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm">
                        <option value="newest">Sort by: Newest</option>
                        <option value="oldest">Sort by: Oldest</option>
                        <option value="status">Status</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedOrders.map(order => (
                    <OrderCard key={order.id} order={order} onViewDetails={() => onViewDetails(order)} actions={renderActions ? renderActions(order) : undefined} hideCustomerInfo={true} />
                ))}
            </div>

            {processedOrders.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border">
                    <p className="text-slate-500">No orders found matching your criteria.</p>
                </div>
            )}

            {totalPages > 1 && (
                <div className="flex justify-center items-center mt-8 space-x-4">
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeftIcon className="w-4 h-4 mr-2" />Previous</Button>
                    <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next<ChevronRightIcon className="w-4 h-4 ml-2" /></Button>
                </div>
            )}
        </>
    );
};


// Copied from AdminPortal.tsx
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

const DigitizerPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { orders, currentUser, updateOrderStatus, isLoading, addToast } = useAppContext();
  
  // Modal and data state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [orderToUploadFor, setOrderToUploadFor] = useState<Order | null>(null);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [optionalNote, setOptionalNote] = useState('');

  // UI state
  const [mainTab, setMainTab] = useState<'queue' | 'records'>('queue');
  const [queueTab, setQueueTab] = useState<'new' | 'in_progress' | 'rejected'>('new');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('newest');
  const [currentPage, setCurrentPage] = useState(1);
  
  const CURRENT_DIGITIZER_ID = currentUser?.id;

  useEffect(() => {
    setCurrentPage(1);
  }, [queueTab, mainTab]);

  // Logic for Queue View
  const { newOrders, inProgressOrders, rejectedOrders } = useMemo(() => {
    if (!CURRENT_DIGITIZER_ID) return { newOrders: [], inProgressOrders: [], rejectedOrders: [] };
    const allDigitizerOrders = orders.filter(o => o.status === OrderStatus.AT_DIGITIZER && o.digitizerId === CURRENT_DIGITIZER_ID);
    const rejected: Order[] = [];
    const fresh: Order[] = [];
    const inProgress: Order[] = [];

    for (const order of allDigitizerOrders) {
        // If local status is InProgress, put it there regardless of rejection history
        if (order.digitizerStatus === 'InProgress') {
            inProgress.push(order);
            continue;
        }

        // Check for rejection (legacy logic for now, could be improved with dedicated status)
        let isRejected = false;
        if (order.notes.length > 0) {
            const lastNote = order.notes[order.notes.length - 1];
            const noteContent = typeof lastNote === 'string' ? lastNote : lastNote.content;
            if (noteContent && noteContent.includes('Team rejected:')) {
                isRejected = true;
            }
        }

        if (isRejected) {
            rejected.push(order);
        } else {
            fresh.push(order);
        }
    }
    return { newOrders: fresh, inProgressOrders: inProgress, rejectedOrders: rejected };
  }, [orders, CURRENT_DIGITIZER_ID]);

  const ordersToShowInQueue = useMemo(() => {
      switch (queueTab) {
          case 'in_progress': return inProgressOrders;
          case 'rejected': return rejectedOrders;
          case 'new': default: return newOrders;
      }
  }, [queueTab, newOrders, inProgressOrders, rejectedOrders]);

  const processedQueueOrders = useMemo(() => {
    let filteredOrders = [...ordersToShowInQueue];

    if (searchTerm.trim() !== '') {
      const lowercasedTerm = searchTerm.toLowerCase().trim();
      filteredOrders = filteredOrders.filter(order =>
        order.id.toLowerCase().includes(lowercasedTerm) ||
        (order.shopifyOrderNumber && order.shopifyOrderNumber.toLowerCase().includes(lowercasedTerm)) ||
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
    }

    return filteredOrders;
  }, [ordersToShowInQueue, searchTerm, sortOrder]);

  const totalPages = Math.ceil(processedQueueOrders.length / ITEMS_PER_PAGE);
  const paginatedOrders = processedQueueOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleStartWorking = async (order: Order) => {
      try {
          // Just update local status to InProgress, keep global status same
          await updateOrderStatus(order.id, order.status, undefined, { digitizerStatus: 'InProgress' });
      } catch (error) {
          console.error("Failed to start working:", error);
      }
  };

  // Logic for My Records View
  const { assignedOrders, stats } = useMemo(() => {
    if (!currentUser) return { assignedOrders: [], stats: { total: 0, active: 0, inReview: 0, completed: 0 } };
    
    const assignedOrders = orders.filter(o => o.digitizerId === currentUser.id);
    const active = assignedOrders.filter(o => o.status === OrderStatus.AT_DIGITIZER).length;
    const inReview = assignedOrders.filter(o => o.status === OrderStatus.TEAM_REVIEW).length;
    const completed = assignedOrders.filter(o => [OrderStatus.AT_VENDOR, OrderStatus.OUT_FOR_DELIVERY].includes(o.status)).length;

    const stats = {
        total: assignedOrders.length,
        active,
        inReview,
        completed
    };
    return { assignedOrders, stats };
  }, [orders, currentUser]);


  const openUploadModal = (order: Order) => {
    setOrderToUploadFor(order);
    setIsUploadModalOpen(true);
  };
  
  const closeUploadModal = () => {
    setIsUploadModalOpen(false);
    setOrderToUploadFor(null);
    setFilesToUpload([]);
    setOptionalNote('');
  }

  const handleConfirmUpload = async () => {
    if (orderToUploadFor && filesToUpload.length > 0) {
      // Validate files before sending
      if (filesToUpload.length > 10) {
          addToast({ type: 'error', message: 'You cannot upload more than 10 files at once.' });
          return;
      }
      const oversizeFile = filesToUpload.find(f => f.size > 5 * 1024 * 1024);
      if (oversizeFile) {
          addToast({ type: 'error', message: `File ${oversizeFile.name} exceeds the 5MB limit.` });
          return;
      }

      try {
        const note = `Digitizer: Design complete.${optionalNote ? ` Note: ${optionalNote}` : ''}`;
        await updateOrderStatus(orderToUploadFor.id, OrderStatus.TEAM_REVIEW, note, {}, filesToUpload);

        closeUploadModal();
      } catch (error) {
        console.error("Error confirming upload:", error);
        // Error toast is handled by context's handleApiCall
      }
    }
  };

  const queueCount = newOrders.length + inProgressOrders.length + rejectedOrders.length;
  const recordsCount = assignedOrders.length;

  return (
    <DashboardLayout role={Role.DIGITIZER} onLogout={onLogout} showSidebar={false}>
       <div className="flex items-center justify-between gap-4 mb-6">
          <h3 className="text-3xl font-bold">Digitizer Portal</h3>
          <div className="border-b border-slate-200">
            <button
              onClick={() => setMainTab('queue')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                mainTab === 'queue' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Queue
              <span className="ml-2 bg-slate-200 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{queueCount}</span>
            </button>
            <button
              onClick={() => setMainTab('records')}
              className={`px-4 py-2 text-sm font-medium transition-colors focus:outline-none ${
                mainTab === 'records' ? 'border-b-2 border-slate-800 text-slate-800' : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              My Records
              <span className="ml-2 bg-slate-200 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded-full">{recordsCount}</span>
            </button>
          </div>
       </div>
      
      {mainTab === 'queue' && (
        <>
          <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
             {/* ... Filters and Queue Tabs ... */}
            <div className="border-b border-slate-200">
              <button
                onClick={() => setQueueTab('new')}
                className={`px-3 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'new'
                    ? 'border-b-2 border-slate-800 text-slate-800'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                New Orders <span className="bg-slate-200 text-slate-600 text-xs font-semibold ml-1 px-2 py-0.5 rounded-full">{newOrders.length}</span>
              </button>
              <button
                onClick={() => setQueueTab('in_progress')}
                className={`px-3 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'in_progress'
                    ? 'border-b-2 border-orange-500 text-orange-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                In Progress <span className={`text-xs font-semibold ml-1 px-2 py-0.5 rounded-full ${queueTab === 'in_progress' ? 'bg-orange-100 text-orange-600' : 'bg-slate-200 text-slate-600'}`}>{inProgressOrders.length}</span>
              </button>
              <button
                onClick={() => setQueueTab('rejected')}
                className={`px-3 py-2 text-sm font-medium transition-colors focus:outline-none ${
                  queueTab === 'rejected'
                    ? 'border-b-2 border-red-600 text-red-600'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                Rejected <span className={`text-xs font-semibold ml-1 px-2 py-0.5 rounded-full ${queueTab === 'rejected' ? 'bg-red-100 text-red-600' : 'bg-slate-200 text-slate-600'}`}>{rejectedOrders.length}</span>
              </button>
            </div>
            <div className="flex items-center space-x-2">
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search orders..."
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                        className="w-full sm:w-48 pl-10 pr-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"
                        aria-label="Search orders"
                    />
                </div>
                <select
                    value={sortOrder}
                    onChange={(e) => { setSortOrder(e.target.value); setCurrentPage(1); }}
                    className="px-4 py-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800 text-sm"
                    aria-label="Sort orders"
                >
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
                hideDates={true}
                hideStatus={true}
                actions={
                  <div className="flex space-x-2 w-full justify-between">
                     {/* If order is 'In Progress', show upload. Else show 'Start Working'. */}
                     {queueTab === 'in_progress' ? (
                        <Button size="sm" onClick={() => openUploadModal(order)} className="w-full">
                            <FileUpIcon className="w-4 h-4 mr-2" />
                            Upload
                        </Button>
                     ) : (
                        <Button size="sm" variant="secondary" onClick={() => handleStartWorking(order)} className="w-full">
                            <PencilRulerIcon className="w-4 h-4 mr-2" />
                            Start Working
                        </Button>
                     )}
                  </div>
                }
              />
            ))}
          </div>
          
          {processedQueueOrders.length === 0 && (
              <div className="col-span-full text-center py-12 bg-white rounded-lg shadow-sm border">
                  <p className="text-slate-500">
                    {queueTab === 'new' ? 'No new orders in your queue.' : 
                     queueTab === 'in_progress' ? 'You have no orders in progress.' : 
                     'No rejected orders found.'}
                  </p>
              </div>
          )}
          
          {totalPages > 1 && (
            <div className="flex justify-center items-center mt-8 space-x-4">
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}>
                <ChevronLeftIcon className="w-4 h-4 mr-2" /> Previous
              </Button>
              <span className="text-sm font-medium">Page {currentPage} of {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>
                Next <ChevronRightIcon className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
        </>
      )}

      {mainTab === 'records' && (
        <div>
            {currentUser ? (
                <>
                    <Card className="mb-6">
                        <CardHeader>
                            <CardTitle className="text-2xl">{currentUser.name}</CardTitle>
                            <CardDescription>{currentUser.email}</CardDescription>
                        </CardHeader>
                    </Card>
                    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                        <StatCard title="Total Assigned" value={stats.total ?? 0} icon={PackageIcon} />
                        <StatCard title="Active Queue" value={stats.active ?? 0} icon={PencilRulerIcon} />
                        <StatCard title="Pending Review" value={stats.inReview ?? 0} icon={ClipboardListIcon} />
                        <StatCard title="Completed" value={stats.completed ?? 0} icon={CheckCircleIcon} />
                    </div>

                    <OrdersDashboard title="All Assigned Orders" orders={assignedOrders} onViewDetails={setSelectedOrder} />
                </>
            ) : (
                <p>Could not find digitizer details.</p>
            )}
        </div>
      )}

      <OrderDetailsModal 
        order={selectedOrder} 
        onClose={() => setSelectedOrder(null)} 
        hideCustomerInfo={true}
        hideDates={true} 
      />
      
      <Modal 
        isOpen={isUploadModalOpen} 
        onClose={closeUploadModal} 
        title={`Upload Design for ${orderToUploadFor?.shopifyOrderNumber || orderToUploadFor?.id}`}
        footer={
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={closeUploadModal}>Cancel</Button>
            <Button onClick={handleConfirmUpload} disabled={filesToUpload.length === 0 || isLoading}>Confirm & Send</Button>
          </div>
        }
      >
        <div className="space-y-4">
          <p>Please upload the completed design file(s). This is required to send the order back to the team for review.</p>
          <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Attach File(s) (Required)</label>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <FileUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                            <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-slate-800 hover:text-slate-600 focus-within:outline-none">
                                <span>Upload files</span>
                                <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={e => setFilesToUpload(e.target.files ? Array.from(e.target.files) : [])} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500">Select one or more files. Max 10 files, 5MB each.</p>
                    </div>
                </div>
                 {filesToUpload.length > 0 && (
                    <div className="mt-3 text-sm">
                        <h4 className="font-medium text-slate-800">Selected files:</h4>
                        <ul className="mt-1 list-disc list-inside bg-slate-50 p-2 rounded-md border max-h-28 overflow-y-auto">
                            {filesToUpload.map((file, index) => (
                                <li key={index} className="text-slate-600 truncate">
                                    {file.name} {(file.size > 5 * 1024 * 1024) && <span className="text-red-500 font-bold">(Too Large)</span>}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
          </div>
          <div>
              <label htmlFor="digitizer-note" className="block text-sm font-medium text-slate-700">Add an optional note for the team:</label>
              <textarea 
                  id="digitizer-note"
                  value={optionalNote}
                  onChange={(e) => setOptionalNote(e.target.value)}
                  className="w-full mt-1 p-2 border rounded-md bg-slate-50 border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-shadow" 
                  placeholder="e.g., Check the stitching on the left side." 
                  rows={3}
              />
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default DigitizerPortal;
