
import mongoose from 'mongoose';

const attachmentSchema = new mongoose.Schema({
  id: String,
  name: String,
  url: String,
  uploadedBy: String, 
  timestamp: { type: Date, default: Date.now },
  fromShopify: { type: Boolean, default: false },
}, { _id: false });

const associatedUserSchema = new mongoose.Schema({
    id: String,
    name: String,
    email: String,
    role: String,
}, { _id: false });

const lineItemSchema = new mongoose.Schema({
  name: String,
  quantity: Number,
  shippedQuantity: { type: Number, default: 0 }
}, { _id: false });

// Using Mixed type for notes allows existing string notes to exist 
// alongside new object-based notes without causing database errors.
const orderSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // e.g., ORD-001
  customerName: { type: String, required: true },
  productName: { type: String, required: true },
  lineItems: [lineItemSchema],
  status: { type: String, required: true },
  attachments: [attachmentSchema],
  notes: { type: [mongoose.Schema.Types.Mixed], default: [] }, 
  digitizerId: String,
  vendorId: String,
  associatedUsers: [associatedUserSchema],
  priority: {
    type: String,
    enum: ['High', 'Medium', 'Low'],
    default: 'Medium'
  },
  
  // Sub-statuses for specific roles to track their own progress
  digitizerStatus: { type: String, default: 'Pending' }, // 'Pending', 'InProgress'
  vendorStatus: { type: String, default: 'Pending' }, // 'Pending', 'InProgress'
  
  // Shopify Integration Fields
  shopifyOrderId: { type: String, index: true }, // Indexed for fast lookups
  shopifyOrderUrl: String,
  shopifyOrderNumber: String,
  customerEmail: String,
  customerPhone: String,
  textUnderDesign: String,
  shippingAddress: String,
  financialStatus: String,

}, { 
    timestamps: true, // Mongoose handles createdAt and updatedAt
    toJSON: {
      transform: function(doc, ret) {
          delete ret._id;
          delete ret.__v;
      }
    }
});

const Order = mongoose.model('Order', orderSchema);
export default Order;
