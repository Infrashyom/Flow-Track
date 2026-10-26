export enum Role {
  SALES = 'Sales',
  TEAM = 'Team',
  ADMIN = 'Admin',
  DIGITIZER = 'Digitizer',
  VENDOR = 'Vendor',
}

export enum OrderStatus {
  AT_TEAM = 'At Team',
  AT_DIGITIZER = 'At Digitizer',
  TEAM_REVIEW = 'Team Review',
  AT_VENDOR = 'At Vendor',
  PARTIALLY_SHIPPED = 'Partially Shipped',
  OUT_FOR_DELIVERY = 'Out for Delivery',
}

export enum Priority {
  HIGH = 'High',
  MEDIUM = 'Medium',
  LOW = 'Low',
}

export type TicketPriority = 'Low' | 'Medium' | 'High' | 'Urgent';

export type TicketCategory = 
  | 'Customer Inquiry'
  | 'Order Issue'
  | 'Shipping'
  | 'Artwork / Digitizing'
  | 'Vendor & Production'
  | 'Billing & Refund'
  | 'General Query';

export type TicketStatus = 
  | 'Open'
  | 'In Progress'
  | 'Waiting on Customer'
  | 'Pending Admin Approval'
  | 'Resolved'
  | 'Closed';

export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadedBy: Role | string;
  timestamp: string;
  fromShopify?: boolean;
}

export interface Note {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  targetRole?: string; // To designate which "column" or context this note belongs to
  timestamp: string;
  isEdited?: boolean;
}

export interface AssociatedUser {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LineItem {
  name: string;
  quantity: number;
  shippedQuantity: number;
}

export interface Order {
  id: string;
  customerName: string;
  productName: string;
  lineItems?: LineItem[];
  status: OrderStatus;
  priority: Priority;
  createdAt: string;
  updatedAt: string;
  attachments: Attachment[];
  notes: (Note | string)[]; // Supports both old strings and new Note objects
  digitizerId?: string;
  vendorId?: string;
  associatedUsers?: AssociatedUser[];
  
  // Sub-statuses for specific roles
  digitizerStatus?: string; // 'Pending' | 'InProgress'
  vendorStatus?: string;    // 'Pending' | 'InProgress'

  // Shopify Integration Fields
  shopifyOrderId?: string;
  shopifyOrderUrl?: string;
  shopifyOrderNumber?: string;
  customerEmail?: string;
  customerPhone?: string;
  textUnderDesign?: string;
  shippingAddress?: string;
  financialStatus?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  password?: string;
}

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

// ==========================================
// TICKET MANAGEMENT TYPES
// ==========================================

export interface TicketAttachment {
  id: string;
  name: string;
  url: string;
  size?: number;
  uploadedBy: string;
  uploadedByRole: string;
  timestamp: string;
}

export interface TicketComment {
  id: string;
  authorId: string;
  authorName: string;
  authorRole: string;
  content: string;
  createdAt: string;
  isAdminPing?: boolean;
  isAdminResponse?: boolean;
  isInternal?: boolean;
  attachments?: TicketAttachment[];
}

export interface TicketActivity {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  details: string;
  timestamp: string;
}

export interface AdminPingInfo {
  pinged: boolean;
  pingedAt?: string;
  pingedBy?: {
    id: string;
    name: string;
    role: string;
  };
  requestNote?: string;
  status?: 'none' | 'pending' | 'approved' | 'rejected';
  adminResponseNote?: string;
  respondedAt?: string;
  respondedBy?: {
    id: string;
    name: string;
  };
}

export interface TicketAssignmentRecord {
  id: string;
  fromUser?: {
    id: string;
    name: string;
    role: string;
  } | null;
  toUser: {
    id: string;
    name: string;
    role: string;
  };
  assignedBy: {
    id: string;
    name: string;
    role: string;
  };
  timestamp: string;
}

export interface Ticket {
  id: string; // e.g. TCK-101
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  
  // References
  relatedOrderId?: string;
  customerName?: string;
  customerEmail?: string;
  
  // People
  createdBy: {
    id: string;
    name: string;
    email: string;
    role: Role;
  };
  assignedTo: {
    id: string;
    name: string;
    email: string;
    role: Role;
  } | null;
  
  // Admin Ping & Approval Flow
  adminPing: AdminPingInfo;
  
  // Content & Audit
  attachments: TicketAttachment[];
  comments: TicketComment[];
  timeline: TicketActivity[];
  assignmentHistory?: TicketAssignmentRecord[];
  
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}
