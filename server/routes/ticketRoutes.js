import express from 'express';
import {
  getAllTickets,
  getTicketById,
  createTicket,
  updateTicket,
  pingAdmin,
  respondToAdminPing,
  addTicketComment,
  addTicketAttachment
} from '../controllers/ticketController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', protect, getAllTickets);
router.get('/:id', protect, getTicketById);
router.post('/', protect, createTicket);
router.put('/:id', protect, updateTicket);
router.post('/:id/ping-admin', protect, pingAdmin);
router.post('/:id/admin-response', protect, respondToAdminPing);
router.post('/:id/comments', protect, addTicketComment);
router.post('/:id/attachments', protect, addTicketAttachment);

export default router;
