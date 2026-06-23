import express from 'express';
import { chatStream } from '../controllers/chatController.js';

const router = express.Router();

router.post('/chat', chatStream);

export default router;
