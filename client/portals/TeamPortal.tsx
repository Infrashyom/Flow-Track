
import React, { useState, useMemo, useEffect } from 'react';
import { Role, OrderStatus, Order, User, Priority } from '../types';
import DashboardLayout from '../components/shared/DashboardLayout';
import { useAppContext } from '../store/AppContext';
import OrderCard from '../components/shared/OrderCard';
import OrderDetailsModal from '../components/shared/OrderDetailsModal';
import Button from '../components/ui/Button';
import Modal from '../components/ui/Modal';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/Card';
import { CheckCircleIcon, XCircleIcon, SearchIcon, ChevronLeftIcon, ChevronRightIcon, FileUpIcon, ShopifyIcon, UsersIcon } from '../components/icons/Icons';

const ITEMS_PER_PAGE = 12;
const DIGITIZERS_PER_PAGE = 6;
const VENDORS_PER_PAGE = 6;

// Reusable component for displaying a dashboard with filtering, sorting, and pagination
const OrdersDashboard: React.FC<{
  title?: string;
  orders: Order[];
  users: User[];
  onViewDetails: (order: Order) => void;
  renderActions?: (order: Order) => React.ReactNode;
}> = ({ title, orders, users, onViewDetails, renderActions }) => {
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
                (order.shopifyOrderNumber || order.id).toLowerCase().includes(lowercasedTerm) ||
                order.customerName.toLowerCase().includes(lowercasedTerm) ||
                order.productName.toLowerCase().includes(lowercasedTerm)
            );
        }

        switch (sortOrder) {
            case 'newest': filteredOrders.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()); break;
            case 'oldest': filteredOrders.sort((a, b) => new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()); break;
            case 'customer_asc': filteredOrders.sort((a, b) => a.customerName.localeCompare(b.customerName)); break;
            case 'customer_desc': filteredOrders.sort((a, b) => b.customerName.localeCompare(a.customerName)); break;
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
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                {title && <h3 className="text-3xl font-bold">{title}</h3>}
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
                        <option value="customer_asc">Customer (A-Z)</option>
                        <option value="customer_desc">Customer (Z-A)</option>
                        <option value="status">Status</option>
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {paginatedOrders.map(order => {
                    const digitizer = order.digitizerId ? users.find(u => u.id === order.digitizerId) : undefined;
                    return (
                        <OrderCard 
                            key={order.id} 
                            order={order} 
                            onViewDetails={() => onViewDetails(order)} 
                            actions={renderActions ? renderActions(order) : undefined}
                            digitizerName={digitizer?.name}
                        />
                    );
                })}
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

