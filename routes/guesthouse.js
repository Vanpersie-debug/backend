const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET BY DATE =================
router.get("/", (req, res) => {
  const { date } = req.query;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  const sql = "SELECT * FROM guesthouse WHERE date = ? ORDER BY id DESC";

  db.query(sql, [date], (err, rows) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json({ rooms: rows });
  });
});

// ================= INSERT =================
router.post("/", (req, res) => {
  const { date, vip, normal, vip_price, normal_price } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }

  const sql = `
    INSERT INTO guesthouse 
    (date, vip, normal, vip_price, normal_price)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(
    sql,
    [
      date,
      vip || 0,
      normal || 0,
      vip_price || 0,
      normal_price || 0
    ],
    (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).json(err);
      }

      res.json({
        message: "Guesthouse record added",
        id: result.insertId,
      });
    }
  );
});

// ================= UPDATE =================
router.put("/:id", (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  const sql = "UPDATE guesthouse SET ? WHERE id = ?";

  db.query(sql, [fields, id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json({ message: "Updated successfully" });
  });
});

// ================= DELETE =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM guesthouse WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    res.json({ message: "Deleted successfully" });
  });
});

module.exports = router;