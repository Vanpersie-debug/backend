const express = require("express");
const router = express.Router();
const db = require("../db");

const verifyToken = require("./middleware/authMiddleware");
const allowRoles = require("./middleware/roleMiddleware");

router.get(
"/logs",
verifyToken,
allowRoles("SUPER_ADMIN","ADMIN"),
async (req,res)=>{

const [logs] = await db.query(
`SELECT * FROM activity_logs
ORDER BY created_at DESC
LIMIT 200`
);

res.json(logs);

}
);

module.exports = router;