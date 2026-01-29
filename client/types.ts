
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

export interface Attachment {
  id: string;
  name: string;
  url: string;
  uploadedBy: Role;
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
  type: 'success' | 'error';
  message: string;
}
