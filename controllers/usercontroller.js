const db = require("../db");
const bcrypt = require("bcryptjs");

/*
================================
CREATE USER
================================
*/
exports.createUser = async (req, res) => {

  try {

    const { username, password, role, branch_id } = req.body;

    if (!username || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "Username, password and role are required",
      });
    }

    const [existing] = await db.query(
      "SELECT userId FROM users WHERE username = ?",
      [username]
    );

    if (existing.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Username already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users (username,password,role,status,branch_id)
       VALUES (?,?,?,?,?)`,
      [username, hashedPassword, role, "active", branch_id || null]
    );

    res.status(201).json({
      success: true,
      message: "User created successfully",
      userId: result.insertId,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

};


/*
================================
GET ALL USERS
================================
*/
exports.getUsers = async (req, res) => {

  try {

    const [users] = await db.query(
      `SELECT userId, username, role, status, branch_id, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json({
      success: true,
      data: users,
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

};


/*
================================
GET SINGLE USER
================================
*/
exports.getUser = async (req, res) => {

  try {

    const { id } = req.params;

    const [users] = await db.query(
      `SELECT userId, username, role, status, branch_id
       FROM users
       WHERE userId = ?`,
      [id]
    );

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    res.json({
      success: true,
      data: users[0],
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

};


/*
================================
UPDATE USER
================================
*/
exports.updateUser = async (req, res) => {

  try {

    const { id } = req.params;
    const { username, role, branch_id, status } = req.body;

    await db.query(
      `UPDATE users
       SET username=?, role=?, branch_id=?, status=?
       WHERE userId=?`,
      [username, role, branch_id, status, id]
    );

    res.json({
      success: true,
      message: "User updated successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

};


/*
================================
DELETE USER
================================
*/
exports.deleteUser = async (req, res) => {

  try {

    const { id } = req.params;

    await db.query(
      "DELETE FROM users WHERE userId = ?",
      [id]
    );

    res.json({
      success: true,
      message: "User deleted successfully",
    });

  } catch (error) {

    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error",
    });

  }

};