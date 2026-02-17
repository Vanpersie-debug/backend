const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GUESTHOUSE RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM guesthouse ORDER BY date DESC";
  db.query(sql, (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json(results);
  });
});

// ================= ADD NEW DATE =================
router.post("/", (req, res) => {
  const { date, price } = req.body;

  if (!date || !price) {
    return res.status(400).json({ message: "Date and price are required" });
  }

  const sql =
    "INSERT INTO guesthouse (date, price, status) VALUES (?, ?, 'Available')";
  db.query(sql, [date, price], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json({ message: "Guesthouse date added successfully" });
  });
});

// ================= UPDATE PRICE =================
router.put("/update/:id", (req, res) => {
  const { price } = req.body;
  const { id } = req.params;

  if (!price) {
    return res.status(400).json({ message: "Price is required" });
  }

  const sql = "UPDATE guesthouse SET price=? WHERE id=?";
  db.query(sql, [price, id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json({ message: "Price updated successfully" });
  });
});

// ================= MARK AS OCCUPIED =================
router.put("/occupy/:id", (req, res) => {
  const { id } = req.params;

  const sql = "UPDATE guesthouse SET status='Occupied' WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }
    res.json({ message: "Room marked as occupied" });
  });
});

module.exports = router;
