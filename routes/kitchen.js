const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET FOODS BY DATE =================
router.get("/", (req, res) => {
  const date = req.query.date;
  if (!date) return res.status(400).json({ message: "Date is required" });

  const sql = "SELECT * FROM kitchen_products WHERE date = ? ORDER BY id DESC";
  db.query(sql, [date], (err, rows) => {
    if (err) return res.status(500).json(err);

    const foods = rows.map((f) => {
      const price = Number(f.price) || 0;
      const initial_price = Number(f.initial_price) || 0;
      const opening_stock = Number(f.quantity) || 0;
      const entree = Number(f.entree) || 0;
      const sold = Number(f.sold) || 0;

      const total_stock = opening_stock + entree;
      const total_sold = sold * price;
      const profit = sold * (price - initial_price);
      const closing_stock = total_stock - sold;

      return {
        ...f,
        total_stock,
        total_sold,
        profit,
        closing_stock,
      };
    });

    const totalEarned = foods.reduce((sum, f) => sum + f.total_sold, 0);
    const totalProfit = foods.reduce((sum, f) => sum + f.profit, 0);
    const totalStockValue = foods.reduce(
      (sum, f) => sum + f.closing_stock * (Number(f.initial_price) || 0),
      0
    );
    const lowStockCount = foods.filter((f) => f.closing_stock < 5).length;

    res.json({ foods, totalEarned, totalProfit, totalStockValue, lowStockCount });
  });
});

// ================= ADD FOOD =================
router.post("/", (req, res) => {
  const { name, initial_price, price, quantity, date } = req.body;
  if (!name || !date)
    return res.status(400).json({ message: "Name and date are required" });

  const sql = `
    INSERT INTO kitchen_products
    (name, initial_price, price, quantity, entree, sold, date)
    VALUES (?, ?, ?, ?, 0, 0, ?)
  `;
  db.query(sql, [name, initial_price || 0, price || 0, quantity || 0, date], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Food added successfully", id: result.insertId });
  });
});

// ================= UPDATE ENTREE =================
router.put("/entree/:id", (req, res) => {
  const { entree, date } = req.body;
  const id = req.params.id;
  if (entree == null || !date)
    return res.status(400).json({ message: "Entree and date are required" });

  const sql = "UPDATE kitchen_products SET entree = ? WHERE id = ? AND date = ?";
  db.query(sql, [entree, id, date], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Entree updated successfully" });
  });
});

// ================= UPDATE SOLD =================
router.put("/sold/:id", (req, res) => {
  const { sold, date } = req.body;
  const id = req.params.id;
  if (sold == null || !date)
    return res.status(400).json({ message: "Sold and date are required" });

  const sql = "UPDATE kitchen_products SET sold = ? WHERE id = ? AND date = ?";
  db.query(sql, [sold, id, date], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Sold updated successfully" });
  });
});

module.exports = router;