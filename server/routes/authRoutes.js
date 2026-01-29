
import express from 'express';
import { login, getAllUsers, addUser, updateUser, deleteUser, verifyToken } from '../controllers/authController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/login', login);
router.get('/verify', protect, verifyToken);
router.get('/users', protect, getAllUsers);
router.post('/users', protect, addUser);
router.put('/users/:id', protect, updateUser);
router.delete('/users/:id', protect, deleteUser);

// Seed route disabled for safety
// router.post('/seed-users', seedUsers);

export default router;
