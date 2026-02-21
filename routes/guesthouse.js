const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GUESTHOUSE RECORDS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM guesthouse ORDER BY date DESC";
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Map rooms to include totals
    const rooms = rows.map((r) => {
      const vipPrice = Number(r.vip || 0);
      const normalPrice = Number(r.normal || 0);
      const totalPrice = vipPrice + normalPrice;
      const totalRoomsSold = (r.vip > 0 ? 1 : 0) + (r.normal > 0 ? 1 : 0); // optional, count rooms sold

      return {
        ...r,
        totalPrice,
        totalRoomsSold,
      };
    });

    // Calculate card totals
    const totalSales = rooms.reduce((sum, r) => sum + r.totalPrice, 0);
    const totalRoomsSold = rooms.reduce((sum, r) => sum + r.totalRoomsSold, 0);

    res.json({ rooms, totalSales, totalRoomsSold });
  });
});

// ================= ADD NEW DATE =================
router.post("/", (req, res) => {
  const { date, vip, normal } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  const sql =
    "INSERT INTO guesthouse (date, vip, normal) VALUES (?, ?, ?)";
  db.query(sql, [date, vip || 0, normal || 0], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Guesthouse date added successfully", id: result.insertId });
  });
});

// ================= UPDATE VIP AND NORMAL ROOM PRICES =================
router.put("/update/:id", (req, res) => {
  const { vip, normal } = req.body;
  const { id } = req.params;

  const sql = "UPDATE guesthouse SET vip=?, normal=? WHERE id=?";
  db.query(sql, [vip || 0, normal || 0, id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Room prices updated successfully" });
  });
});

// ================= DELETE RECORD =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM guesthouse WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Record deleted successfully" });
  });
});

module.exports = router;