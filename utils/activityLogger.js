const db = require("../db");

const logActivity = async ({
  userId,
  username,
  action,
  page,
  branch_id,
  ip,
}) => {
  try {
    await db.promise().query(
      `INSERT INTO activity_logs
      (user_id,username,action,page,branch_id,ip_address)
      VALUES (?,?,?,?,?,?)`,
      [userId, username, action, page, branch_id, ip]
    );
  } catch (error) {
    console.error("Activity log error:", error);
  }
};

module.exports = logActivity;