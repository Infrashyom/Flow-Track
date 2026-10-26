import React, { useState } from 'react';
import { useAppContext } from '../../store/AppContext';
import { TicketCategory, TicketPriority, Role, TicketAttachment } from '../../types';
import { XIcon, PaperclipIcon, UserCheckIcon, ShieldAlertIcon } from '../icons/Icons';

interface RaiseTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
  preselectedOrderId?: string;
}

const CATEGORIES: TicketCategory[] = [
  'Customer Inquiry',
  'Order Issue',
  'Shipping',
  'Artwork / Digitizing',
  'Vendor & Production',
  'Billing & Refund',
  'General Query',
];

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];

export const RaiseTicketModal: React.FC<RaiseTicketModalProps> = ({
  isOpen,
  onClose,
  preselectedOrderId,
}) => {
  const { orders, users, currentUser, createTicket, uploadFile, addToast } = useAppContext();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TicketCategory>('Customer Inquiry');
  const [priority, setPriority] = useState<TicketPriority>('Medium');
  const [relatedOrderId, setRelatedOrderId] = useState(preselectedOrderId || '');
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter assignable users:
  // "assignee would be always from team members no digitizers or vendors, admin can assign to admin or team but team can assign only to other team member"
  const isCurrentUserAdmin = currentUser?.role === Role.ADMIN;
  const eligibleAssignees = users.filter(u => {
    // No digitizers or vendors
    if (u.role === Role.DIGITIZER || u.role === Role.VENDOR) {
      return false;
    }
    // If the current user is NOT admin, cannot assign to Admin
    if (!isCurrentUserAdmin && u.role === Role.ADMIN) {
      return false;
    }
    return true;
  });

  const defaultAssignee = currentUser && eligibleAssignees.some(u => u.id === currentUser.id)
    ? currentUser.id
    : (eligibleAssignees[0]?.id || '');
  const [assignedToId, setAssignedToId] = useState<string>(defaultAssignee);

  if (!isOpen) return null;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsUploading(true);
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const uploaded = await uploadFile(file);
      if (uploaded) {
        setAttachments(prev => [
          ...prev,
          {
            id: `tatt-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
            name: file.name,
            url: uploaded.url,
            size: file.size,
            uploadedBy: currentUser?.name || 'User',
            uploadedByRole: currentUser?.role || 'Team',
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    }
    setIsUploading(false);
  };

  const removeAttachment = (id: string) => {
    setAttachments(prev => prev.filter(a => a.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      addToast({ type: 'error', message: 'Please provide both title and description' });
      return;
    }

    if (!assignedToId) {
      addToast({ type: 'error', message: 'Ticket must be assigned to someone.' });
      return;
    }

    // Role check: non-admin cannot assign to Admin
    if (!isCurrentUserAdmin && assignedToId) {
      const chosen = users.find(u => u.id === assignedToId);
      if (chosen && chosen.role === Role.ADMIN) {
        addToast({ 
          type: 'error', 
          message: 'Team members can assign only to other team members. Use "Ping Admin" for administrative actions.' 
        });
        return;
      }
    }

    setIsSubmitting(true);
    const created = await createTicket({
      title: title.trim(),
      description: description.trim(),
      category,
      priority,
      relatedOrderId: relatedOrderId.trim() || undefined,
      assignedToId,
      attachments,
    });

    setIsSubmitting(false);
    if (created) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Raise New Ticket</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Submit customer inquiries, production roadblocks, or internal queries
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
          
          {/* Reporter Display */}
          <div className="flex items-center justify-between text-xs bg-slate-50 p-3 rounded-xl border border-slate-200/80 text-slate-600">
            <span className="font-medium text-slate-500 uppercase tracking-wider text-[11px]">Reporter:</span>
            <span className="font-semibold text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200">
              {currentUser?.name}
            </span>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Ticket Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g., Customer requesting urgent thread color modification"
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Category & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                required
                value={category}
                onChange={e => setCategory(e.target.value as TicketCategory)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Priority *
              </label>
              <select
                required
                value={priority}
                onChange={e => setPriority(e.target.value as TicketPriority)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Order ID Input Only (No dropdown, no customer details needed) */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Order ID (Optional)
            </label>
            <input
              type="text"
              value={relatedOrderId}
              onChange={e => setRelatedOrderId(e.target.value)}
              placeholder="Enter order ID (e.g. ORD-7545 or #1024)..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Description &amp; Action Required *
            </label>
            <textarea
              required
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Describe the issue, customer question, or inquiry in detail..."
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none placeholder:text-slate-400"
            />
          </div>

          {/* Assignee Selection (Team Members or Admin only) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
                Assign Ticket To *
              </label>
              {currentUser && eligibleAssignees.some(u => u.id === currentUser.id) && (
                <button
                  type="button"
                  onClick={() => setAssignedToId(currentUser.id)}
                  className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                >
                  <UserCheckIcon className="w-3.5 h-3.5" />
                  Assign to myself
                </button>
              )}
            </div>

            <select
              required
              value={assignedToId}
              onChange={e => setAssignedToId(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none font-medium"
            >
              <option value="" disabled>-- Select an Assignee * --</option>
              {eligibleAssignees.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name}{u.id === currentUser?.id ? ' — (You)' : ''}
                </option>
              ))}
            </select>

            {/* Note on assignment rules */}
            {!isCurrentUserAdmin ? (
              <div className="mt-2 flex items-start gap-1.5 text-xs text-slate-500 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                <ShieldAlertIcon className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Team Assignment Rule:</strong> You can assign this ticket to yourself or any team member. If you require Admin authorization or review, use the <strong>&quot;Ping Admin&quot;</strong> button inside the ticket.
                </span>
              </div>
            ) : (
              <p className="mt-1.5 text-[11px] text-slate-500">
                Admins can assign tickets to any Team Member or Admin.
              </p>
            )}
          </div>

          {/* Attachments */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
              Attachments (Screenshots, PDFs, Artwork)
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                <PaperclipIcon className="w-3.5 h-3.5 text-slate-500" />
                <span>{isUploading ? 'Uploading...' : 'Upload Files'}</span>
                <input
                  type="file"
                  multiple
                  onChange={handleFileUpload}
                  disabled={isUploading}
                  className="hidden"
                />
              </label>
              <span className="text-[11px] text-slate-400">PDFs, PNGs, JPGs up to 15MB</span>
            </div>

            {attachments.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {attachments.map(att => (
                  <div
                    key={att.id}
                    className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-md text-xs text-slate-700 border border-slate-200"
                  >
                    <PaperclipIcon className="w-3 h-3 text-slate-400" />
                    <span className="truncate max-w-[150px]">{att.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-sm"
            >
              {isSubmitting ? 'Raising Ticket...' : 'Raise Ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
