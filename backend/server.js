// LeadFlow AI Backend Server
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const dotenv = require('dotenv');
const pg = require('pg');
const WebSocket = require('ws');
const http = require('http');
const { createClient } = require('@supabase/supabase-js');

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// PostgreSQL connection pool
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Supabase client for real-time features
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

// JWT middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.sendStatus(401);
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};

// WebSocket server for real-time chat
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws, req) => {
  console.log('New WebSocket connection established');

  ws.on('message', (message) => {
    // Broadcast message to all connected clients
    wss.clients.forEach((client) => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
  });
});

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, businessName, businessType } = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, business_name, business_type, trial_ends_at) 
       VALUES ($1, $2, $3, $4, NOW() + INTERVAL '14 days') 
       RETURNING id, email, business_name, subscription_tier`,
      [email, hashedPassword, businessName, businessType]
    );

    // Create JWT token
    const token = jwt.sign(
      { userId: rows[0].id, email: rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: rows[0],
      message: 'Account created successfully. Free trial starts now!'
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const { rows } = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = rows[0];

    // Compare passwords
    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({ 
      token, 
      user: {
        id: user.id,
        email: user.email,
        business_name: user.business_name,
        subscription_tier: user.subscription_tier
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

// Business routes
app.get('/api/business/profile', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT b.*, u.subscription_tier, u.subscription_status 
       FROM businesses b 
       JOIN users u ON b.user_id = u.id 
       WHERE u.id = $1`,
      [req.user.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Get business profile error:', error);
    res.status(500).json({ error: 'Failed to get business profile' });
  }
});

app.put('/api/business/profile', authenticateToken, async (req, res) => {
  try {
    const { name, address, phone, operatingHours } = req.body;

    const { rows } = await pool.query(
      `UPDATE businesses 
       SET name = $1, address = $2, phone = $3, operating_hours = $4, updated_at = NOW()
       WHERE user_id = $5 
       RETURNING *`,
      [name, address, phone, JSON.stringify(operatingHours), req.user.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Update business profile error:', error);
    res.status(500).json({ error: 'Failed to update business profile' });
  }
});

// Lead management routes
app.get('/api/leads', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = 'SELECT * FROM leads WHERE business_id = (SELECT id FROM businesses WHERE user_id = $1)';
    const params = [req.user.userId];
    
    if (status) {
      query += ' AND status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get leads error:', error);
    res.status(500).json({ error: 'Failed to get leads' });
  }
});

app.post('/api/leads', authenticateToken, async (req, res) => {
  try {
    const { name, phone, email, serviceInterest, source } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO leads (business_id, name, phone, email, service_interest, source, conversation_history)
       VALUES ((SELECT id FROM businesses WHERE user_id = $1), $2, $3, $4, $5, $6, '[]')
       RETURNING *`,
      [req.user.userId, name, phone, email, serviceInterest, source]
    );

    // Trigger AI follow-up
    triggerAIResponse(rows[0]);

    res.json(rows[0]);
  } catch (error) {
    console.error('Create lead error:', error);
    res.status(500).json({ error: 'Failed to create lead' });
  }
});

app.put('/api/leads/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const { rows } = await pool.query(
      `UPDATE leads 
       SET status = $1, updated_at = NOW()
       WHERE id = $2 AND business_id = (SELECT id FROM businesses WHERE user_id = $3)
       RETURNING *`,
      [status, id, req.user.userId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Update lead status error:', error);
    res.status(500).json({ error: 'Failed to update lead status' });
  }
});

// Conversation routes
app.get('/api/conversations', authenticateToken, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT c.*, l.name as lead_name, l.phone as lead_phone, l.status as lead_status
       FROM conversations c
       JOIN leads l ON c.lead_id = l.id
       WHERE l.business_id = (SELECT id FROM businesses WHERE user_id = $1)
       ORDER BY c.updated_at DESC`,
      [req.user.userId]
    );

    res.json(rows);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ error: 'Failed to get conversations' });
  }
});

app.get('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    const { rows } = await pool.query(
      `SELECT m.*, u.business_name as sender_name
       FROM messages m
       LEFT JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = $1
       ORDER BY m.created_at ASC`,
      [id]
    );

    res.json(rows);
  } catch (error) {
    console.error('Get conversation messages error:', error);
    res.status(500).json({ error: 'Failed to get conversation messages' });
  }
});

