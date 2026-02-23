const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET BY DATE =================
router.get("/", (req, res) => {
  const date = req.query.date;
  if (!date)
    return res.status(400).json({ message: "Date is required" });

  db.query(
    "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
    [date],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      const products = rows.map((p) => {
        const total_stock = p.opening_stock + p.entree;
        const total_sold = p.sold * p.price;
        const profit = p.sold * (p.price - p.initial_price);
        const closing_stock = total_stock - p.sold;

        return { ...p, total_stock, total_sold, profit, closing_stock };
      });

      const totalEarned = products.reduce(
        (sum, p) => sum + p.total_sold,
        0
      );

      res.json({ products, totalEarned });
    }
  );
});

// ================= ADD =================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;

  if (!name || !date)
    return res.status(400).json({ message: "Name and date required" });

  db.query(
    `INSERT INTO bar_products
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [name, initial_price || 0, price || 0, opening_stock || 0, date],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Product added successfully",
        id: result.insertId,
      });
    }
  );
});

// ================= UPDATE =================
router.put("/:id", (req, res) => {
  const { entree = 0, sold = 0, date } = req.body;

  if (!date)
    return res.status(400).json({ message: "Date required" });

  db.query(
    "UPDATE bar_products SET entree = ?, sold = ? WHERE id = ? AND date = ?",
    [entree, sold, req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Updated successfully" });
    }
  );
});

// ================= DELETE =================
router.delete("/:id", (req, res) => {
  const { date } = req.query;
  if (!date)
    return res.status(400).json({ message: "Date required" });

  db.query(
    "DELETE FROM bar_products WHERE id = ? AND date = ?",
    [req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);

      res.json({ message: "Deleted successfully" });
    }
  );
});

module.exports = router;