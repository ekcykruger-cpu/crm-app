// =============================================================================
// server.js  –  CRM Application Server
// =============================================================================
// This file does two things:
//   1. Connects to the PostgreSQL database
//   2. Defines all the API "routes" (URLs the frontend calls to read/write data)
//
// Each route follows the same pattern:
//   app.METHOD('/url', async (req, res) => { ... })
//   - req  = the incoming request (contains data sent by the browser)
//   - res  = the response we send back to the browser
// =============================================================================

const express = require('express');   // Web framework
const { Pool } = require('pg');       // PostgreSQL client
require('dotenv').config();           // Loads variables from your .env file

const app = express();
const PORT = process.env.PORT || 3000;


// ─── Database Connection ──────────────────────────────────────────────────────
// Pool keeps a "pool" of reusable connections to PostgreSQL so we don't
// open and close a new connection for every single request.

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // When deployed on Railway, SSL is required. Locally it isn't needed.
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test the database connection on startup
pool.connect((err) => {
  if (err) {
    console.error('Database connection failed:', err.message);
  } else {
    console.log('Connected to PostgreSQL database');
  }
});


// ─── Middleware ───────────────────────────────────────────────────────────────
// Middleware runs on every request before it reaches a route.

app.use(express.json());           // Allows us to read JSON data sent in request bodies
app.use(express.static('public')); // Serves your HTML/CSS/JS files from the /public folder


// ─── API Key Auth ─────────────────────────────────────────────────────────────
// Protects external-facing API endpoints from unauthorised callers.
//
// How it works:
//   - The secret key is stored in your .env file as API_KEY
//   - Callers must include it in every request as a header:
//       x-api-key: your-secret-key
//   - If the key is missing or wrong, the server returns 401 Unauthorized
//
// This middleware is NOT applied globally — it is added individually to only
// the routes that need protection (currently just /api/log).
// The browser UI routes are left open because they are only useful if you are
// already on the page.

function requireApiKey(req, res, next) {
  const apiKey = process.env.API_KEY;

  // If no API_KEY is set in .env, skip the check and warn in the console
  if (!apiKey) {
    console.warn('WARNING: API_KEY is not set in .env — /api/log is unprotected!');
    return next();
  }

  const provided = req.headers['x-api-key'];

  if (!provided) {
    return res.status(401).json({ error: 'Missing API key. Add header: x-api-key: <your key>' });
  }

  if (provided !== apiKey) {
    return res.status(401).json({ error: 'Invalid API key.' });
  }

  next(); // Key is correct — allow the request through
}


// =============================================================================
// CUSTOMER ROUTES
// =============================================================================