app.post('/api/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content, senderType } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, sender_id, content)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [id, senderType, req.user.userId, content]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Appointment routes
app.get('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { status } = req.query;
    
    let query = `SELECT a.*, l.name as lead_name, l.phone as lead_phone, s.name as service_name
                 FROM appointments a
                 JOIN leads l ON a.lead_id = l.id
                 LEFT JOIN services s ON a.service_id = s.id
                 WHERE l.business_id = (SELECT id FROM businesses WHERE user_id = $1)`;
    const params = [req.user.userId];
    
    if (status) {
      query += ' AND a.status = $2';
      params.push(status);
    }
    
    query += ' ORDER BY a.scheduled_at ASC';
    
    const { rows } = await pool.query(query, params);
    res.json(rows);
  } catch (error) {
    console.error('Get appointments error:', error);
    res.status(500).json({ error: 'Failed to get appointments' });
  }
});

app.post('/api/appointments', authenticateToken, async (req, res) => {
  try {
    const { leadId, serviceId, scheduledAt } = req.body;

    const { rows } = await pool.query(
      `INSERT INTO appointments (lead_id, service_id, scheduled_at)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [leadId, serviceId, scheduledAt]
    );

    // Update lead status
    await pool.query(
      `UPDATE leads SET status = 'booked' WHERE id = $1`,
      [leadId]
    );

    res.json(rows[0]);
  } catch (error) {
    console.error('Create appointment error:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// Analytics routes
app.get('/api/analytics', authenticateToken, async (req, res) => {
  try {
    const businessIdResult = await pool.query(
      'SELECT id FROM businesses WHERE user_id = $1',
      [req.user.userId]
    );
    
    if (businessIdResult.rows.length === 0) {
      return res.status(404).json({ error: 'Business not found' });
    }
    
    const businessId = businessIdResult.rows[0].id;

    // Get various analytics
    const [
      leadsCountResult,
      bookedAppointmentsResult,
      conversionRateResult,
      avgResponseTimeResult
    ] = await Promise.all([
      pool.query('SELECT COUNT(*) as count FROM leads WHERE business_id = $1 AND created_at >= NOW() - INTERVAL \'30 days\'', [businessId]),
      pool.query('SELECT COUNT(*) as count FROM appointments WHERE lead_id IN (SELECT id FROM leads WHERE business_id = $1) AND status = \'completed\' AND scheduled_at >= NOW() - INTERVAL \'30 days\'', [businessId]),
      pool.query('SELECT calculate_conversion_rate($1) as rate', [businessId]),
      pool.query('SELECT get_avg_response_time($1) as avg_time', [businessId])
    ]);

    res.json({
      leads_last_30_days: parseInt(leadsCountResult.rows[0].count),
      booked_appointments_last_30_days: parseInt(bookedAppointmentsResult.rows[0].count),
      conversion_rate: parseFloat(conversionRateResult.rows[0].rate),
      avg_response_time_seconds: avgResponseTimeResult.rows[0].avg_time ? 
        Math.floor(parseFloat(avgResponseTimeResult.rows[0].avg_time) / 1000) : null
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({ error: 'Failed to get analytics' });
  }
});

// AI Integration - Simulate AI response
const triggerAIResponse = async (lead) => {
  // In a real implementation, this would call an AI service
  // For now, simulate a quick response
  
  // Get or create conversation for this lead
  let conversation;
  const convResult = await pool.query(
    'SELECT id FROM conversations WHERE lead_id = $1',
    [lead.id]
  );
  
  if (convResult.rows.length > 0) {
    conversation = convResult.rows[0];
  } else {
    const newConvResult = await pool.query(
      'INSERT INTO conversations (lead_id) VALUES ($1) RETURNING id',
      [lead.id]
    );
    conversation = newConvResult.rows[0];
  }

  // Simulate AI response after a short delay
  setTimeout(async () => {
    const aiResponses = [
      `Hi ${lead.name || 'there'}! Thanks for reaching out. How can I help you today?`,
      `Hello! I'm here to help with your ${lead.service_interest || 'inquiry'}. What specifically do you need?`,
      `Thanks for contacting us! Could you tell me more about what you're looking for?`
    ];
    
    const randomResponse = aiResponses[Math.floor(Math.random() * aiResponses.length)];
    
    await pool.query(
      `INSERT INTO messages (conversation_id, sender_type, content) 
       VALUES ($1, 'ai', $2)`,
      [conversation.id, randomResponse]
    );
    
    // Broadcast to WebSocket clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'new_message',
          conversationId: conversation.id,
          message: randomResponse
        }));
      }
    });
  }, 2000); // 2 second delay to simulate typing
};

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Serve static files in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static('frontend/build'));

  app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'frontend', 'build', 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`LeadFlow AI server running on port ${PORT}`);
});

module.exports = { app, server };
