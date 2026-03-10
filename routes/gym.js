const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL GYM RECORDS (FILTER BY DATE) =================
router.get("/", (req, res) => {
  const { date } = req.query;
  let sql = "SELECT * FROM gym";
  const params = [];

  if (date) {
    sql += " WHERE date = ?";
    params.push(date);
  }

  sql += " ORDER BY date DESC";

  db.query(sql, params, (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json({ records: rows });
  });
});

// ================= ADD GYM RECORD =================
router.post("/", (req, res) => {
  let { date, daily_people, monthly_people, cash, cash_momo } = req.body;

  if (!date) return res.status(400).json({ message: "Date is required" });

  daily_people = Number(daily_people || 0);
  monthly_people = Number(monthly_people || 0);
  cash = Number(cash || 0);
  cash_momo = Number(cash_momo || 0);
  const total_people = daily_people + monthly_people;

  const sql = `
    INSERT INTO gym
    (date, daily_people, monthly_people, total_people, cash, cash_momo)
    VALUES (?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [date, daily_people, monthly_people, total_people, cash, cash_momo], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Gym record added", id: result.insertId });
  });
});

// ================= UPDATE GYM RECORD =================
router.put("/:id", verifyToken, (req, res) => {
  const { id } = req.params;
  let { daily_people, monthly_people, cash, cash_momo } = req.body;

  // 1. Check if record is locked
  db.query("SELECT is_locked FROM gym WHERE id = ?", [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) return res.status(404).json({ message: "Record not found" });

    const isLocked = rows[0].is_locked;
    const isAdmin = req.user.role === "SUPER_ADMIN" || req.user.role === "ADMIN";

    if (isLocked && !isAdmin) {
      return res.status(403).json({ message: "This record is locked and can only be edited by an Admin." });
    }

    daily_people = Number(daily_people || 0);
    monthly_people = Number(monthly_people || 0);
    cash = Number(cash || 0);
    cash_momo = Number(cash_momo || 0);
    const total_people = daily_people + monthly_people;

    // 2. Perform update (and set is_locked = 1 if non-admin)
    const newLockStatus = isAdmin ? isLocked : 1;
    const sql = `
      UPDATE gym
      SET daily_people=?, monthly_people=?, total_people=?, cash=?, cash_momo=?, is_locked=?
      WHERE id=?
    `;
    db.query(sql, [daily_people, monthly_people, total_people, cash, cash_momo, newLockStatus, id], (err2) => {
      if (err2) return res.status(500).json(err2);
      res.json({ message: "Gym record updated successfully", is_locked: newLockStatus });
    });
  });
});

const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");
const logActivity = require("../utils/activityLogger");

// ================= DELETE GYM RECORD =================
router.delete("/:id", verifyToken, allowRoles("SUPER_ADMIN", "ADMIN"), (req, res) => {
  const { id } = req.params;
  const sql = "DELETE FROM gym WHERE id=?";
  db.query(sql, [id], (err) => {
    if (err) return res.status(500).json(err);
    
    logActivity({
      userId: req.user.userId,
      username: req.user.username,
      action: `Deleted GYM record ID: ${id}`,
      page: "GYM",
      branch_id: req.user.branch_id,
      ip: req.ip
    });

    res.json({ message: "Gym record deleted successfully" });
  });
});

// ================= GET STATS - DAY, WEEK, MONTH, YEAR TOTALS =================
router.get("/stats/timePeriods", (req, res) => {
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
    "SELECT SUM(cash + cash_momo) AS total FROM gym WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {
      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM(cash + cash_momo) AS total FROM gym WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {
          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM(cash + cash_momo) AS total FROM gym WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {
              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM(cash + cash_momo) AS total FROM gym WHERE date >= ? AND date <= ?",
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