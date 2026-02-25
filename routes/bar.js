const express = require("express");
const router = express.Router();
const db = require("../db");

// =====================================================
// HELPER FUNCTION – CALCULATE VALUES
// =====================================================
function processAndReturn(rows, res) {
  const products = rows.map((p) => {
    const opening_stock = Number(p.opening_stock || 0);
    const entree = Number(p.entree || 0);
    const sold = Number(p.sold || 0);
    const price = Number(p.price || 0);
    const initial_price = Number(p.initial_price || 0);

    const total_stock = opening_stock + entree;
    const closing_stock = Math.max(total_stock - sold, 0);
    const total_sold = sold * price;
    const profit = sold * (price - initial_price);

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
      processAndReturn(rows, res);
    }
  );
});

// =====================================================
// ADD PRODUCT
// =====================================================
router.post("/", (req, res) => {
  const { name, initial_price, price, opening_stock, date } = req.body;

  if (!name || !date) {
    return res.status(400).json({ message: "Name and date required" });
  }

  db.query(
    `INSERT INTO bar_products 
     (name, initial_price, price, opening_stock, entree, sold, date)
     VALUES (?, ?, ?, ?, 0, 0, ?)`,
    [
      name,
      Number(initial_price) || 0,
      Number(price) || 0,
      Number(opening_stock) || 0,
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
// UPDATE STOCK (ENTREE + SOLD)
// PUT /api/drinks/stock/:id
// =====================================================
router.put("/stock/:id", (req, res) => {
  const { entree, sold, date } = req.body;
  const { id } = req.params;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products
     SET entree = ?, sold = ?
     WHERE id = ? AND date = ?`,
    [
      Number(entree) || 0,
      Number(sold) || 0,
      id,
      date,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Stock updated successfully" });
    }
  );
});

// =====================================================
// UPDATE PRICE
// PUT /api/drinks/price/:id
// =====================================================
router.put("/price/:id", (req, res) => {
  const { initial_price, price, date } = req.body;
  const { id } = req.params;

  if (!date) {
    return res.status(400).json({ message: "Date required" });
  }

  db.query(
    `UPDATE bar_products
     SET initial_price = ?, price = ?
     WHERE id = ? AND date = ?`,
    [
      Number(initial_price) || 0,
      Number(price) || 0,
      id,
      date,
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Price updated successfully" });
    }
  );
});

module.exports = router;