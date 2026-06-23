import express from 'express';
import {
  createSession,
  getSessions,
  getSessionMessages,
  deleteSession,
} from '../controllers/sessionController.js';

const router = express.Router();

router.post('/sessions', createSession);
router.get('/sessions', getSessions);
router.get('/sessions/:sessionId/messages', getSessionMessages);
router.delete('/sessions/:sessionId', deleteSession);

export default router;
