const express = require("express");
const router = express.Router();
const db = require("../db");
const verifyToken = require("../middleware/AuthMiddlewares");
const allowRoles = require("../middleware/roleMiddleware");

/* =============================
   BUSINESS DATE (3PM RWANDA)
============================= */

function getBusinessDate() {
  const now = new Date();

  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const rwandaTime = new Date(utc + (2 * 60 * 60 * 1000));

  if (rwandaTime.getHours() < 15) {
    rwandaTime.setDate(rwandaTime.getDate() - 1);
  }

  return rwandaTime.toISOString().split("T")[0];
}

/* =============================
   STATS ROUTE FIXED
============================= */

router.get("/stats/timePeriods", verifyToken, (req, res) => {

  const todayStr = getBusinessDate();
  const today = new Date(todayStr);

  const weekStart = new Date(today);
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartStr = weekStart.toISOString().split("T")[0];

  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, '0');
  const monthStartStr = `${y}-${m}-01`;

  const yearStart = new Date(today.getFullYear(), 0, 1);
  const yearStartStr = yearStart.toISOString().split("T")[0];

  db.query(
    "SELECT SUM(sold * price) AS total FROM bar_products WHERE date = ?",
    [todayStr],
    (err1, dayResult) => {

      if (err1) return res.status(500).json(err1);
      const dayTotal = dayResult[0]?.total || 0;

      db.query(
        "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
        [weekStartStr, todayStr],
        (err2, weekResult) => {

          if (err2) return res.status(500).json(err2);
          const weekTotal = weekResult[0]?.total || 0;

          db.query(
            "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
            [monthStartStr, todayStr],
            (err3, monthResult) => {

              if (err3) return res.status(500).json(err3);
              const monthTotal = monthResult[0]?.total || 0;

              db.query(
                "SELECT SUM(sold * price) AS total FROM bar_products WHERE date >= ? AND date <= ?",
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