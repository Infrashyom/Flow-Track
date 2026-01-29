
import React, { useState } from 'react';
import { Order, Attachment, Role, Note, Priority, LineItem, OrderStatus } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { DownloadIcon, FileIcon, TrashIcon, EditIcon, FileUpIcon, PlusIcon, CheckCircleIcon } from '../icons/Icons';
import { useAppContext } from '../../store/AppContext';

interface OrderDetailsModalProps {
  order: Order | null;
  onClose: () => void;
  hideCustomerInfo?: boolean;
  hideDates?: boolean;
  hideAssociatedStaff?: boolean;
}

const isImage = (fileName: string) => {
    return /\.(jpg|jpeg|png|gif|svg|webp)$/i.test(fileName);
};

const AttachmentItem: React.FC<{ 
    attachment: Attachment; 
    onDelete?: (attachment: Attachment) => void;
    canDelete: boolean;
}> = ({ attachment, onDelete, canDelete }) => {
    const { addToast } = useAppContext();
    const [isDownloading, setIsDownloading] = useState(false);

    const handleDownload = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (isDownloading) return;

        try {
            setIsDownloading(true);
            const token = localStorage.getItem('flowtrack_token');
            const response = await fetch(`/api/upload/download?url=${encodeURIComponent(attachment.url)}&filename=${encodeURIComponent(attachment.name)}`, {
                method: 'GET',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Download failed');
            }

            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = attachment.name;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            addToast({ type: 'success', message: 'Download started' });
        } catch (error) {
            console.error('Download error:', error);
            addToast({ type: 'error', message: 'Failed to download file. Please try again.' });
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <div className="p-3 mb-2 border rounded-md bg-slate-50 space-y-3">
            {isImage(attachment.name) ? (
                <div className="cursor-pointer" onClick={() => window.open(attachment.url, '_blank')}>
                    <img src={attachment.url} alt={attachment.name} className="w-full h-auto rounded-md object-cover max-h-60" />
                </div>
            ) : (
                <div className="flex items-center text-slate-600 p-2">
                    <FileIcon className="w-10 h-10 mr-4 text-slate-400 flex-shrink-0" />
                    <p className="font-semibold text-sm truncate">{attachment.name}</p>
                </div>
            )}
            <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Uploaded by {attachment.uploadedBy} on {new Date(attachment.timestamp).toLocaleDateString()}</span>
                <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex items-center" onClick={handleDownload} disabled={isDownloading}>
                        <DownloadIcon className="w-3.5 h-3.5 mr-1.5" />
                        {isDownloading ? 'Downloading...' : 'Download'}
                    </Button>
                    {canDelete && onDelete && (
                        <Button variant="destructive" size="sm" className="flex items-center px-2" onClick={() => onDelete(attachment)} title="Delete Attachment">
                            <TrashIcon className="w-3.5 h-3.5" />
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
};

const NoteItem: React.FC<{ note: Note; canEdit: boolean; orderId: string }> = ({ note, canEdit, orderId }) => {
    const { editOrderNote, isLoading } = useAppContext();
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.content);

    const handleSave = async () => {
        if (editContent.trim() !== note.content) {
            await editOrderNote(orderId, note.id, editContent);
        }
        setIsEditing(false);
    }

    if (isEditing) {
        return (
            <div className="mb-3 p-3 bg-white border rounded shadow-sm">
                <textarea className="w-full text-sm border p-2 rounded mb-2 whitespace-pre-wrap" rows={4} value={editContent} onChange={e => setEditContent(e.target.value)} />
                <div className="flex justify-end gap-2">
                    <Button size="sm" variant="outline" onClick={() => setIsEditing(false)}>Cancel</Button>
                    <Button size="sm" onClick={handleSave} disabled={isLoading}>Save</Button>
                </div>
            </div>
        )
    }

    return (
        <div className="mb-4 flex flex-col space-y-1 group">
            <div className="flex justify-between items-baseline px-1">
                <span className="text-xs font-bold text-slate-700 flex items-center">
                    {note.authorName} 
                    {['Admin', 'System'].includes(note.authorRole) && <span className="font-normal text-slate-500 ml-1">({note.authorRole})</span>}
                    {note.isEdited && <span className="ml-2 text-[10px] font-normal text-slate-400 italic">(edited)</span>}
                </span>
                {canEdit && (
                    <button onClick={() => setIsEditing(true)} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-slate-600">
                        <EditIcon className="w-3 h-3" />
                    </button>
                )}
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3 shadow-sm relative">
                <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{note.content}</p>
                <p className="text-[10px] text-slate-400 mt-2 text-right">{new Date(note.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
        </div>
    );
};

const NoteColumn: React.FC<{ 
    title: string; 
    notes: Note[]; 
    bgColor: string; 
    currentUserRole?: Role; 
    orderId: string;
    targetRoleKey: string;
}> = ({ title, notes, bgColor, currentUserRole, orderId, targetRoleKey }) => {
    const { addOrderNote, isLoading, currentUser } = useAppContext();
    const [isAdding, setIsAdding] = useState(false);
    const [newNoteContent, setNewNoteContent] = useState('');

    const handleAddNote = async () => {
        if (!newNoteContent.trim()) return;
        await addOrderNote(orderId, newNoteContent, targetRoleKey);
        setIsAdding(false);
        setNewNoteContent('');
    };

    return (
        <div className={`rounded-md p-3 h-full flex flex-col ${bgColor}`}>
            <div className="flex justify-between items-center mb-3 border-b pb-2 sticky top-0">
                <h5 className="font-semibold text-slate-700">{title}</h5>
                <button onClick={() => setIsAdding(!isAdding)} className="p-1 rounded-full hover:bg-slate-200 text-slate-500 transition-colors" title="Add Note">
                    <PlusIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="flex-grow overflow-y-auto max-h-[300px] pr-1 scrollbar-thin scrollbar-thumb-slate-300">
                {isAdding && (
                    <div className="mb-3 p-2 bg-white border rounded shadow-sm">
                        <textarea className="w-full text-sm border p-2 rounded mb-2 whitespace-pre-wrap focus:outline-none focus:ring-1 focus:ring-slate-400" rows={3} placeholder="Type note here..." value={newNoteContent} onChange={e => setNewNoteContent(e.target.value)} autoFocus />
                        <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => setIsAdding(false)} className="h-7 text-xs px-2">Cancel</Button>
                            <Button size="sm" onClick={handleAddNote} disabled={isLoading || !newNoteContent.trim()} className="h-7 text-xs px-2">Save</Button>
                        </div>
                    </div>
                )}
                {notes.length > 0 ? (
                    notes.map((note, index) => {
                        const canEdit = ((currentUserRole === Role.TEAM || currentUserRole === Role.ADMIN) && note.authorRole === Role.TEAM) || (currentUser?.name === note.authorName && currentUser?.role === note.authorRole);
                        return typeof note === 'string' ? ( <div key={index} className="mb-2 p-2 bg-white border rounded text-sm text-slate-600">{note}</div> ) : ( <NoteItem key={note.id || index} note={note} canEdit={canEdit} orderId={orderId} /> );
                    })
                ) : (
                    <p className="text-sm text-slate-400 text-center italic mt-4">No notes.</p>
                )}
            </div>
        </div>
    );
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ order: initialOrder, onClose, hideCustomerInfo, hideDates, hideAssociatedStaff }) => {
  const { orders, users, currentUser, deleteAttachment, updateOrderStatus, isLoading, addToast } = useAppContext();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [attachmentToDelete, setAttachmentToDelete] = useState<Attachment | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [filesToUpload, setFilesToUpload] = useState<File[]>([]);
  const [isEditingPriority, setIsEditingPriority] = useState(false);
  const [selectedPriority, setSelectedPriority] = useState<Priority>(Priority.MEDIUM);

  const order = orders.find(o => o.id === initialOrder?.id) || initialOrder;
  if (!order) return null;
  
  const assignedDigitizer = users.find(u => u.id === order.digitizerId);
  const assignedVendor = users.find(u => u.id === order.vendorId);

  const canDeleteAttachment = (attachment: Attachment) => {
      if (attachment.fromShopify) return false;
      const isPrivilegedUser = currentUser?.role === Role.TEAM || currentUser?.role === Role.ADMIN;
      const isOwner = currentUser?.role === attachment.uploadedBy;
      return isPrivilegedUser || isOwner;
  };

  const handleDeleteClick = (attachment: Attachment) => {
      setAttachmentToDelete(attachment);
      setIsDeleteModalOpen(true);
  };

  const confirmDelete = async () => {
      if (attachmentToDelete && order) {
          await deleteAttachment(order.id, attachmentToDelete.id);
          setIsDeleteModalOpen(false);
          setAttachmentToDelete(null);
      }
  };

  const handleOpenUpload = () => {
      setFilesToUpload([]);
      setIsUploadModalOpen(true);
  };

  const handleConfirmUpload = async () => {
      if (!filesToUpload.length) return;
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
          await updateOrderStatus(order.id, order.status, undefined, {}, filesToUpload);
          setIsUploadModalOpen(false);
          setFilesToUpload([]);
      } catch (error) { console.error("Failed to add attachments", error); }
  };

  const handleSavePriority = async () => {
    if (order && selectedPriority) {
        await updateOrderStatus(order.id, order.status, undefined, { priority: selectedPriority });
        setIsEditingPriority(false);
    }
  };

  const getNoteCategory = (note: Note | string): 'Team' | 'Digitizer' | 'Vendor' => {
      if (typeof note === 'string') {
          const lower = note.toLowerCase();
          if (lower.includes('digitizer')) return 'Digitizer';
          if (lower.includes('vendor') || lower.includes('approved')) return 'Vendor';
          return 'Team';
      }
      if (note.targetRole === 'Digitizer') return 'Digitizer';
      if (note.targetRole === 'Vendor') return 'Vendor';
      if (note.targetRole === 'Team') return 'Team';
      if (note.authorRole === 'Digitizer') return 'Digitizer';
      if (note.authorRole === 'Vendor') return 'Vendor';
      const content = note.content.toLowerCase();
      if (content.includes('sent to digitizer') || content.includes('team rejected')) return 'Digitizer';
      if (content.includes('sent to vendor')) return 'Vendor';
      return 'Team';
  };

  const teamNotes = order.notes.filter(n => getNoteCategory(n) === 'Team');
  const digitizerNotes = order.notes.filter(n => getNoteCategory(n) === 'Digitizer');
  const vendorNotes = order.notes.filter(n => getNoteCategory(n) === 'Vendor');

  const isDigitizer = currentUser?.role === Role.DIGITIZER;
  const isVendor = currentUser?.role === Role.VENDOR;
  const showTeamCol = !isDigitizer && !isVendor;
  const showDigitizerCol = !isVendor;
  const showVendorCol = !isDigitizer;
  const gridClass = (isDigitizer || isVendor) ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3';

  // Format product list correctly from available data with shipping status
  const displayItems = order.lineItems && order.lineItems.length > 0
    ? order.lineItems.map(li => {
        const shipped = li.shippedQuantity || 0;
        return {
            text: `${li.quantity} x ${li.name}`,
            isFullyShipped: shipped >= li.quantity,
            isPartiallyShipped: shipped > 0 && shipped < li.quantity,
            shippedAmount: shipped
        };
    })
    : (order.productName ? order.productName.split(', ').map(p => ({ text: p, isFullyShipped: false, isPartiallyShipped: false, shippedAmount: 0 })) : []);

  return (
    <>
        <Modal isOpen={!!order} onClose={onClose} title={`Order Details: ${order.shopifyOrderNumber || order.id}`} className="max-w-6xl">
            <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex justify-between items-start">
                            <h4 className="font-semibold text-lg text-slate-900">Order Information</h4>
                            {order.shopifyOrderUrl && (
                                <a href={order.shopifyOrderUrl} target="_blank" rel="noopener noreferrer">
                                    <Button variant="link" size="sm">View on Shopify</Button>
                                </a>
                            )}
                        </div>
                        <div className="text-sm space-y-4 bg-white p-5 rounded-lg border shadow-sm">
                            <div className="col-span-2">
                                <h5 className="font-bold text-slate-800 text-base mb-2">Products:</h5>
                                <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                                    <ul className="space-y-2 text-slate-700">
                                        {displayItems.map((item, i) => (
                                            <li key={i} className="text-sm leading-relaxed flex items-start gap-2">
                                                {item.isFullyShipped ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                ) : item.isPartiallyShipped ? (
                                                    <CheckCircleIcon className="w-4 h-4 text-indigo-500 mt-0.5 flex-shrink-0" />
                                                ) : (
                                                    <span className="w-1.5 h-1.5 rounded-full bg-slate-300 mt-2 mx-1 flex-shrink-0" />
                                                )}
                                                <span>
                                                    {item.text}
                                                    {item.isPartiallyShipped && <span className="text-xs text-slate-500 ml-1 font-medium">(Shipped: {item.shippedAmount})</span>}
                                                </span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4 pt-2 border-t mt-4 text-slate-700">
                                {!hideCustomerInfo && (
                                    <>
                                        <p><strong className="font-semibold text-slate-900">Customer:</strong> {order.customerName}</p>
                                        {order.customerEmail && <p><strong className="font-semibold text-slate-900">Email:</strong> {order.customerEmail}</p>}
                                        {order.customerPhone && <p><strong className="font-semibold text-slate-900">Phone:</strong> {order.customerPhone}</p>}
                                    </>
                                )}
                                <p><strong className="font-semibold text-slate-900">Status:</strong> {order.status}</p>
                                {order.financialStatus && <p><strong className="font-semibold text-slate-900">Payment:</strong> {order.financialStatus}</p>}
                                <div className="flex items-center gap-2 h-7">
                                    <strong className="font-semibold text-slate-900">Priority:</strong>
                                    {isEditingPriority ? (
                                        <div className="flex items-center gap-1">
                                            <select value={selectedPriority} onChange={(e) => setSelectedPriority(e.target.value as Priority)} className="text-sm p-1 border rounded h-7">
                                                {Object.values(Priority).map(p => <option key={p} value={p}>{p}</option>)}
                                            </select>
                                            <Button size="sm" onClick={handleSavePriority} disabled={isLoading} className="h-7 px-2">Save</Button>
                                            <Button size="sm" variant="outline" onClick={() => setIsEditingPriority(false)} className="h-7 px-2">Cancel</Button>
                                        </div>
                                    ) : (
                                        <span className="flex items-center gap-2">
                                            {order.priority}
                                            {(currentUser?.role === Role.TEAM || currentUser?.role === Role.ADMIN) && (
                                                <button onClick={() => { setSelectedPriority(order.priority); setIsEditingPriority(true); }} className="text-slate-400 hover:text-slate-600 p-1" title="Edit Priority">
                                                    <EditIcon className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </span>
                                    )}
                                </div>
                                {order.shopifyOrderNumber && <p><strong className="font-semibold text-slate-900">Shopify ID:</strong> {order.shopifyOrderNumber}</p>}
                                <p><strong className="font-semibold text-slate-900">Internal ID:</strong> {order.id}</p>
                                {!hideDates && (
                                    <>
                                        <p><strong className="font-semibold text-slate-900">Created:</strong> {new Date(order.createdAt).toLocaleString()}</p>
                                        <p><strong className="font-semibold text-slate-900">Last Updated:</strong> {new Date(order.updatedAt).toLocaleString()}</p>
                                    </>
                                )}
                            </div>

                            {(order.textUnderDesign || order.shippingAddress) && (
                                <div className="pt-4 border-t space-y-3">
                                     {order.textUnderDesign && <p><strong className="font-bold text-slate-800 block text-xs uppercase mb-1">Text Under Design:</strong> <span className="text-slate-700 bg-slate-50 p-2 rounded block border">{order.textUnderDesign}</span></p>}
                                     {order.shippingAddress && <p><strong className="font-bold text-slate-800 block text-xs uppercase mb-1">Shipping Address:</strong> <span className="text-slate-700 bg-slate-50 p-2 rounded block border">{order.shippingAddress}</span></p>}
                                </div>
                            )}
                        </div>
                        {!hideAssociatedStaff && (
                            <div>
                                <h4 className="font-semibold mb-2">Associated Staff</h4>
                                {order.associatedUsers && order.associatedUsers.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                    {order.associatedUsers.map(user => (
                                        <div key={user.id} className="p-2 bg-slate-50 rounded-md border text-xs">
                                            <span className="font-semibold text-slate-900 block">{user.name}</span>
                                            <span className="text-xs text-slate-500 block mb-1">{user.email}</span>
                                            <span className="text-slate-500 font-medium">{user.role}</span>
                                        </div>
                                    ))}
                                    </div>
                                ) : ( <p className="text-sm text-slate-500">No staff associated.</p> )}
                            </div>
                        )}
                    </div>
                    <div>
                        <div className="flex justify-between items-center mb-2">
                            <h4 className="font-semibold">Attachments</h4>
                            <Button size="sm" variant="outline" onClick={handleOpenUpload} className="h-7 text-xs">
                                <FileUpIcon className="w-3 h-3 mr-1" /> Add Files
                            </Button>
                        </div>
                        <div className="bg-slate-50 rounded border p-2 h-full max-h-[500px] overflow-y-auto">
                            {order.attachments.length > 0 ? order.attachments.map(att => ( <AttachmentItem key={att.id} attachment={att} onDelete={handleDeleteClick} canDelete={canDeleteAttachment(att)} /> )) : ( <p className="text-sm text-slate-500 text-center mt-10">No attachments found.</p> )}
                        </div>
                    </div>
                </div>
                <div>
                    <h4 className="font-semibold mb-3">Notes & History</h4>
                    <div className={`grid ${gridClass} gap-4 border-t pt-4`}>
                        {showTeamCol && <NoteColumn title="Internal / Team" notes={teamNotes as Note[]} bgColor="bg-slate-100" currentUserRole={currentUser?.role} orderId={order.id} targetRoleKey="Team" />}
                        {showDigitizerCol && <NoteColumn title={assignedDigitizer ? `${assignedDigitizer.name}` : "Digitizer"} notes={digitizerNotes as Note[]} bgColor="bg-orange-50" currentUserRole={currentUser?.role} orderId={order.id} targetRoleKey="Digitizer" />}
                        {showVendorCol && <NoteColumn title={assignedVendor ? `${assignedVendor.name}` : "Vendor"} notes={vendorNotes as Note[]} bgColor="bg-purple-50" currentUserRole={currentUser?.role} orderId={order.id} targetRoleKey="Vendor" />}
                    </div>
                </div>
            </div>
        </Modal>
        <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Deletion" footer={<div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button><Button variant="destructive" onClick={confirmDelete} disabled={isLoading}>{isLoading ? 'Deleting...' : 'Delete'}</Button></div>}>
            <p>Are you sure you want to delete the attachment <strong>{attachmentToDelete?.name}</strong>?</p>
            <p className="text-sm text-slate-600 mt-2">This action cannot be undone.</p>
        </Modal>
        <Modal isOpen={isUploadModalOpen} onClose={() => { setIsUploadModalOpen(false); setFilesToUpload([]); }} title="Add Attachments" footer={<div className="flex justify-end space-x-2"><Button variant="outline" onClick={() => { setIsUploadModalOpen(false); setFilesToUpload([]); }}>Cancel</Button><Button onClick={handleConfirmUpload} disabled={filesToUpload.length === 0 || isLoading}>{isLoading ? 'Uploading...' : 'Upload'}</Button></div>}>
            <div className="space-y-4">
                <p className="text-sm text-slate-600">Upload additional files to this order without changing its status.</p>
                <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-300 border-dashed rounded-md">
                    <div className="space-y-1 text-center">
                        <FileUpIcon className="mx-auto h-12 w-12 text-slate-400" />
                        <div className="flex text-sm text-slate-600">
                            <label htmlFor="modal-file-upload" className="relative cursor-pointer bg-white rounded-md font-medium text-slate-800 hover:text-slate-600 focus-within:outline-none">
                                <span>Upload files</span>
                                <input id="modal-file-upload" name="file-upload" type="file" multiple className="sr-only" onChange={e => setFilesToUpload(e.target.files ? Array.from(e.target.files) : [])} />
                            </label>
                        </div>
                        <p className="text-xs text-slate-500">Max 10 files, 5MB each</p>
                    </div>
                </div>
                {filesToUpload.length > 0 && (
                    <div className="mt-3 text-sm">
                        <h4 className="font-medium text-slate-800">Selected files:</h4>
                        <ul className="mt-1 list-disc list-inside bg-slate-50 p-2 rounded-md border max-h-28 overflow-y-auto">
                            {filesToUpload.map((file, index) => (
                                <li key={index} className="text-slate-600 truncate">{file.name} {(file.size > 5 * 1024 * 1024) && <span className="text-red-500 font-bold">(Too Large)</span>}</li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    </>
  );
};

export default OrderDetailsModal;
