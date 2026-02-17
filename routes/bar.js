const express = require("express");
const router = express.Router();
const db = require("../db"); // your db.js with Aiven connection

// ================= GET drinks by date =================
// GET /api/drinks?date=YYYY-MM-DD
router.get("/", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ message: "Date is required" });

  db.query(
    "SELECT * FROM bar_products WHERE date = ?",
    [date],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      // Calculate total earned (sold * price)
      const totalEarned = rows.reduce((sum, p) => sum + (p.sold || 0) * p.price, 0);

      res.json({ products: rows, totalEarned });
    }
  );
});

// ================= ADD a drink =================
// POST /api/drinks
router.post("/", (req, res) => {
  const { name, price, quantity, date } = req.body;
  if (!name || !price || !quantity || !date)
    return res.status(400).json({ message: "All fields required" });

  db.query(
    "INSERT INTO bar_products (name, price, quantity, entree, sold, date) VALUES (?, ?, ?, 0, 0, ?)",
    [name, price, quantity, date],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Drink added", id: result.insertId });
    }
  );
});

// ================= UPDATE entree =================
// PUT /api/drinks/entree/:id
router.put("/entree/:id", (req, res) => {
  const { entree, date } = req.body;
  if (entree === undefined || !date)
    return res.status(400).json({ message: "Entree and date are required" });

  db.query(
    "UPDATE bar_products SET entree = ? WHERE id = ? AND date = ?",
    [entree, req.params.id, date],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Entree updated" });
    }
  );
});

// ================= UPDATE sold =================
// PUT /api/drinks/sold/:id
router.put("/sold/:id", (req, res) => {
  const { sold, date } = req.body;
  if (sold === undefined || !date)
    return res.status(400).json({ message: "Sold and date are required" });

  db.query(
    "UPDATE bar_products SET sold = ? WHERE id = ? AND date = ?",
    [sold, req.params.id, date],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Sold updated" });
    }
  );
});

module.exports = router;