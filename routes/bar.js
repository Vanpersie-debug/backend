const express = require("express");
const router = express.Router();
const db = require("../db");

// ==========================================
// GET drinks by date
// GET /api/drinks?date=YYYY-MM-DD
// ==========================================
router.get("/", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ message: "Date is required" });

  db.query("SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC", [date], (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate dynamic totals
    const products = rows.map((p) => {
      const initial_price = Number(p.initial_price) || 0;
      const price = Number(p.price) || 0;
      const opening_stock = Number(p.opening_stock) || 0;
      const entree = Number(p.entree) || 0;
      const sold = Number(p.sold) || 0;

      const total_stock = opening_stock + entree;
      const total_sold = sold * price;
      const profit = sold * (price - initial_price);
      const closing_stock = total_stock - sold;

      return {
        ...p,
        total_stock,
        total_sold,
        profit,
        closing_stock,
      };
    });

    const totalEarned = products.reduce((sum, p) => sum + p.total_sold, 0);

    res.json({ products, totalEarned });
  });
});

// ==========================================
// ADD a drink
// POST /api/drinks
// ==========================================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;
  if (!name || !date) return res.status(400).json({ message: "Name and date are required" });

  db.query(
    `INSERT INTO bar_products 
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [name, initial_price || 0, price || 0, opening_stock || 0, date],
    (err, result) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Drink added successfully", id: result.insertId });
    }
  );
});

// ==========================================
// UPDATE entree or sold (dynamic totals calculated on GET)
// PUT /api/drinks/:id
// ==========================================
router.put("/:id", (req, res) => {
  const { entree, sold, date } = req.body;
  if (!date) return res.status(400).json({ message: "Date is required" });

  db.query(
    "UPDATE bar_products SET entree = COALESCE(?, entree), sold = COALESCE(?, sold) WHERE id = ? AND date = ?",
    [entree, sold, req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Product updated successfully" });
    }
  );
});

// ==========================================
// DELETE a drink
// DELETE /api/drinks/:id?date=YYYY-MM-DD
// ==========================================
router.delete("/:id", (req, res) => {
  const { date } = req.query;
  if (!date) return res.status(400).json({ message: "Date is required" });

  db.query("DELETE FROM bar_products WHERE id = ? AND date = ?", [req.params.id, date], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Drink deleted successfully" });
  });
});

module.exports = router;