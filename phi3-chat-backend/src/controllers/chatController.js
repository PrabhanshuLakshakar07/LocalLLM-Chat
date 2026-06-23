import pool from '../config/db.js';
import { streamOllamaChat } from '../services/ollamaService.js';

/**
 * POST /api/chat
 * body: { sessionId: number, message: string }
 *
 * Streams the Phi-3 reply back to the client using Server-Sent Events,
 * token by token, and persists both the user message and the full
 * assistant reply into MySQL.
 */
export async function chatStream(req, res) {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: 'sessionId and message are required' });
  }

  // SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  try {
    // 1. Save the user's message
    await pool.query(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, 'user', message]
    );

    // 2. Pull full history so the model has context
    const [history] = await pool.query(
      'SELECT role, content FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    const ollamaMessages = history.map((m) => ({ role: m.role, content: m.content }));

    // 3. Stream tokens from Ollama straight to the client
    const fullReply = await streamOllamaChat(ollamaMessages, (token) => {
      res.write(`data: ${JSON.stringify({ token })}\n\n`);
    });

    // 4. Save the complete assistant reply
    await pool.query(
      'INSERT INTO messages (session_id, role, content) VALUES (?, ?, ?)',
      [sessionId, 'assistant', fullReply]
    );

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    console.error(err);
    res.write(`data: ${JSON.stringify({ error: err.message })}\n\n`);
    res.end();
  }
}
