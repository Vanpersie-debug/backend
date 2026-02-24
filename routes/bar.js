const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================================
// HELPER FUNCTION – Calculate and Return Data
// =====================================================
function processAndReturn(rows, res) {
  const products = rows.map((p) => {
    const total_stock = Number(p.opening_stock) + Number(p.entree);
    const closing_stock = Math.max(total_stock - Number(p.sold), 0);
    const total_sold = Number(p.sold) * Number(p.price);
    const profit =
      Number(p.sold) * (Number(p.price) - Number(p.initial_price));

    return {
      ...p,
      total_stock,
      closing_stock,
      total_sold,
      profit,
    };
  });

  const totalEarned = products.reduce(
    (sum, p) => sum + p.total_sold,
    0
  );

  res.json({ products, totalEarned });
}

// =====================================================
// GET PRODUCTS BY DATE
// =====================================================
router.get("/", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  db.query(
    "SELECT * FROM bar_products WHERE date = ? ORDER BY id DESC",
    [date],
    (err, rows) => {
      if (err) return res.status(500).json(err);

      return processAndReturn(rows, res);
    }
  );
});

// =====================================================
// ADD PRODUCT
// =====================================================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } =
    req.body;

  if (!name || !date) {
    return res
      .status(400)
      .json({ message: "Name and date required" });
  }

  db.query(
    `INSERT INTO bar_products
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [
      name,
      initial_price || 0,
      price || 0,
      opening_stock || 0,
      date,
    ],
    (err, result) => {
      if (err) return res.status(500).json(err);

      res.json({
        message: "Product added successfully",
        id: result.insertId,
      });
    }
  );
});

// =====================================================
// UPDATE ENTREE & SOLD
// =====================================================
router.put("/stock/:id", (req, res) => {
  const { entree = 0, sold = 0, date } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products 
     SET entree = ?, sold = ?
     WHERE id = ? AND date = ?`,
    [entree, sold, req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Stock updated successfully" });
    }
  );
});

// =====================================================
// UPDATE COST & SELLING PRICE ONLY
// =====================================================
router.put("/price/:id", (req, res) => {
  const { initial_price, price, date } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  if (initial_price === undefined || price === undefined) {
    return res
      .status(400)
      .json({ message: "Cost and selling price required" });
  }

  db.query(
    `UPDATE bar_products
     SET initial_price = ?, price = ?
     WHERE id = ? AND date = ?`,
    [initial_price, price, req.params.id, date],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Price updated successfully" });
    }
  );
});

module.exports = router;