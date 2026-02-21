const express = require("express");
const router = express.Router();
const db = require("../db");

// ================= GET ALL CREDITS =================
router.get("/", (req, res) => {
  const sql = "SELECT * FROM credits ORDER BY id DESC";

  db.query(sql, (err, rows) => {
    if (err) {
      console.error("FETCH ERROR:", err);
      return res.status(500).json(err);
    }

    // Dashboard totals
    const totalPayment = rows.reduce(
      (sum, r) => sum + Number(r.payment || 0),
      0
    );

    const totalCredit = rows.reduce(
      (sum, r) => sum + Number(r.credit || 0),
      0
    );

    const totalRemaining = rows.reduce(
      (sum, r) => sum + Number(r.remaining || 0),
      0
    );

    res.json({
      records: rows,
      totalPayment,
      totalCredit,
      totalRemaining,
    });
  });
});

// ================= ADD NEW CREDIT =================
router.post("/", (req, res) => {
  const { name, payment, credit } = req.body;

  if (!name)
    return res.status(400).json({ message: "Name is required" });

  const sql = `
    INSERT INTO credits (name, payment, credit)
    VALUES (?, ?, ?)
  `;

  db.query(
    sql,
    [
      name,
      Number(payment || 0),
      Number(credit || 0)
    ],
    (err, result) => {
      if (err) {
        console.error("INSERT ERROR:", err);
        return res.status(500).json(err);
      }

      db.query(
        "SELECT * FROM credits WHERE id = ?",
        [result.insertId],
        (err2, rows) => {
          if (err2) return res.status(500).json(err2);
          res.json(rows[0]);
        }
      );
    }
  );
});

// ================= UPDATE CREDIT =================
router.put("/:id", (req, res) => {
  const { name, payment, credit } = req.body;
  const { id } = req.params;

  const sql = `
    UPDATE credits
    SET name=?, payment=?, credit=?
    WHERE id=?
  `;

  db.query(
    sql,
    [
      name,
      Number(payment || 0),
      Number(credit || 0),
      id
    ],
    (err) => {
      if (err) return res.status(500).json(err);
      res.json({ message: "Credit updated successfully" });
    }
  );
});

// ================= DELETE CREDIT =================
router.delete("/:id", (req, res) => {
  const { id } = req.params;

  db.query("DELETE FROM credits WHERE id=?", [id], (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Credit deleted successfully" });
  });
});

module.exports = router;