const database = require("../database.js");
const { validationResult } = require("express-validator");
const jwt = require("jsonwebtoken");
const { tokenKey, expiresIn } = require("../utils");

/**
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 */

const registerUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation error",
      errors: errors.array(),
    });
  }
  const client = await database.connectDatabase();

  try {
    const { name, email, password } = req.body;
    await client.query("BEGIN");
    const users = await client.query(
      `INSERT INTO users (name, email, password) VALUES ($1,$2,$3) RETURNING *`,
      [name, email, password]
    );
    await client.query("COMMIT");
    res.status(200).json(users.rows[0]);
  } catch (err) {
    console.log(err);
    await client.query("ROLLBACK");
    await client.query(
      `SELECT setval('users_id_seq', COALESCE((SELECT MAX(id) FROM users),0));`
    );

    if (err.code === "23505") {
      res.status(400).json({
        message: `email already exists!`,
      });
    } else if (err.code === "23502") {
      res.status(400).json({
        message: `${err.column} is require!`,
      });
    } else if (err.code === "23503") {
      res.status(400).json({
        message: `foreign key violation!`,
      });
    } else if (err.code === "42P01") {
      res.status(400).json({
        message: "table does not exist!",
      });
    } else {
      res.status(500).json({
        message: "internal server error!",
      });
    }
  } finally {
    await database.disconnectDatabase();
  }
};

const getAllUsers = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const users = await client.query(`SELECT * FROM users`);
    res.status(200).json(users.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const updateUser = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const id = +req.params.id;

    const { name, email, password } = req.body;
    const users = await client.query(`SELECT * FROM users WHERE id = $1`, [id]);
    const user = users.rows[0];
    if (!user) {
      res.status(404).json({ message: "id not found" });
    }
    const updateName = name ?? user.name;
    const updateEmail = email ?? user.email;
    const updatePassword = password ?? user.password;
    const updateUser = await client.query(
      `UPDATE users SET name = $1, email = $2, password = $3 WHERE id = $4 RETURNING *`,
      [updateName, updateEmail, updatePassword, id]
    );

    res.status(200).json(updateUser.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const deleteUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "validation error",
      errors: errors.array(),
    });
  }
  const client = await database.connectDatabase();
  try {
    const id = +req.params.id;
    const find = await client.query(`SELECT * FROM users WHERE id = $1`, [id]);
    if (!find.rows[0]) {
      res.status(404).json({ message: "id not found" });
    }
    const deleteUser = await client.query(`DELETE FROM users WHERE id = $1`, [
      id,
    ]);
    res.status(200).json(deleteUser.rows[0]);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  }
};
module.exports = {
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
};
