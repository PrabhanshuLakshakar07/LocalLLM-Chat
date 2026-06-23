import pool from '../config/db.js';

export async function createSession(req, res) {
  try {
    const { title } = req.body;
    const [result] = await pool.query(
      'INSERT INTO sessions (title) VALUES (?)',
      [title || 'New Chat']
    );
    res.status(201).json({ id: result.insertId, title: title || 'New Chat' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create session' });
  }
}

export async function getSessions(req, res) {
  try {
    const [rows] = await pool.query('SELECT * FROM sessions ORDER BY created_at DESC');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
}

export async function getSessionMessages(req, res) {
  try {
    const { sessionId } = req.params;
    const [rows] = await pool.query(
      'SELECT role, content, created_at FROM messages WHERE session_id = ? ORDER BY created_at ASC',
      [sessionId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
}

export async function deleteSession(req, res) {
  try {
    const { sessionId } = req.params;
    await pool.query('DELETE FROM sessions WHERE id = ?', [sessionId]);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete session' });
  }
}
