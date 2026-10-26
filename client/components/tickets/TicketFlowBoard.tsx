import React, { useState, useMemo } from 'react';
import { Ticket, TicketStatus, TicketPriority } from '../../types';
import { TicketCard } from './TicketCard';
import { 
  SearchIcon, 
  LayoutGridIcon, 
  ListIcon, 
  ShieldAlertIcon, 
  CheckCircleIcon
} from '../icons/Icons';

interface TicketFlowBoardProps {
  tickets: Ticket[];
  currentUserId?: string;
  onSelectTicket: (ticket: Ticket) => void;
  isAdminView?: boolean;
}

export const TicketFlowBoard: React.FC<TicketFlowBoardProps> = ({
  tickets,
  currentUserId,
  onSelectTicket,
  isAdminView = false,
}) => {
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPriority, setSelectedPriority] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [onlyMyTickets, setOnlyMyTickets] = useState(true);
  const [onlyAdminPending, setOnlyAdminPending] = useState(false);

  // Metrics
  const stats = useMemo(() => {
    const total = tickets.length;
    const pendingAdmin = tickets.filter(t => t.adminPing?.pinged && t.adminPing.status === 'pending').length;
    const inProgress = tickets.filter(t => t.status === 'In Progress').length;
    const open = tickets.filter(t => t.status === 'Open').length;
    const resolved = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length;
    return { total, pendingAdmin, inProgress, open, resolved };
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter(t => {
      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = t.title.toLowerCase().includes(q);
        const matchId = t.id.toLowerCase().includes(q);
        const matchDesc = t.description.toLowerCase().includes(q);
        const matchCustomer = t.customerName?.toLowerCase().includes(q);
        const matchAssignee = t.assignedTo?.name.toLowerCase().includes(q);
        if (!matchTitle && !matchId && !matchDesc && !matchCustomer && !matchAssignee) {
          return false;
        }
      }

      // Quick filter: only pending admin
      if (onlyAdminPending) {
        if (!(t.adminPing?.pinged && t.adminPing.status === 'pending')) {
          return false;
        }
      }

      // Status
      if (selectedStatus !== 'all') {
        if (selectedStatus === 'Resolved') {
          if (t.status !== 'Resolved' && t.status !== 'Closed') {
            return false;
          }
        } else if (t.status !== selectedStatus) {
          return false;
        }
      }

      // Priority
      if (selectedPriority !== 'all' && t.priority !== selectedPriority) {
        return false;
      }

      // Category
      if (selectedCategory !== 'all' && t.category !== selectedCategory) {
        return false;
      }

      // My tickets
      if (onlyMyTickets && currentUserId) {
        if (t.assignedTo?.id !== currentUserId && t.createdBy?.id !== currentUserId) {
          return false;
        }
      }

      return true;
    });
  }, [tickets, searchQuery, selectedStatus, selectedPriority, selectedCategory, onlyMyTickets, onlyAdminPending, currentUserId]);

  // Board Columns (Strictly mutually exclusive stages)
  const columns: { title: string; status: TicketStatus | 'Pending Admin'; tickets: Ticket[]; dotColor: string }[] = [
    {
      title: 'Open / Triage',
      status: 'Open',
      tickets: filteredTickets.filter(t => t.status === 'Open' && !(t.adminPing?.pinged && t.adminPing.status === 'pending')),
      dotColor: 'bg-slate-400'
    },
    {
      title: 'In Progress',
      status: 'In Progress',
      tickets: filteredTickets.filter(t => (t.status === 'In Progress' || t.status === 'Waiting on Customer') && !(t.adminPing?.pinged && t.adminPing.status === 'pending')),
      dotColor: 'bg-sky-500'
    },
    {
      title: 'Pending Admin Approval',
      status: 'Pending Admin',
      tickets: filteredTickets.filter(t => t.status === 'Pending Admin Approval' || (t.adminPing?.pinged && t.adminPing.status === 'pending')),
      dotColor: 'bg-amber-500'
    },
    {
      title: 'Resolved',
      status: 'Resolved',
      tickets: filteredTickets.filter(t => (t.status === 'Resolved' || t.status === 'Closed') && !(t.adminPing?.pinged && t.adminPing.status === 'pending')),
      dotColor: 'bg-emerald-500'
    }
  ];

  // Active filter flags for the metric cards
  const isTotalActive = selectedStatus === 'all' && !onlyAdminPending;
  const isAdminPendingActive = onlyAdminPending;
  const isInProgressActive = selectedStatus === 'In Progress' && !onlyAdminPending;
  const isResolvedActive = selectedStatus === 'Resolved' && !onlyAdminPending;

  return (
    <div className="space-y-5">
      {/* Metric Cards Banner with subtle, standard theme-matched active indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Total */}
        <div 
          onClick={() => {
            setSelectedStatus('all');
            setOnlyAdminPending(false);
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            isTotalActive
              ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Total Tickets</span>
            {isTotalActive && (
              <span className="text-[10px] font-medium bg-slate-900 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.total}</div>
          <div className="text-[11px] text-slate-400 mt-1">Across all categories</div>
        </div>

        {/* Needs Admin Approval */}
        <div 
          onClick={() => {
            setOnlyAdminPending(!onlyAdminPending);
            setSelectedStatus('all');
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            isAdminPendingActive
              ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {stats.pendingAdmin > 0 && <span className="w-2 h-2 rounded-full bg-amber-500" />}
              <span className="text-xs font-semibold text-slate-700">Needs Admin Attention</span>
            </div>
            {isAdminPendingActive && (
              <span className="text-[10px] font-medium bg-slate-900 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1 flex items-center gap-2">
            <span>{stats.pendingAdmin}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {isAdminPendingActive ? 'Filtered by pending review' : 'Awaiting admin decision'}
          </div>
        </div>

        {/* In Progress */}
        <div 
          onClick={() => {
            setSelectedStatus(selectedStatus === 'In Progress' && !onlyAdminPending ? 'all' : 'In Progress');
            setOnlyAdminPending(false);
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            isInProgressActive
              ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">In Progress</span>
            {isInProgressActive && (
              <span className="text-[10px] font-medium bg-slate-900 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.inProgress}</div>
          <div className="text-[11px] text-slate-400 mt-1">Active investigations</div>
        </div>

        {/* Resolved */}
        <div 
          onClick={() => {
            setSelectedStatus(selectedStatus === 'Resolved' && !onlyAdminPending ? 'all' : 'Resolved');
            setOnlyAdminPending(false);
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            isResolvedActive
              ? 'bg-slate-50 border-slate-900 ring-1 ring-slate-900/20 shadow-sm'
              : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">Resolved</span>
            {isResolvedActive && (
              <span className="text-[10px] font-medium bg-slate-900 text-white px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{stats.resolved}</div>
          <div className="text-[11px] text-slate-400 mt-1">Completed inquiries</div>
        </div>
      </div>

      {/* Control Bar: Search, Filters, View Mode, Raise Button */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by ID, title, customer, or assignee..."
            className="w-full pl-9 pr-3.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-slate-900 focus:outline-none"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={e => setSelectedPriority(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">All Priorities</option>
            <option value="Urgent">Urgent</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            <option value="all">All Categories</option>
            <option value="Customer Inquiry">Customer Inquiry</option>
            <option value="Order Issue">Order Issue</option>
            <option value="Shipping">Shipping</option>
            <option value="Artwork / Digitizing">Artwork / Digitizing</option>
            <option value="Vendor & Production">Vendor & Production</option>
            <option value="Billing & Refund">Billing & Refund</option>
            <option value="General Query">General Query</option>
          </select>

          {/* My Tickets toggle */}
          {currentUserId && (
            <button
              onClick={() => setOnlyMyTickets(!onlyMyTickets)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                onlyMyTickets
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
              }`}
            >
              My Tickets
            </button>
          )}

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('board')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'board' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Workflow Board View"
            >
              <LayoutGridIcon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-md text-xs transition-colors ${
                viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="List View"
            >
              <ListIcon className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* TICKET VIEWS */}
      {viewMode === 'board' ? (
        /* WORKFLOW / KANBAN BOARD */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {columns.map(col => (
            <div
              key={col.title}
              className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 flex flex-col min-h-[480px]"
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-200 px-1">
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${col.dotColor}`} />
                  <span className="text-xs font-semibold text-slate-800">
                    {col.title}
                  </span>
                </div>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-200/80 text-slate-700">
                  {col.tickets.length}
                </span>
              </div>

              {/* Tickets in column */}
              <div className="space-y-3 flex-1 overflow-y-auto max-h-[70vh] pr-0.5">
                {col.tickets.length > 0 ? (
                  <>
                    {(col.status === 'Resolved' ? col.tickets.slice(0, 2) : col.tickets).map(t => (
                      <TicketCard
                        key={t.id}
                        ticket={t}
                        currentUserId={currentUserId}
                        onClick={() => onSelectTicket(t)}
                      />
                    ))}
                    {col.status === 'Resolved' && (
                      <button
                        type="button"
                        onClick={() => setViewMode('list')}
                        className="w-full mt-2 py-2 px-3 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 text-slate-700 hover:text-slate-900 text-xs font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm cursor-pointer group"
                      >
                        <span>
                          {col.tickets.length > 2
                            ? `View all ${col.tickets.length} tickets in List View`
                            : 'View in List View'}
                        </span>
                        <span className="text-slate-400 group-hover:translate-x-0.5 transition-transform font-bold">→</span>
                      </button>
                    )}
                  </>
                ) : (
                  <div className="text-center py-10 text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl bg-white/40">
                    No tickets in this stage
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* LIST / TABLE VIEW */
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          {filteredTickets.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {filteredTickets.map(ticket => (
                <div
                  key={ticket.id}
                  onClick={() => onSelectTicket(ticket)}
                  className="p-4 hover:bg-slate-50/80 cursor-pointer transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-slate-900 group-hover:text-indigo-600">
                        {ticket.id}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-xs text-slate-500">{ticket.category}</span>
                      {ticket.adminPing?.pinged && ticket.adminPing.status === 'pending' && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 px-1.5 py-0.5 rounded border border-amber-300">
                          <ShieldAlertIcon className="w-3 h-3 text-amber-600" />
                          Awaiting Admin
                        </span>
                      )}
                    </div>
                    <h4 className="text-sm font-semibold text-slate-900">
                      {ticket.title}
                    </h4>
                    <div className="flex items-center gap-3 text-xs text-slate-500">
                      <span>Reporter: <strong className="text-slate-700">{ticket.createdBy?.name}</strong></span>
                      <span>·</span>
                      <span>
                        Assignee: <strong className="text-slate-800">{ticket.assignedTo ? ticket.assignedTo.name : 'Unassigned'}</strong>
                      </span>
                      {ticket.relatedOrderId && (
                        <>
                          <span>·</span>
                          <span className="font-mono">Order #{ticket.relatedOrderId}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {ticket.priority}
                    </span>
                    <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-slate-900 text-white">
                      {ticket.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-500">
              No tickets found matching your filter criteria.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