// GET /api/customers  –  Get a list of all customers (for the sidebar list)
app.get('/api/customers', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, first_name, last_name, phone, email
       FROM customers
       ORDER BY last_name, first_name`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/customers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/customers/:id  –  Get full details of one customer
// :id is a URL parameter, e.g. /api/customers/5 gets customer with id=5
app.get('/api/customers/:id', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM customers WHERE id = $1',
      [req.params.id]   // $1 is a placeholder; pg replaces it safely (prevents SQL injection)
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('GET /api/customers/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/customers  –  Create a new customer
app.post('/api/customers', async (req, res) => {
  // Destructure the fields we expect from the request body
  const {
    first_name, last_name, phone, email,
    fb_handle, twitter_handle,
    custom_field_1, custom_field_2, custom_field_3,
    custom_field_4, custom_field_5
  } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO customers
         (first_name, last_name, phone, email, fb_handle, twitter_handle,
          custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,   // RETURNING * sends back the newly created row
      [first_name, last_name, phone, email, fb_handle, twitter_handle,
       custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/customers error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/customers/:id  –  Update an existing customer's details
app.put('/api/customers/:id', async (req, res) => {
  const {
    first_name, last_name, phone, email,
    fb_handle, twitter_handle,
    custom_field_1, custom_field_2, custom_field_3,
    custom_field_4, custom_field_5
  } = req.body;

  try {
    const result = await pool.query(
      `UPDATE customers
       SET first_name     = $1,
           last_name      = $2,
           phone          = $3,
           email          = $4,
           fb_handle      = $5,
           twitter_handle = $6,
           custom_field_1 = $7,
           custom_field_2 = $8,
           custom_field_3 = $9,
           custom_field_4 = $10,
           custom_field_5 = $11
       WHERE id = $12
       RETURNING *`,
      [first_name, last_name, phone, email, fb_handle, twitter_handle,
       custom_field_1, custom_field_2, custom_field_3, custom_field_4, custom_field_5,
       req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error('PUT /api/customers/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/customers/:id  –  Delete a customer and their history
app.delete('/api/customers/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM customers WHERE id = $1', [req.params.id]);
    res.json({ message: 'Customer deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/customers/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// =============================================================================
// CONTACT HISTORY ROUTES
// =============================================================================

// GET /api/customers/:id/history  –  Get last 10 contact records for a customer
app.get('/api/customers/:id/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM contact_history
       WHERE customer_id = $1
       ORDER BY contact_date DESC, contact_time DESC
       LIMIT 10`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('GET /api/customers/:id/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// POST /api/customers/:id/history  –  Add a new contact record
app.post('/api/customers/:id/history', async (req, res) => {
  const { contact_date, contact_time, agent, contact_to, duration, disposition_code, notes } = req.body;

  try {
    const result = await pool.query(
      `INSERT INTO contact_history
         (customer_id, contact_date, contact_time, agent, contact_to, duration, disposition_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [req.params.id, contact_date, contact_time, agent, contact_to, duration, disposition_code, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('POST /api/customers/:id/history error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// DELETE /api/history/:id  –  Delete a single contact history record
app.delete('/api/history/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM contact_history WHERE id = $1', [req.params.id]);
    res.json({ message: 'Contact record deleted' });
  } catch (err) {
    console.error('DELETE /api/history/:id error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// =============================================================================
// EXTERNAL LOG ROUTE
// =============================================================================
// POST /api/log  –  Add a contact history record by looking up the customer
//                   via phone number or email address.
//
// This is designed for external systems (phone platforms, other apps, etc.)
// that don't know your internal customer IDs.
//
// Request body (JSON):
// {
//   "lookup_phone": "082 555 0100",   ← find customer by phone  (use one or the other)
//   "lookup_email": "jane@example.com", ← find customer by email
//
//   "contact_date":     "2024-03-15",   ← required  (YYYY-MM-DD)
//   "contact_time":     "14:30",        ← required  (HH:MM)
//   "agent":            "Ernst",        ← optional
//   "contact_to":       "082 555 0100", ← optional  (number/email the customer used)
//   "duration":         "5:30",         ← optional
//   "disposition_code": "RESOLVED",     ← optional
//   "notes":            "Called re account query" ← optional, max 100 chars
// }
//
// Success response (201):
// {
//   "history": { ...the new contact record... },
//   "customer": { id, first_name, last_name, phone, email }
// }
//
// Error responses:
//   400  –  missing required fields
//   404  –  no customer found with that phone/email
//   409  –  more than one customer matched (be more specific)
//   500  –  database error

app.post('/api/log', requireApiKey, async (req, res) => {
  const {
    lookup_phone, lookup_email,
    contact_date, contact_time,
    agent, contact_to, duration, disposition_code, notes
  } = req.body;

  // ── Validate required fields ────────────────────────────────────────────
  if (!lookup_phone && !lookup_email) {
    return res.status(400).json({
      error: 'Provide either lookup_phone or lookup_email to identify the customer.'
    });
  }
  if (!contact_date || !contact_time) {
    return res.status(400).json({ error: 'contact_date and contact_time are required.' });
  }

  try {
    // ── Find the customer ────────────────────────────────────────────────
    // Search by phone OR email depending on what was provided.
    // We strip spaces from phone numbers so "082 555 0100" matches "0825550100".
    let customerResult;

    if (lookup_phone) {
      customerResult = await pool.query(
        `SELECT id, first_name, last_name, phone, email
         FROM customers
         WHERE REPLACE(phone, ' ', '') = REPLACE($1, ' ', '')`,
        [lookup_phone]
      );
    } else {
      customerResult = await pool.query(
        `SELECT id, first_name, last_name, phone, email
         FROM customers
         WHERE LOWER(email) = LOWER($1)`,
        [lookup_email]
      );
    }

    if (customerResult.rows.length === 0) {
      return res.status(404).json({
        error: `No customer found with ${lookup_phone ? 'phone: ' + lookup_phone : 'email: ' + lookup_email}`
      });
    }
    if (customerResult.rows.length > 1) {
      return res.status(409).json({
        error: 'More than one customer matched. Use a more specific value.',
        matches: customerResult.rows
      });
    }

    const customer = customerResult.rows[0];

    // ── Insert the contact history record ────────────────────────────────
    const historyResult = await pool.query(
      `INSERT INTO contact_history
         (customer_id, contact_date, contact_time, agent, contact_to, duration, disposition_code, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [customer.id, contact_date, contact_time, agent, contact_to, duration, disposition_code,
       notes ? notes.substring(0, 500) : null]   // Enforce 500-char limit server-side too
    );

    res.status(201).json({
      history:  historyResult.rows[0],
      customer: customer
    });

  } catch (err) {
    console.error('POST /api/log error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// =============================================================================
// SETTINGS ROUTES  –  Used for labelling the 5 custom fields
// =============================================================================

// GET /api/settings  –  Get all settings (including custom field labels)
app.get('/api/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings ORDER BY key');
    // Convert the array of rows into a simple { key: value } object
    const settings = {};
    result.rows.forEach(row => {
      settings[row.key] = row.value;
    });
    res.json(settings);
  } catch (err) {
    console.error('GET /api/settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// PUT /api/settings  –  Update one or more settings
// Send a JSON body like: { "custom_label_1": "LinkedIn", "custom_label_2": "Company" }
app.put('/api/settings', async (req, res) => {
  try {
    const updates = req.body;
    for (const [key, value] of Object.entries(updates)) {
      // "UPSERT": insert if the key doesn't exist, update if it does
      await pool.query(
        `INSERT INTO settings (key, value)
         VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, value]
      );
    }
    res.json({ message: 'Settings saved successfully' });
  } catch (err) {
    console.error('PUT /api/settings error:', err.message);
    res.status(500).json({ error: err.message });
  }
});


// =============================================================================
// START THE SERVER
// =============================================================================

app.listen(PORT, () => {
  console.log(`CRM server is running at http://localhost:${PORT}`);
});
