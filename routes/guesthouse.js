const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");

// ================= GET BY DATE =================
router.get("/", verifyToken, (req, res) => {
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
router.post("/", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { date, vip, normal, vip_price, normal_price } = req.body;

  if (!date) {
    return res.status(400).json({ message: "Ntamakuru ahari y' izi tariki" });
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

      logActivity({
        userId: req.user.userId,
        username: req.user.username,
        action: `Added new GUESTHOUSE record for: ${date}`,
        page: "GUESTHOUSE",
        branch_id: req.user.branch_id,
        ip: req.ip
      });

      res.json({
        message: "Guesthouse record added",
        id: result.insertId,
      });
    }
  );
});

// ================= UPDATE =================
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  const fields = req.body;

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM guesthouse WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "Record is locked and cannot be edited by staff." });
    }

    const newLockStatus = isAdmin ? isLocked : 1;
    const updateData = { ...fields, is_locked: newLockStatus };

    const sql = "UPDATE guesthouse SET ? WHERE id = ?";

    db.query(sql, [updateData, id], (err2) => {
      if (err2) {
        console.error(err2);
        return res.status(500).json(err2);
      }

      res.json({ message: "Updated successfully", is_locked: newLockStatus });
    });
  });
});

// ================= DELETE =================
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;

  const sql = "DELETE FROM guesthouse WHERE id = ?";

  db.query(sql, [id], (err) => {
    if (err) {
      console.error(err);
      return res.status(500).json(err);
    }

    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted GUESTHOUSE record ID: ${id}`,
      page: "GUESTHOUSE",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Deleted successfully" });
  });
});

// ================= GET STATS - DAY, WEEK, MONTH, YEAR TOTALS =================
router.get("/stats/timePeriods", verifyToken, (req, res) => {
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  
  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];
  
  // FIXED: Monthly reset logic (exact 1st of current month)
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const monthStartStr = `${y}-${m}-01`;
  
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearStartStr = yearStart.toISOString().split("T")[0];

  db.query(
    "SELECT SUM((vip * vip_price) + (normal * normal_price)) AS total FROM guesthouse WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM((vip * vip_price) + (normal * normal_price)) AS total FROM guesthouse WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM((vip * vip_price) + (normal * normal_price)) AS total FROM guesthouse WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM((vip * vip_price) + (normal * normal_price)) AS total FROM guesthouse WHERE date >= ? AND date <= ?",
                [yearStartStr, todayStr],
                (err4, yearResult) => {
                  if (err4) return res.status(500).json(err4);
                  const yearTotal = yearResult[0]?.total || 0;

                  res.json({
                    day: Number(dayTotal) || 0,
                    week: Number(weekTotal) || 0,
                    month: Number(monthTotal) || 0,
                    year: Number(yearTotal) || 0,
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;