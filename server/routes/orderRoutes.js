
import express from 'express';
import multer from 'multer';
import { 
    getAllOrders, 
    syncShopifyOrders, 
    updateOrderStatus, 
    addOrderNote,
    updateOrderNote,
    deleteOrderAttachment
} from '../controllers/orderController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// Configure multer for memory storage to handle file uploads within the status update
const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit per file
});

router.get('/', protect, getAllOrders);
router.post('/shopify-sync', protect, syncShopifyOrders);
// This route now accepts multiple file uploads (up to 10) along with status data
router.put('/:id/status', protect, upload.array('attachmentFiles', 10), updateOrderStatus);
router.post('/:id/note', protect, addOrderNote);
router.put('/:id/notes/:noteId', protect, updateOrderNote);
router.delete('/:id/attachments/:attachmentId', protect, deleteOrderAttachment);

// Seed route disabled for safety
// router.post('/seed-orders', seedOrders);

export default router;
