import React, { useState } from 'react';
import { Ticket, Role, TicketPriority, TicketStatus, TicketCategory } from '../../types';
import { useAppContext } from '../../store/AppContext';
import { 
  XIcon, 
  SendIcon, 
  PaperclipIcon, 
  ShieldAlertIcon, 
  CheckCircleIcon, 
  UserCheckIcon, 
  ClockIcon, 
  DownloadIcon, 
  AlertTriangleIcon,
  HistoryIcon,
  MessageSquareIcon,
  FileIcon
} from '../icons/Icons';

interface TicketDetailsModalProps {
  ticket: Ticket;
  isOpen: boolean;
  onClose: () => void;
}

const PRIORITIES: TicketPriority[] = ['Low', 'Medium', 'High', 'Urgent'];
const STATUSES: TicketStatus[] = [
  'Open',
  'In Progress',
  'Waiting on Customer',
  'Pending Admin Approval',
  'Resolved',
];

export const TicketDetailsModal: React.FC<TicketDetailsModalProps> = ({
  ticket,
  isOpen,
  onClose,
}) => {
  const { 
    currentUser, 
    users, 
    orders, 
    tickets,
    updateTicket, 
    pingAdminForTicket, 
    respondToAdminPing, 
    addTicketComment, 
    addTicketAttachment, 
    uploadFile,
    addToast
  } = useAppContext();

  // Live active ticket directly bound to global store for instant updates
  const activeTicket = tickets.find(t => t.id === ticket.id) || ticket;

  // Authorization: Only the ticket creator, assignee and admin can edit ticket details
  const isAdmin = currentUser?.role === Role.ADMIN;
  const isCreator = Boolean(activeTicket.createdBy && currentUser?.id === activeTicket.createdBy.id);
  const isAssignee = Boolean(activeTicket.assignedTo && currentUser?.id === activeTicket.assignedTo.id);
  const canEdit = isAdmin || isCreator || isAssignee;

  // Tabs: 'discussion', 'timeline', 'attachments'
  const [activeTab, setActiveTab] = useState<'discussion' | 'timeline' | 'attachments'>('discussion');

  // Comment input
  const [newComment, setNewComment] = useState('');
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Ping Admin Modal state
  const [showPingModal, setShowPingModal] = useState(false);
  const [pingNote, setPingNote] = useState('');
  const [isPinging, setIsPinging] = useState(false);

  // Admin Response Modal state
  const [showAdminDecisionModal, setShowAdminDecisionModal] = useState(false);
  const [adminDecisionAction, setAdminDecisionAction] = useState<'approved' | 'rejected'>('approved');
  const [adminDirectiveNote, setAdminDirectiveNote] = useState('');
  const [isRespondingAdmin, setIsRespondingAdmin] = useState(false);

  // Attachment upload in modal
  const [isUploadingFile, setIsUploadingFile] = useState(false);

  if (!isOpen) return null;

  const isAwaitingAdmin = activeTicket.adminPing?.pinged && activeTicket.adminPing.status === 'pending';
  const isAssignedToMe = activeTicket.assignedTo && currentUser?.id === activeTicket.assignedTo.id;

  // Assignee filtering:
  // "assignee would be always from team members no digitizers or vendors, admin can assign to admin or team but team can assign only to other team member"
  const eligibleAssignees = users.filter(u => {
    // No digitizers or vendors
    if (u.role === Role.DIGITIZER || u.role === Role.VENDOR) {
      return false;
    }
    // Team members cannot assign to Admin
    if (!isAdmin && u.role === Role.ADMIN) {
      return false;
    }
    return true;
  });

  // Handle status update
  const handleStatusChange = async (newStatus: TicketStatus) => {
    if (!canEdit) {
      addToast({ type: 'error', message: 'Only ticket creator, assignee, or admin can edit ticket details.' });
      return;
    }
    if (isAwaitingAdmin && (newStatus === 'Resolved' || newStatus === 'Closed')) {
      addToast({ 
        type: 'error', 
        message: 'Cannot resolve ticket while awaiting Admin approval. Admin must first review and respond.' 
      });
      return;
    }
    await updateTicket(activeTicket.id, { status: newStatus });
  };

  // Handle priority update
  const handlePriorityChange = async (newPriority: TicketPriority) => {
    if (!canEdit) {
      addToast({ type: 'error', message: 'Only ticket creator, assignee, or admin can edit ticket details.' });
      return;
    }
    await updateTicket(activeTicket.id, { priority: newPriority });
  };

  // Handle assignment update
  const handleAssigneeChange = async (targetUserId: string) => {
    if (!canEdit) {
      addToast({ type: 'error', message: 'Only ticket creator, assignee, or admin can edit ticket details.' });
      return;
    }
    if (!targetUserId) {
      addToast({ type: 'error', message: 'Ticket must remain assigned to someone.' });
      return;
    }
    const chosen = users.find(u => u.id === targetUserId);
    if (!chosen) return;
    if (chosen.role === Role.DIGITIZER || chosen.role === Role.VENDOR) {
      addToast({ type: 'error', message: 'Tickets can only be assigned to Team members or Admins.' });
      return;
    }
    if (!isAdmin && chosen.role === Role.ADMIN) {
      addToast({ 
        type: 'error', 
        message: 'Team members can assign only to other team members. Use "Ping Admin for Approval" below.' 
      });
      return;
    }
    await updateTicket(activeTicket.id, { assignedToId: targetUserId });
  };

  // Submit comment
  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    setIsSubmittingComment(true);
    const success = await addTicketComment(activeTicket.id, newComment.trim());
    if (success) {
      setNewComment('');
    }
    setIsSubmittingComment(false);
  };

  // Submit Ping Admin
  const handleConfirmPingAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pingNote.trim()) {
      addToast({ type: 'error', message: 'Please specify what approval or note you need from Admin.' });
      return;
    }

    setIsPinging(true);
    const success = await pingAdminForTicket(activeTicket.id, pingNote.trim());
    setIsPinging(false);
    if (success) {
      setShowPingModal(false);
      setPingNote('');
    }
  };

  // Submit Admin Decision
  const handleConfirmAdminDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsRespondingAdmin(true);
    const success = await respondToAdminPing(
      activeTicket.id, 
      adminDecisionAction, 
      adminDirectiveNote.trim() || undefined,
      adminDecisionAction === 'approved' ? 'In Progress' : 'In Progress'
    );
    setIsRespondingAdmin(false);
    if (success) {
      setShowAdminDecisionModal(false);
      setAdminDirectiveNote('');
    }
  };

  // Handle file attachment upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingFile(true);
    const uploaded = await uploadFile(file);
    if (uploaded) {
      await addTicketAttachment(activeTicket.id, file.name, uploaded.url, file.size);
    }
    setIsUploadingFile(false);
  };

  const relatedOrder = activeTicket.relatedOrderId 
    ? orders.find(o => o.id === activeTicket.relatedOrderId) 
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in zoom-in-95 duration-150">
        
        {/* Top Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200 text-slate-800">
              {activeTicket.id}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs font-medium text-slate-600">{activeTicket.category}</span>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        {/* ADMIN ACTION BANNER (CRITICAL FEATURE) */}
        {isAwaitingAdmin && (
          <div className="bg-amber-500/10 border-b border-amber-200 px-6 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <ShieldAlertIcon className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
              <div>
                <div className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                  Admin Attention Required
                </div>
                <p className="text-xs text-amber-950 mt-0.5">
                  <span className="font-semibold">{activeTicket.adminPing?.pingedBy?.name || 'Team member'}</span> pinged Admin:{' '}
                  &ldquo;{activeTicket.adminPing?.requestNote}&rdquo;
                </p>
              </div>
            </div>

            {isAdmin ? (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => {
                    setAdminDecisionAction('approved');
                    setShowAdminDecisionModal(true);
                  }}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium rounded-lg shadow-sm transition-colors flex items-center gap-1.5"
                >
                  <CheckCircleIcon className="w-3.5 h-3.5" />
                  Approve Request
                </button>
                <button
                  onClick={() => {
                    setAdminDecisionAction('rejected');
                    setShowAdminDecisionModal(true);
                  }}
                  className="px-3 py-1.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-50 text-xs font-medium rounded-lg transition-colors"
                >
                  Decline / Directive
                </button>
              </div>
            ) : (
              <span className="text-xs font-medium text-amber-800 bg-amber-100/80 px-2.5 py-1 rounded-md border border-amber-200">
                Awaiting Admin Response
              </span>
            )}
          </div>
        )}

        {/* Resolved Admin Banner */}
        {activeTicket.adminPing?.status === 'approved' && (
          <div className="bg-emerald-50 border-b border-emerald-100 px-6 py-2.5 flex items-center gap-2 text-xs text-emerald-900">
            <CheckCircleIcon className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>
              <strong>Admin Decision:</strong> Approved by {activeTicket.adminPing.respondedBy?.name || 'Admin'}
              {activeTicket.adminPing.adminResponseNote && ` — "${activeTicket.adminPing.adminResponseNote}"`}
            </span>
          </div>
        )}

        {/* Main Content Split: Left (Details, Comments) & Right (Meta, Assignee, Actions) */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
          
          {/* Left Column (2 Cols) */}
          <div className="lg:col-span-2 p-6 flex flex-col space-y-5">
            {/* Title & Description */}
            <div>
              <h2 className="text-lg font-bold text-slate-900 leading-snug mb-2">
                {activeTicket.title}
              </h2>
              <div className="text-xs text-slate-700 whitespace-pre-wrap bg-slate-50 p-3.5 rounded-xl border border-slate-100 leading-relaxed">
                {activeTicket.description}
              </div>
            </div>

            {/* Related Order Card (if present) */}
            {activeTicket.relatedOrderId && (
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <FileIcon className="w-4 h-4 text-slate-400" />
                  <div>
                    <span className="font-semibold text-slate-900 mr-2">
                      Order #{activeTicket.relatedOrderId}
                      {relatedOrder && ` (${relatedOrder.productName})`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Sub-tabs: Discussion, Timeline, Attachments */}
            <div className="border-b border-slate-200">
              <nav className="flex space-x-6 text-xs font-medium">
                <button
                  onClick={() => setActiveTab('discussion')}
                  className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 -mb-px ${
                    activeTab === 'discussion'
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <MessageSquareIcon className="w-3.5 h-3.5" />
                  Discussion ({activeTicket.comments?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('timeline')}
                  className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 -mb-px ${
                    activeTab === 'timeline'
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <HistoryIcon className="w-3.5 h-3.5" />
                  Assignment Path &amp; Activity ({activeTicket.timeline?.length || 0})
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`pb-2.5 flex items-center gap-1.5 transition-colors border-b-2 -mb-px ${
                    activeTab === 'attachments'
                      ? 'border-slate-900 text-slate-900 font-semibold'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <PaperclipIcon className="w-3.5 h-3.5" />
                  Attachments ({activeTicket.attachments?.length || 0})
                </button>
              </nav>
            </div>

            {/* TAB CONTENT: DISCUSSION */}
            {activeTab === 'discussion' && (
              <div className="flex flex-col space-y-4">
                {/* Comments List */}
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {activeTicket.comments && activeTicket.comments.length > 0 ? (
                    activeTicket.comments.map(c => (
                      <div
                        key={c.id}
                        className={`p-3 rounded-xl text-xs border ${
                          c.isAdminPing
                            ? 'bg-amber-50/80 border-amber-200 text-amber-900'
                            : c.isAdminResponse
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium'
                            : c.authorRole === 'Admin'
                            ? 'bg-purple-50/60 border-purple-200'
                            : 'bg-white border-slate-200 text-slate-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{c.authorName}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              c.authorRole === 'Admin' ? 'bg-purple-100 text-purple-800' : 'bg-slate-100 text-slate-600'
                            }`}>
                              {c.authorRole}
                            </span>
                            {c.isAdminPing && (
                              <span className="text-[10px] font-semibold text-amber-700 bg-amber-100 px-1 rounded">
                                Admin Ping
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap leading-relaxed">{c.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No comments yet. Start the conversation below.
                    </div>
                  )}
                </div>

                {/* Add Comment Input */}
                <form onSubmit={handlePostComment} className="pt-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newComment}
                      onChange={e => setNewComment(e.target.value)}
                      placeholder="Add an update or response..."
                      className="flex-1 px-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingComment || !newComment.trim()}
                      className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-lg disabled:opacity-40 transition-colors flex items-center gap-1.5 shrink-0"
                    >
                      <SendIcon className="w-3.5 h-3.5" />
                      <span>Reply</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* TAB CONTENT: TIMELINE & ASSIGNMENT PATH */}
            {activeTab === 'timeline' && (
              <div className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
                {/* Assignment Path / History */}
                {activeTicket.assignmentHistory && activeTicket.assignmentHistory.length > 0 && (
                  <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                    <div className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <UserCheckIcon className="w-3.5 h-3.5 text-indigo-600" />
                      Assignment Path (Who Assigned to Who)
                    </div>
                    <div className="space-y-2">
                      {activeTicket.assignmentHistory.map((item, idx) => (
                        <div key={item.id || idx} className="text-xs flex items-center justify-between text-slate-700 bg-white p-2.5 rounded-lg border border-slate-200">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-semibold">
                              #{idx + 1}
                            </span>
                            {item.fromUser ? (
                              <span>
                                <span className="font-semibold text-slate-700">{item.fromUser.name}</span>
                                <span className="text-slate-400 mx-1.5">&rarr;</span>
                                <span className="font-semibold text-indigo-700">{item.toUser.name}</span>
                              </span>
                            ) : (
                              <span>
                                Initial assignment to <span className="font-semibold text-indigo-700">{item.toUser.name}</span>
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-400">
                            Assigned by <strong className="text-slate-600">{item.assignedBy.name}</strong> · {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Chronological Activity Timeline */}
                <div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Activity Log
                  </div>
                  {activeTicket.timeline && activeTicket.timeline.length > 0 ? (
                    <div className="relative pl-4 space-y-4 before:absolute before:left-1.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                      {activeTicket.timeline.map((act) => (
                        <div key={act.id} className="relative text-xs">
                          <div className="absolute -left-[14px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 ring-4 ring-white" />
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-900">{act.actorName}</span>
                            <span className="text-[11px] text-slate-400">
                              {new Date(act.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-slate-600 mt-0.5">{act.details}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-xs text-slate-400">
                      No activity recorded yet.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB CONTENT: ATTACHMENTS */}
            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">Files &amp; Artwork</span>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <PaperclipIcon className="w-3.5 h-3.5 text-slate-500" />
                    <span>{isUploadingFile ? 'Uploading...' : 'Upload File'}</span>
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      disabled={isUploadingFile}
                      className="hidden"
                    />
                  </label>
                </div>

                {activeTicket.attachments && activeTicket.attachments.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {activeTicket.attachments.map(att => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50 transition-colors text-xs group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <PaperclipIcon className="w-4 h-4 text-slate-400 shrink-0" />
                          <div className="truncate">
                            <div className="font-medium text-slate-800 truncate group-hover:text-indigo-600">
                              {att.name}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              By {att.uploadedBy} · {new Date(att.timestamp).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        <DownloadIcon className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 shrink-0 ml-2" />
                      </a>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                    No attachments uploaded for this ticket yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column (Sidebar Controls) */}
          <div className="p-6 bg-slate-50/50 flex flex-col justify-between space-y-5 text-xs">
            <div className="space-y-5">
              
              {/* View-Only Warning when user lacks edit permissions */}
              {!canEdit && (
                <div className="p-2.5 rounded-lg bg-amber-50/80 border border-amber-200 text-amber-900 text-[11px] leading-tight flex items-start gap-1.5">
                  <span className="shrink-0 mt-0.5">🔒</span>
                  <span><strong>View-Only:</strong> Only the ticket creator, assigned team member, or an Admin can edit details.</span>
                </div>
              )}

              {/* Status Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Status
                </label>
                <select
                  disabled={!canEdit}
                  value={activeTicket.status === 'Closed' ? 'Resolved' : activeTicket.status}
                  onChange={e => handleStatusChange(e.target.value as TicketStatus)}
                  className={`w-full px-3 py-2 text-xs font-semibold border rounded-lg focus:outline-none ${
                    !canEdit
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-slate-900'
                  }`}
                >
                  {STATUSES.map(s => {
                    const isLockedByAdmin = isAwaitingAdmin && s === 'Resolved';
                    return (
                      <option key={s} value={s} disabled={isLockedByAdmin}>
                        {s}{isLockedByAdmin ? ' — (Locked: Awaiting Admin Approval)' : ''}
                      </option>
                    );
                  })}
                </select>
                {isAwaitingAdmin && (
                  <p className="mt-1 text-[11px] text-amber-800 bg-amber-50/80 p-2 rounded-lg border border-amber-200/80">
                    * Locked: Ticket cannot be resolved while Admin approval is pending. Once Admin responds, the ticket moves to <strong>In Progress</strong> and can then be resolved.
                  </p>
                )}
              </div>

              {/* Priority Selector */}
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Priority
                </label>
                <select
                  disabled={!canEdit}
                  value={activeTicket.priority}
                  onChange={e => handlePriorityChange(e.target.value as TicketPriority)}
                  className={`w-full px-3 py-2 text-xs font-semibold border rounded-lg focus:outline-none ${
                    !canEdit
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-slate-900'
                  }`}
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </div>

              {/* Assignee Control */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] font-bold text-slate-800 uppercase tracking-wider">
                    Assigned To *
                  </label>
                  {canEdit && currentUser && !isAssignedToMe && eligibleAssignees.some(u => u.id === currentUser.id) && (
                    <button
                      type="button"
                      onClick={() => handleAssigneeChange(currentUser.id)}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
                    >
                      <UserCheckIcon className="w-3 h-3" />
                      Take Ticket
                    </button>
                  )}
                </div>

                <select
                  disabled={!canEdit}
                  value={activeTicket.assignedTo?.id || ''}
                  onChange={e => handleAssigneeChange(e.target.value)}
                  className={`w-full px-3 py-2 text-xs border rounded-lg focus:outline-none font-medium ${
                    !canEdit
                      ? 'bg-slate-100 text-slate-500 border-slate-200 cursor-not-allowed'
                      : 'bg-white border-slate-200 focus:ring-2 focus:ring-slate-900'
                  }`}
                >
                  <option value="" disabled>-- Select Assignee * --</option>
                  {eligibleAssignees.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name}{u.id === currentUser?.id ? ' — (You)' : ''}
                    </option>
                  ))}
                </select>

                {!isAdmin ? (
                  <p className="mt-1 text-[10px] text-slate-500">
                    * Tickets cannot be assigned to Admin. Use the <strong>Ping Admin</strong> button below for authorizations.
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-slate-500">
                    * Admins can assign to any Team Member or Admin.
                  </p>
                )}
              </div>

              {/* ACTION: PING ADMIN (Core User Requirement) */}
              <div className="pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowPingModal(true)}
                  className={`w-full py-2.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    isAwaitingAdmin
                      ? 'bg-amber-100 text-amber-900 hover:bg-amber-200 border border-amber-300'
                      : 'bg-white hover:bg-amber-50 text-amber-900 border border-amber-200 shadow-sm'
                  }`}
                >
                  <ShieldAlertIcon className="w-4 h-4 text-amber-600" />
                  <span>{isAwaitingAdmin ? 'Update / Re-Ping Admin' : 'Ping Admin for Approval / Note'}</span>
                </button>
                <p className="text-[10px] text-slate-500 text-center mt-1">
                  Send high-priority alert for refunds, exceptions, or management notes
                </p>
              </div>

              {/* Meta details */}
              <div className="pt-2 border-t border-slate-200 space-y-1.5 text-[11px] text-slate-500">
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Reporter:</span>
                  <span className="font-semibold text-slate-900">{activeTicket.createdBy?.name || 'Unknown'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-slate-700">Current Assignee:</span>
                  <span className="font-semibold text-indigo-700">{activeTicket.assignedTo?.name || 'Unassigned'}</span>
                </div>
                <div className="flex justify-between">
                  <span>Created:</span>
                  <span className="font-medium text-slate-700">
                    {new Date(activeTicket.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Last Updated:</span>
                  <span className="font-medium text-slate-700">
                    {new Date(activeTicket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full py-2 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg text-xs font-medium text-slate-700 transition-colors"
            >
              Done &amp; Close View
            </button>
          </div>
        </div>
      </div>

      {/* PING ADMIN MODAL */}
      {showPingModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2 text-amber-800">
              <ShieldAlertIcon className="w-5 h-5 text-amber-600" />
              <h4 className="text-sm font-bold">Ping Admin for Approval / Guidance</h4>
            </div>

            <p className="text-xs text-slate-600">
              This will notify the Admin in their dedicated oversight panel, flag ticket <strong>{activeTicket.id}</strong> as <em>Pending Admin Approval</em>, and record your request in the discussion thread.
            </p>

            <form onSubmit={handleConfirmPingAdmin} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  What approval or note do you need from Admin? *
                </label>
                <textarea
                  required
                  rows={3}
                  value={pingNote}
                  onChange={e => setPingNote(e.target.value)}
                  placeholder="e.g. Customer requesting $30 shipping credit due to courier delay. Please authorize or advise."
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPingModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPinging || !pingNote.trim()}
                  className="px-4 py-1.5 text-xs font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-sm disabled:opacity-50"
                >
                  {isPinging ? 'Sending...' : 'Send to Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADMIN RESPONSE MODAL */}
      {showAdminDecisionModal && (
        <div className="fixed inset-0 z-60 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-slate-200 p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center gap-2">
              {adminDecisionAction === 'approved' ? (
                <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
              ) : (
                <AlertTriangleIcon className="w-5 h-5 text-rose-600" />
              )}
              <h4 className="text-sm font-bold text-slate-900">
                {adminDecisionAction === 'approved' ? 'Approve Team Request' : 'Decline / Give Directive'}
              </h4>
            </div>

            <div className="text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-slate-700">
              <span className="font-semibold text-slate-900">Request from Team:</span>
              <p className="mt-0.5 italic">&ldquo;{activeTicket.adminPing?.requestNote}&rdquo;</p>
            </div>

            <form onSubmit={handleConfirmAdminDecision} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Admin Directive / Notes for Team (Optional)
                </label>
                <textarea
                  rows={3}
                  value={adminDirectiveNote}
                  onChange={e => setAdminDirectiveNote(e.target.value)}
                  placeholder={
                    adminDecisionAction === 'approved' 
                      ? 'e.g. Approved. Apply credit to account and notify customer.' 
                      : 'e.g. Cannot approve credit. Offer a $10 discount voucher on their next order instead.'
                  }
                  className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdminDecisionModal(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRespondingAdmin}
                  className={`px-4 py-1.5 text-xs font-medium text-white rounded-lg shadow-sm disabled:opacity-50 ${
                    adminDecisionAction === 'approved' 
                      ? 'bg-emerald-600 hover:bg-emerald-700' 
                      : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  {isRespondingAdmin ? 'Submitting...' : 'Confirm Decision'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