export const IncomingQueueView: React.FC<{ onViewOrderDetails: (order: Order) => void }> = ({ onViewOrderDetails }) => {
    // ... (No changes here, keeping existing code for IncomingQueueView)
    const { orders, users, updateOrderStatus, isLoading, currentUser, addToast } = useAppContext();
    const [rejectModalOpen, setRejectModalOpen] = useState(false);
    const [rejectionNote, setRejectionNote] = useState('');
    const [rejectionFiles, setRejectionFiles] = useState<File[]>([]);
    const [sendToDigitizerModalOpen, setSendToDigitizerModalOpen] = useState(false);
    const [orderToSend, setOrderToSend] = useState<Order | null>(null);
    const [selectedDigitizerId, setSelectedDigitizerId] = useState('');
    const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
    const [filesToAttach, setFilesToAttach] = useState<File[]>([]);
    const [digitizerNote, setDigitizerNote] = useState('');
    const [approveModalOpen, setApproveModalOpen] = useState(false);
    const [orderToApprove, setOrderToApprove] = useState<Order | null>(null);
    const [vendorNote, setVendorNote] = useState('');
    const [selectedVendorId, setSelectedVendorId] = useState('');
    const [localSelectedOrder, setLocalSelectedOrder] = useState<Order | null>(null);

    const digitizers = users.filter(u => u.role === Role.DIGITIZER);
    const vendors = users.filter(u => u.role === Role.VENDOR);

    const openRejectModal = (order: Order) => {
        setLocalSelectedOrder(order);
        setRejectionNote('');
        setRejectionFiles([]);
        setRejectModalOpen(true);
    };

    const handleReject = async () => {
        if (rejectionFiles.length > 10) {
            addToast({ type: 'error', message: 'You cannot upload more than 10 files.' });
            return;
        }
        const oversize = rejectionFiles.find(f => f.size > 5 * 1024 * 1024);
        if (oversize) {
            addToast({ type: 'error', message: 'One or more files exceed the 5MB limit.' });
            return;
        }

        if (localSelectedOrder && rejectionNote) {
            await updateOrderStatus(localSelectedOrder.id, OrderStatus.AT_DIGITIZER, `Team rejected: ${rejectionNote}`, {}, rejectionFiles);
            setRejectModalOpen(false);
            setRejectionNote('');
            setRejectionFiles([]);
            setLocalSelectedOrder(null);
        }
    };

    const openSendToDigitizerModal = (order: Order) => {
        setOrderToSend(order);
        setSelectedDigitizerId('');
        setFilesToAttach([]);
        setDigitizerNote('');
        setPriority(Priority.MEDIUM);
        setSendToDigitizerModalOpen(true);
    };

    const handleConfirmSendToDigitizer = async () => {
        if (orderToSend && selectedDigitizerId && filesToAttach.length > 0) {
             if (filesToAttach.length > 10) {
                addToast({ type: 'error', message: 'You cannot upload more than 10 files.' });
                return;
            }
            const oversize = filesToAttach.find(f => f.size > 5 * 1024 * 1024);
            if (oversize) {
                addToast({ type: 'error', message: 'One or more files exceed the 5MB limit.' });
                return;
            }

            try {
                const note = `Sent to digitizer.${digitizerNote ? ` Note: ${digitizerNote}` : ''}`;
                await updateOrderStatus(orderToSend.id, OrderStatus.AT_DIGITIZER, note, { digitizerId: selectedDigitizerId, priority: priority }, filesToAttach);
    
                setSendToDigitizerModalOpen(false);
                setOrderToSend(null);
                setSelectedDigitizerId('');
                setFilesToAttach([]);
                setDigitizerNote('');

            } catch (error) {
                console.error("Error sending order to digitizer:", error);
            }
        }
    };

    const openApproveModal = (order: Order) => {
        setOrderToApprove(order);
        setApproveModalOpen(true);
        setVendorNote('');
        setSelectedVendorId('');
    };

    const handleApprove = () => {
        if (orderToApprove && selectedVendorId) {
            const selectedVendor = users.find(u => u.id === selectedVendorId);
            const note = `Approved design. Sent to vendor: ${selectedVendor?.name}.${vendorNote ? ` Note for vendor: ${vendorNote}` : ''}`;
            updateOrderStatus(orderToApprove.id, OrderStatus.AT_VENDOR, note, { vendorId: selectedVendorId });
            setApproveModalOpen(false);
            setOrderToApprove(null);
            setVendorNote('');
            setSelectedVendorId('');
        }
    };

    const renderTeamActions = (order: Order) => {
        if (order.status === OrderStatus.AT_TEAM) {
            return <Button size="sm" onClick={() => openSendToDigitizerModal(order)}>Send to Digitizer</Button>;
        }
        if (order.status === OrderStatus.TEAM_REVIEW) {
            return (
                <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700" onClick={() => openRejectModal(order)}><XCircleIcon className="w-4 h-4 mr-2" />Reject</Button>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => openApproveModal(order)}><CheckCircleIcon className="w-4 h-4 mr-2" />Approve</Button>
                </div>
            );
        }
        return null;
    };

    const teamOrders = orders.filter(o => [OrderStatus.AT_TEAM, OrderStatus.TEAM_REVIEW].includes(o.status));

    return (
        <>
            <OrdersDashboard title="Incoming Queue" orders={teamOrders} users={users} onViewDetails={onViewOrderDetails} renderActions={renderTeamActions} />
            <Modal isOpen={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title={`Reject Order ${localSelectedOrder?.shopifyOrderNumber || localSelectedOrder?.id}`} footer={<div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setRejectModalOpen(false)}>Cancel</Button><Button variant="destructive" onClick={handleReject} disabled={!rejectionNote || isLoading}>Confirm Rejection</Button></div>}>
                <div className="space-y-4">
                    <div>
                        <p className="text-sm text-slate-600 mb-2">Please provide a reason for rejecting the design. This will be sent back to the digitizer.</p>
                        <textarea value={rejectionNote} onChange={(e) => setRejectionNote(e.target.value)} className="w-full p-2 border rounded-md bg-slate-50 border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-shadow" placeholder="e.g., Colors are incorrect..." rows={3} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Attach Reference File(s) (Optional)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <FileUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="rejection-file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-slate-800 hover:text-slate-600 focus-within:outline-none">
                                        <span>Upload files</span>
                                        <input id="rejection-file-upload" name="rejection-file-upload" type="file" multiple className="sr-only" onChange={e => setRejectionFiles(e.target.files ? Array.from(e.target.files) : [])} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">Max 10 files, 5MB each.</p>
                            </div>
                        </div>
                         {rejectionFiles.length > 0 && (
                            <div className="mt-3 text-sm">
                                <h4 className="font-medium text-slate-800">Selected files:</h4>
                                <ul className="mt-1 list-disc list-inside bg-slate-50 p-2 rounded-md border max-h-28 overflow-y-auto">
                                    {rejectionFiles.map((file, index) => (
                                        <li key={index} className="text-slate-600 truncate">
                                            {file.name} {(file.size > 5 * 1024 * 1024) && <span className="text-red-500 font-bold">(Too Large)</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
            <Modal isOpen={sendToDigitizerModalOpen} onClose={() => setSendToDigitizerModalOpen(false)} title={`Send Order ${orderToSend?.shopifyOrderNumber || orderToSend?.id} to Digitizer`} footer={<div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setSendToDigitizerModalOpen(false)}>Cancel</Button><Button onClick={handleConfirmSendToDigitizer} disabled={!selectedDigitizerId || filesToAttach.length === 0 || isLoading}>Confirm & Send</Button></div>}>
                 {/* ... Modal content similar to original ... */}
                 <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Assign to Digitizer</label>
                        <select value={selectedDigitizerId} onChange={e => setSelectedDigitizerId(e.target.value)} className="w-full p-2 border rounded-md bg-white"><option value="" disabled>Select a digitizer...</option>{digitizers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-2">Set Priority</label>
                        <div className="flex items-center justify-around p-2 bg-slate-50 rounded-lg border">
                           {Object.values(Priority).map(p => (
                                <label key={p} className="flex items-center space-x-2 cursor-pointer text-sm">
                                    <input type="radio" name="priority" value={p} checked={priority === p} onChange={() => setPriority(p)} className="h-4 w-4 text-slate-800 focus:ring-slate-600"/>
                                    <span>{p}</span>
                                </label>
                           ))}
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Attach File(s) (Required)</label>
                        <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                            <div className="space-y-1 text-center">
                                <FileUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                                <div className="flex text-sm text-slate-600">
                                    <label htmlFor="file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-slate-800 hover:text-slate-600 focus-within:outline-none">
                                        <span>Upload files</span>
                                        <input id="file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={e => setFilesToAttach(e.target.files ? Array.from(e.target.files) : [])} />
                                    </label>
                                </div>
                                <p className="text-xs text-slate-500">Max 10 files, 5MB each.</p>
                            </div>
                        </div>
                         {filesToAttach.length > 0 && (
                            <div className="mt-3 text-sm">
                                <h4 className="font-medium text-slate-800">Selected files:</h4>
                                <ul className="mt-1 list-disc list-inside bg-slate-50 p-2 rounded-md border max-h-28 overflow-y-auto">
                                    {filesToAttach.map((file, index) => (
                                        <li key={index} className="text-slate-600 truncate">
                                            {file.name} {(file.size > 5 * 1024 * 1024) && <span className="text-red-500 font-bold">(Too Large)</span>}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div>
                        <label htmlFor="digitizer-note" className="block text-sm font-medium text-slate-700">Add an optional note for the digitizer:</label>
                        <textarea 
                            id="digitizer-note"
                            value={digitizerNote}
                            onChange={(e) => setDigitizerNote(e.target.value)}
                            className="w-full mt-1 p-2 border rounded-md bg-slate-50 border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-shadow" 
                            placeholder="e.g., Please pay attention to the fine details on the logo." 
                            rows={3}
                        />
                    </div>
                </div>
            </Modal>
            <Modal isOpen={approveModalOpen} onClose={() => setApproveModalOpen(false)} title={`Confirm Approval: ${orderToApprove?.shopifyOrderNumber || orderToApprove?.id}`} footer={<div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setApproveModalOpen(false)}>Cancel</Button><Button onClick={handleApprove} disabled={!selectedVendorId}>Confirm & Send to Vendor</Button></div>}>
                 {/* ... Modal content similar to original ... */}
                 <div className="space-y-4">
                    <p>You are about to approve this order. Please select a vendor to send it to for production.</p>
                    {orderToApprove && (
                        <div className="p-3 text-sm bg-slate-50 rounded-md border">
                            <p><strong>Order ID:</strong> {orderToApprove.shopifyOrderNumber || orderToApprove.id}</p>
                            <p><strong>Customer:</strong> {orderToApprove.customerName}</p>
                            <div>
                                <strong>Products:</strong>
                                <ul className="list-disc list-inside pl-2 mt-1">
                                    {orderToApprove.productName.split(', ').map((p, i) => (
                                        <li key={i}>{p}</li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}
                    <div>
                        <label htmlFor="vendor-select" className="block text-sm font-medium text-slate-700">Assign to Vendor (Required)</label>
                        <select id="vendor-select" value={selectedVendorId} onChange={e => setSelectedVendorId(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-white focus:outline-none focus:ring-2 focus:ring-slate-800"><option value="" disabled>Select a vendor...</option>{vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
                    </div>
                    <div>
                        <label htmlFor="vendor-note" className="block text-sm font-medium text-slate-700">Add an optional note for the vendor:</label>
                        <textarea id="vendor-note" value={vendorNote} onChange={(e) => setVendorNote(e.target.value)} className="w-full mt-1 p-2 border rounded-md bg-slate-50 border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-shadow" placeholder="e.g., Please use the updated logo." rows={3} />
                    </div>
                </div>
            </Modal>
        </>
    );
};

const DigitizerRecordsView: React.FC<{ onViewOrderDetails: (order: Order) => void }> = ({ onViewOrderDetails }) => {
    // ... (No changes here, keeping existing code for DigitizerRecordsView)
    const { users, orders } = useAppContext();
    const [viewingDigitizer, setViewingDigitizer] = useState<User & { assignedOrders: Order[] } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const digitizers = users.filter(u => u.role === Role.DIGITIZER);

    const digitizerStats = digitizers.map(digitizer => {
        const assignedOrders = orders.filter(o => o.digitizerId === digitizer.id);
        const active = assignedOrders.filter(o => o.status === OrderStatus.AT_DIGITIZER).length;
        const inReview = assignedOrders.filter(o => o.status === OrderStatus.TEAM_REVIEW).length;
        const completed = assignedOrders.filter(o => [OrderStatus.AT_VENDOR, OrderStatus.OUT_FOR_DELIVERY].includes(o.status)).length;

        return {
            ...digitizer,
            total: assignedOrders.length,
            active,
            inReview,
            completed,
            assignedOrders
        };
    });

    const totalPages = Math.ceil(digitizerStats.length / DIGITIZERS_PER_PAGE);
    const paginatedDigitizers = digitizerStats.slice(
        (currentPage - 1) * DIGITIZERS_PER_PAGE,
        currentPage * DIGITIZERS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold">Digitizer Records</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedDigitizers.map(stat => (
                    <Card key={stat.id}>
                        <CardHeader>
                            <CardTitle>{stat.name}</CardTitle>
                            <CardDescription>{stat.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div className="col-span-2 text-base font-semibold">
                                Total Assigned: <span className="font-bold text-lg ml-1 text-slate-800">{stat.total}</span>
                            </div>
                            <div className="flex items-center"><span className="h-2 w-2 rounded-full bg-orange-500 mr-2"></span>Active Queue: <span className="font-semibold ml-auto">{stat.active}</span></div>
                            <div className="flex items-center"><span className="h-2 w-2 rounded-full bg-yellow-500 mr-2"></span>Pending Review: <span className="font-semibold ml-auto">{stat.inReview}</span></div>
                            <div className="flex items-center col-span-2"><span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>Completed: <span className="font-semibold ml-auto">{stat.completed}</span></div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => setViewingDigitizer(stat)}>View Assigned Orders</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            
            {digitizerStats.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                    <p className="text-slate-500">No digitizers found or no orders have been assigned yet.</p>
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

            <Modal isOpen={!!viewingDigitizer} onClose={() => setViewingDigitizer(null)} title={`Orders Assigned to ${viewingDigitizer?.name}`} className="max-w-6xl">
                {viewingDigitizer && (
                    <OrdersDashboard
                        orders={viewingDigitizer.assignedOrders}
                        users={users}
                        onViewDetails={onViewOrderDetails}
                    />
                )}
            </Modal>
        </>
    );
};

const VendorRecordsView: React.FC<{ onViewOrderDetails: (order: Order) => void }> = ({ onViewOrderDetails }) => {
    // ... (No changes here, keeping existing code for VendorRecordsView)
    const { users, orders } = useAppContext();
    const [viewingVendor, setViewingVendor] = useState<User & { assignedOrders: Order[] } | null>(null);
    const [currentPage, setCurrentPage] = useState(1);

    const vendors = users.filter(u => u.role === Role.VENDOR);

    const vendorStats = vendors.map(vendor => {
        const assignedOrders = orders.filter(o => o.vendorId === vendor.id);
        const inProduction = assignedOrders.filter(o => o.status === OrderStatus.AT_VENDOR).length;
        const shipped = assignedOrders.filter(o => o.status === OrderStatus.OUT_FOR_DELIVERY).length;

        return {
            ...vendor,
            total: assignedOrders.length,
            inProduction,
            shipped,
            assignedOrders
        };
    });

    const totalPages = Math.ceil(vendorStats.length / VENDORS_PER_PAGE);
    const paginatedVendors = vendorStats.slice(
        (currentPage - 1) * VENDORS_PER_PAGE,
        currentPage * VENDORS_PER_PAGE
    );

    const handlePageChange = (newPage: number) => {
        if (newPage > 0 && newPage <= totalPages) {
            setCurrentPage(newPage);
        }
    };

    return (
        <>
            <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
                <h3 className="text-3xl font-bold">Vendor Records</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {paginatedVendors.map(stat => (
                    <Card key={stat.id}>
                        <CardHeader>
                            <CardTitle>{stat.name}</CardTitle>
                            <CardDescription>{stat.email}</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div className="col-span-2 text-base font-semibold">
                                Total Assigned: <span className="font-bold text-lg ml-1 text-slate-800">{stat.total}</span>
                            </div>
                            <div className="flex items-center"><span className="h-2 w-2 rounded-full bg-purple-500 mr-2"></span>In Production: <span className="font-semibold ml-auto">{stat.inProduction}</span></div>
                            <div className="flex items-center"><span className="h-2 w-2 rounded-full bg-green-500 mr-2"></span>Shipped: <span className="font-semibold ml-auto">{stat.shipped}</span></div>
                        </CardContent>
                        <CardFooter>
                            <Button variant="outline" className="w-full" onClick={() => setViewingVendor(stat)}>View Assigned Orders</Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
            
            {vendorStats.length === 0 && (
                <div className="text-center py-12 bg-white rounded-lg shadow-sm border">
                    <p className="text-slate-500">No vendors found or no orders have been assigned yet.</p>
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

            <Modal isOpen={!!viewingVendor} onClose={() => setViewingVendor(null)} title={`Orders Assigned to ${viewingVendor?.name}`} className="max-w-6xl">
                {viewingVendor && (
                    <OrdersDashboard
                        orders={viewingVendor.assignedOrders}
                        users={users}
                        onViewDetails={onViewOrderDetails}
                    />
                )}
            </Modal>
        </>
    );
};

export const ShopifySyncModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
    // ... (No changes here, keeping existing code for ShopifySyncModal)
    const { importShopifyOrders, isLoading } = useAppContext();
    const [syncMessage, setSyncMessage] = useState('');

    const handleSync = async () => {
        setSyncMessage('Syncing with Shopify, please wait...');
        const result = await importShopifyOrders();
        setSyncMessage(`${result.message}`);
        
        // Close modal automatically after a few seconds
        setTimeout(() => {
            onClose();
        }, 3000);
    };
    
    useEffect(() => {
        // Reset message when modal opens
        if (isOpen) {
            setSyncMessage('');
        }
    }, [isOpen]);

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Sync with Shopify">
            <div className="text-center space-y-4">
                <ShopifyIcon className="w-16 h-16 mx-auto text-slate-500" />
                <CardTitle>Import New Orders</CardTitle>
                <CardDescription className="!mt-2 max-w-sm mx-auto">
                    Fetch your latest paid, unfulfilled orders from your Shopify store. This process can sync up to 250 orders at a time.
                </CardDescription>

                {syncMessage && (
                    <div className="!mt-4 p-3 text-sm rounded-md bg-slate-100 text-slate-700">
                        {syncMessage}
                    </div>
                )}

                <div className="!mt-6">
                    <Button onClick={handleSync} disabled={isLoading} className="w-full">
                        {isLoading ? 'Syncing...' : 'Start Sync'}
                    </Button>
                </div>
            </div>
        </Modal>
    );
};

const TeamPortal: React.FC<{ onLogout: () => void }> = ({ onLogout }) => {
  const { orders, users, updateOrderStatus, isLoading } = useAppContext();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [activeTab, setActiveTab] = useState('incoming_queue');
  const [isSyncModalOpen, setIsSyncModalOpen] = useState(false);
  
  // Reassign Modal State
  const [reassignModalOpen, setReassignModalOpen] = useState(false);
  const [orderToReassign, setOrderToReassign] = useState<Order | null>(null);
  const [newDigitizerId, setNewDigitizerId] = useState('');

  const digitizers = users.filter(u => u.role === Role.DIGITIZER);

  const tabCounts = useMemo(() => ({
    incoming_queue: orders.filter(o => [OrderStatus.AT_TEAM, OrderStatus.TEAM_REVIEW].includes(o.status)).length,
    // Removed PARTIALLY_SHIPPED from track_progress to avoid duplication, as users want to see it in "Out for Delivery"
    track_progress: orders.filter(o => [OrderStatus.AT_DIGITIZER, OrderStatus.AT_VENDOR].includes(o.status)).length,
    // Added PARTIALLY_SHIPPED here
    out_for_delivery: orders.filter(o => [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PARTIALLY_SHIPPED].includes(o.status)).length
  }), [orders]);
  
  const openReassignModal = (order: Order) => {
      setOrderToReassign(order);
      setNewDigitizerId('');
      setReassignModalOpen(true);
  };

  const handleReassign = async () => {
    if (orderToReassign && newDigitizerId) {
        const newDigitizer = users.find(u => u.id === newDigitizerId);
        const oldDigitizer = users.find(u => u.id === orderToReassign.digitizerId);
        
        const note = `Reassigned from ${oldDigitizer?.name || 'Unknown'} to ${newDigitizer?.name || 'Unknown'} by Team.`;
        
        await updateOrderStatus(orderToReassign.id, OrderStatus.AT_DIGITIZER, note, { digitizerId: newDigitizerId });
        
        setReassignModalOpen(false);
        setOrderToReassign(null);
        setNewDigitizerId('');
    }
  };

  const renderProgressActions = (order: Order) => {
      if (order.status === OrderStatus.AT_DIGITIZER) {
          return (
              <Button size="sm" variant="outline" onClick={() => openReassignModal(order)}>
                  <UsersIcon className="w-4 h-4 mr-2" />
                  Switch Digitizer
              </Button>
          )
      }
      return null;
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'track_progress': {
        const ordersInProgress = orders.filter(o =>
          [OrderStatus.AT_DIGITIZER, OrderStatus.AT_VENDOR].includes(o.status)
        );
        return (
          <OrdersDashboard
            title="Track Progress"
            orders={ordersInProgress}
            users={users}
            onViewDetails={setSelectedOrder}
            renderActions={renderProgressActions}
          />
        );
      }
      case 'out_for_delivery': {
        // Included PARTIALLY_SHIPPED here
        const shippedOrders = orders.filter(o => [OrderStatus.OUT_FOR_DELIVERY, OrderStatus.PARTIALLY_SHIPPED].includes(o.status));
        return (
          <OrdersDashboard
            title="Out for Delivery"
            orders={shippedOrders}
            users={users}
            onViewDetails={setSelectedOrder}
          />
        );
      }
      case 'digitizer_records':
        return <DigitizerRecordsView onViewOrderDetails={setSelectedOrder} />;
      case 'vendor_records':
        return <VendorRecordsView onViewOrderDetails={setSelectedOrder} />;
      default: // 'incoming_queue'
        return <IncomingQueueView onViewOrderDetails={setSelectedOrder} />;
    }
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
  
  return (
    <DashboardLayout role={Role.TEAM} onLogout={onLogout} activeTab={activeTab} onTabChange={setActiveTab} headerContent={headerContent} tabCounts={tabCounts}>
      {renderContent()}

      <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      <ShopifySyncModal isOpen={isSyncModalOpen} onClose={() => setIsSyncModalOpen(false)} />
      
      <Modal 
        isOpen={reassignModalOpen} 
        onClose={() => setReassignModalOpen(false)} 
        title={`Reassign Order ${orderToReassign?.shopifyOrderNumber || orderToReassign?.id}`}
        footer={
            <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setReassignModalOpen(false)}>Cancel</Button>
                <Button onClick={handleReassign} disabled={!newDigitizerId || isLoading}>Confirm Switch</Button>
            </div>
        }
      >
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                This order is currently with <strong>{users.find(u => u.id === orderToReassign?.digitizerId)?.name}</strong>. 
                Select a new digitizer to take over this order.
            </p>
            <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Select New Digitizer</label>
                <select 
                    value={newDigitizerId} 
                    onChange={e => setNewDigitizerId(e.target.value)} 
                    className="w-full p-2 border rounded-md bg-white"
                >
                    <option value="" disabled>Select a digitizer...</option>
                    {digitizers
                        .filter(d => d.id !== orderToReassign?.digitizerId) // Exclude current digitizer
                        .map(d => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                        ))
                    }
                </select>
            </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
};

export default TeamPortal;
