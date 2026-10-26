import mongoose from 'mongoose';

const ticketAttachmentSchema = new mongoose.Schema({
  id: String,
  name: String,
  url: String,
  size: Number,
  uploadedBy: String,
  uploadedByRole: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ticketCommentSchema = new mongoose.Schema({
  id: String,
  authorId: String,
  authorName: String,
  authorRole: String,
  content: String,
  createdAt: { type: Date, default: Date.now },
  isAdminPing: { type: Boolean, default: false },
  isAdminResponse: { type: Boolean, default: false },
  isInternal: { type: Boolean, default: false },
  attachments: [ticketAttachmentSchema],
}, { _id: false });

const ticketActivitySchema = new mongoose.Schema({
  id: String,
  action: String,
  actorName: String,
  actorRole: String,
  details: String,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ticketUserRefSchema = new mongoose.Schema({
  id: String,
  name: String,
  email: String,
  role: String,
}, { _id: false });

const adminPingSchema = new mongoose.Schema({
  pinged: { type: Boolean, default: false },
  pingedAt: Date,
  pingedBy: ticketUserRefSchema,
  requestNote: String,
  status: { type: String, enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' },
  adminResponseNote: String,
  respondedAt: Date,
  respondedBy: ticketUserRefSchema,
}, { _id: false });

const ticketAssignmentHistorySchema = new mongoose.Schema({
  id: String,
  fromUser: ticketUserRefSchema,
  toUser: ticketUserRefSchema,
  assignedBy: ticketUserRefSchema,
  timestamp: { type: Date, default: Date.now },
}, { _id: false });

const ticketSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g. TCK-101
  title: { type: String, required: true },
  description: { type: String, required: true },
  category: {
    type: String,
    enum: [
      'Customer Inquiry',
      'Order Issue',
      'Shipping',
      'Artwork / Digitizing',
      'Vendor & Production',
      'Billing & Refund',
      'General Query'
    ],
    default: 'Customer Inquiry'
  },
  priority: {
    type: String,
    enum: ['Low', 'Medium', 'High', 'Urgent'],
    default: 'Medium'
  },
  status: {
    type: String,
    enum: ['Open', 'In Progress', 'Waiting on Customer', 'Pending Admin Approval', 'Resolved', 'Closed'],
    default: 'Open'
  },
  relatedOrderId: String,
  customerName: String,
  customerEmail: String,
  createdBy: { type: ticketUserRefSchema, required: true },
  assignedTo: { type: ticketUserRefSchema, default: null },
  adminPing: { type: adminPingSchema, default: () => ({ pinged: false, status: 'none' }) },
  attachments: { type: [ticketAttachmentSchema], default: [] },
  comments: { type: [ticketCommentSchema], default: [] },
  timeline: { type: [ticketActivitySchema], default: [] },
  assignmentHistory: { type: [ticketAssignmentHistorySchema], default: [] },
  resolvedAt: Date,
}, {
  timestamps: true,
  toJSON: {
    transform: function(doc, ret) {
      delete ret._id;
      delete ret.__v;
    }
  }
});

const Ticket = mongoose.model('Ticket', ticketSchema);
export default Ticket;
