const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");

// ================= GET ALL RECORDS =================
router.get("/", verifyToken, (req, res) => {
  const { date } = req.query;
  let sql = "SELECT * FROM billiard";
  const params = [];

  if (date) {
    sql += " WHERE date = ?";
    params.push(date);
  }

  sql += " ORDER BY id DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);

    // Calculate total dynamically
    const dataWithTotal = rows.map((r) => ({
      ...r,
      total: Number(r.token || 0) + Number(r.cash || 0) + Number(r.cash_momo || 0)
    }));

    res.json(dataWithTotal);
  });
});

// ================= ADD RECORD =================
router.post("/", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { date, token, cash, cash_momo } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  const sql = "INSERT INTO billiard (date, token, cash, cash_momo) VALUES (?, ?, ?, ?)";

  db.query(
    sql,
    [date, Number(token || 0), Number(cash || 0), Number(cash_momo || 0)],
    (err, result) => {
      if (err) return res.status(500).json(err);

      db.query("SELECT * FROM billiard WHERE id = ?", [result.insertId], (err2, rows) => {
        if (err2) return res.status(500).json(err2);

        const row = rows[0];
        row.total = Number(row.token || 0) + Number(row.cash || 0) + Number(row.cash_momo || 0);

        logActivity({
          userId: req.user.userId,
          username: req.user.username,
          action: `Added new BILLIARD record for: ${date}`,
          page: "BILLIARD",
          branch_id: req.user.branch_id,
          ip: req.ip
        });

        res.json(row);
      });
    }
  );
});

// ================= UPDATE RECORD =================
router.put("/:id", verifyToken, (req, res) => {
  const { token, cash, cash_momo } = req.body;
  const { id } = req.params;

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM billiard WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (rows.length === 0) return res.status(404).json({ message: "Not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === 'ADMIN' || req.user.role === 'SUPER_ADMIN';

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "Record is locked and cannot be edited by staff." });
    }

    const newLockStatus = isAdmin ? isLocked : 1;

    const sql = "UPDATE billiard SET token=?, cash=?, cash_momo=?, is_locked=? WHERE id=?";

    db.query(sql, [Number(token || 0), Number(cash || 0), Number(cash_momo || 0), newLockStatus, id], (err2) => {
      if (err2) return res.status(500).json(err2);

      db.query("SELECT * FROM billiard WHERE id = ?", [id], (err3, finalRows) => {
        if (err3) return res.status(500).json(err3);

        const row = finalRows[0];
        row.total = Number(row.token || 0) + Number(row.cash || 0) + Number(row.cash_momo || 0);
        res.json(row);
      });
    });
  });
});

// ================= DELETE RECORD =================
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM billiard WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);

    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted BILLIARD record ID: ${id}`,
      page: "BILLIARD",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Billiard record deleted successfully" });
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
    "SELECT SUM(token + cash + cash_momo) AS total FROM billiard WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM(token + cash + cash_momo) AS total FROM billiard WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM(token + cash + cash_momo) AS total FROM billiard WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM(token + cash + cash_momo) AS total FROM billiard WHERE date >= ? AND date <= ?",
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