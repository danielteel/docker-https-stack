import express from "express";
import pkg from "pg";

const { Pool } = pkg;
const app = express();
const PORT = 3000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Routes
app.get("/api/hello", (req, res) => {
  res.json({ message: "Hello from Node.js backend!" });
});

app.get("/api/dbtest", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");
    res.json({ db_time: result.rows[0].now });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database query failed" });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});