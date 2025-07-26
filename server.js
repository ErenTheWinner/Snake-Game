const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');

const app = express();
const db = new sqlite3.Database('db.sqlite3');

app.use(cors());
app.use(express.json());

// Better static file serving with absolute path
app.use(express.static(path.join(__dirname, 'public')));

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

// Root route that serves index.html explicitly
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Also serve snake.html at root if that's what you're using
app.get('/', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  const snakePath = path.join(__dirname, 'public', 'snake.html');
  
  // Try index.html first, then snake.html
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else if (require('fs').existsSync(snakePath)) {
    res.sendFile(snakePath);
  } else {
    res.send('Put your HTML file in the public folder as index.html or snake.html');
  }
});

// Create table and only after start server
db.run(`CREATE TABLE IF NOT EXISTS leaderboard (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  date TEXT NOT NULL
)`, (err) => {
  if (err) {
    console.error("Error creating table:", err.message);
    process.exit(1);
  }
  
  console.log("✅ Database table ready");
  
  // Start the server only after table is ready
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`✅ Server running at http://localhost:${PORT}`);
    console.log(`📁 Serving static files from: ${path.join(__dirname, 'public')}`);
  });
});

// POST score endpoint
app.post('/score', (req, res) => {
  const { name, score, date } = req.body;
  console.log('Received score:', { name, score, date });
  
  db.run('INSERT INTO leaderboard (name, score, date) VALUES (?, ?, ?)',
    [name, score, date],
    function (err) {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Score saved with ID:', this.lastID);
      res.json({ success: true, id: this.lastID });
    }
  );
});

// GET leaderboard endpoint
app.get('/leaderboard', (req, res) => {
  console.log('Fetching leaderboard...');
  
  db.all('SELECT name, score, date FROM leaderboard ORDER BY score DESC LIMIT 5',
    [],
    (err, rows) => {
      if (err) {
        console.error('Database error:', err.message);
        return res.status(500).json({ error: err.message });
      }
      console.log('Leaderboard data:', rows);
      res.json(rows);
    }
  );
});