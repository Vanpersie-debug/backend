const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET FOODS BY DATE =================
router.get("/", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ message: "Date is required" });

  const sql = "SELECT * FROM kitchen_products WHERE date = ?";
  db.query(sql, [date], (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate total earned
    const totalEarned = rows.reduce((sum, f) => {
      const price = Number(f.price);
      const sold = Number(f.sold || 0);
      return sum + price * sold;
    }, 0);

    res.json({ foods: rows, totalEarned });
  });
});

// ================= ADD FOOD =================
router.post("/", (req, res) => {
  const { name, price, quantity, date } = req.body;
  if (!name || !price || !quantity || !date)
    return res.status(400).json({ message: "All fields required" });

  const sql = `
    INSERT INTO kitchen_products
    (name, price, quantity, entree, sold, date)
    VALUES (?, ?, ?, 0, 0, ?)
  `;

  db.query(sql, [name, price, quantity, date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Food added", id: result.insertId });
  });
});

// ================= UPDATE ENTREE =================
router.put("/entree/:id", (req, res) => {
  const { entree, date } = req.body;
  const id = req.params.id;
  if (entree == null || !date)
    return res.status(400).json({ message: "Entree and date are required" });

  const sql = "UPDATE kitchen_products SET entree = ? WHERE id = ? AND date = ?";
  db.query(sql, [entree, id, date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Entree updated" });
  });
});

// ================= UPDATE SOLD =================
router.put("/sold/:id", (req, res) => {
  const { sold, date } = req.body;
  const id = req.params.id;
  if (sold == null || !date)
    return res.status(400).json({ message: "Sold and date are required" });

  const sql = "UPDATE kitchen_products SET sold = ? WHERE id = ? AND date = ?";
  db.query(sql, [sold, id, date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Sold updated" });
  });
});

module.exports = router;