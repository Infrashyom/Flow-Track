import React from 'react';
import { Ticket } from '../../types';
import { 
  TagIcon, 
  ShieldAlertIcon, 
  CheckCircleIcon, 
  UsersIcon, 
  PaperclipIcon, 
  MessageSquareIcon 
} from '../icons/Icons';

interface TicketCardProps {
  ticket: Ticket;
  currentUserId?: string;
  onClick: () => void;
}

export const TicketCard: React.FC<TicketCardProps> = ({ ticket, currentUserId, onClick }) => {
  const isAssignedToMe = ticket.assignedTo && currentUserId === ticket.assignedTo.id;
  const isPendingAdmin = ticket.adminPing?.pinged && ticket.adminPing.status === 'pending';
  const isAdminApproved = ticket.adminPing?.status === 'approved';

  // Priority color indicators
  const getPriorityStyle = (priority: string) => {
    switch (priority) {
      case 'Urgent':
        return 'text-rose-700 bg-rose-50 border-rose-200/80';
      case 'High':
        return 'text-amber-800 bg-amber-50 border-amber-200/80';
      case 'Medium':
        return 'text-slate-700 bg-slate-100 border-slate-200';
      default:
        return 'text-slate-600 bg-slate-50 border-slate-200';
    }
  };

  // Status style
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pending Admin Approval':
        return 'bg-amber-50 text-amber-800 border-amber-200/80';
      case 'In Progress':
        return 'bg-sky-50 text-sky-800 border-sky-200/80';
      case 'Resolved':
      case 'Closed':
        return 'bg-emerald-50 text-emerald-800 border-emerald-200/80';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  return (
    <div 
      onClick={onClick}
      className="group relative bg-white rounded-xl border border-slate-200 hover:border-slate-300 transition-all duration-150 p-4 cursor-pointer shadow-sm hover:shadow"
    >
      {/* Top Bar: ID, Category & Priority */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 text-xs">
          <span className="font-mono font-semibold text-slate-900 group-hover:text-indigo-600 transition-colors">
            {ticket.id}
          </span>
          <span className="text-slate-300">·</span>
          <span className="text-slate-500 flex items-center gap-1 truncate max-w-[140px]">
            <TagIcon className="w-3 h-3 text-slate-400 shrink-0" />
            {ticket.category}
          </span>
        </div>

        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-md border ${getPriorityStyle(ticket.priority)}`}>
          {ticket.priority}
        </span>
      </div>

      {/* Title */}
      <h4 className="text-sm font-semibold text-slate-900 group-hover:text-indigo-950 line-clamp-2 mb-2 leading-snug">
        {ticket.title}
      </h4>

      {/* Description Snippet */}
      <p className="text-xs text-slate-600 line-clamp-2 mb-3">
        {ticket.description}
      </p>

      {/* Admin Ping Notification Callout (Only when actually pending review) */}
      {isPendingAdmin && ticket.status !== 'Resolved' && ticket.status !== 'Closed' && (
        <div className="mb-3 p-2 rounded-lg bg-slate-50 border border-amber-200/80 flex items-start gap-1.5 text-xs text-amber-900">
          <ShieldAlertIcon className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
          <div className="leading-tight">
            <span className="font-semibold">Admin Approval Pending:</span> {ticket.adminPing.requestNote}
          </div>
        </div>
      )}

      {isAdminApproved && (
        <div className="mb-3 p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-1.5 text-xs text-emerald-800">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span className="font-medium">Admin approved request</span>
        </div>
      )}

      {/* Related Order Info */}
      {ticket.relatedOrderId && (
        <div className="flex items-center gap-2 text-[11px] text-slate-500 mb-3 bg-slate-50 px-2 py-1 rounded border border-slate-100">
          <span className="font-mono font-medium text-slate-700">Order #{ticket.relatedOrderId}</span>
        </div>
      )}

      {/* Footer: Assignee & Meta */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
        {/* Assignee & Reporter */}
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-1.5 text-[11px]">
            <span className="text-slate-400">Assigned:</span>
            <span className={`font-semibold truncate max-w-[110px] ${
              isAssignedToMe ? 'text-indigo-600' : 'text-slate-800'
            }`}>
              {isAssignedToMe ? 'You' : (ticket.assignedTo?.name || 'Unassigned')}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 truncate max-w-[130px]">
            Reporter: <span className="text-slate-600 font-medium">{ticket.createdBy?.name}</span>
          </div>
        </div>

        {/* Status + Comments/Attachments Count */}
        <div className="flex items-center gap-3 text-[11px]">
          {ticket.attachments && ticket.attachments.length > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400" title={`${ticket.attachments.length} attachments`}>
              <PaperclipIcon className="w-3 h-3" />
              <span>{ticket.attachments.length}</span>
            </span>
          )}

          {ticket.comments && ticket.comments.length > 0 && (
            <span className="flex items-center gap-0.5 text-slate-400" title={`${ticket.comments.length} comments`}>
              <MessageSquareIcon className="w-3 h-3" />
              <span>{ticket.comments.length}</span>
            </span>
          )}

          <span className={`px-2 py-0.5 rounded text-[10px] uppercase tracking-wider font-semibold border ${getStatusBadge(ticket.status)}`}>
            {ticket.status === 'Closed' ? 'RESOLVED' : ticket.status}
          </span>
        </div>
      </div>
    </div>
  );
};
