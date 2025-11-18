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
    res.json({ message: "Deleted successfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  }
};

const loginUser = async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: "Validation error",
      errors: error.array(),
    });
  }
  const client = await database.connectDatabase();
  try {
    const { email, password } = req.body;
    const user = await client.query(
      `SELECT * FROM users WHERE email = $1 AND password = $2`,
      [email, password]
    );

    if (!user.rows[0]) {
      res
        .status(400)
        .json({ message: "Email or password is incorrect. Try again!" });
    }

    const accessToken = jwt.sign(
      {
        userId: user.rows[0].id,
        email: user.rows[0].email,
      },
      tokenKey,
      {
        expiresIn: expiresIn,
      }
    );
    res.json({ user: user.rows[0], accessToken });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const income = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const id = req.user.userId;
    console.log(id, "hello world");
    const { amount, description } = req.body;

    const income = await client.query(
      `INSERT INTO transactions (user_id,amount,description) VALUES ($1, $2, $3) RETURNING *`,
      [id, amount, description]
    );

    res.json(income.rows[0]);
  } catch (err) {
    console.log(err);
    if (err.code === "23502") {
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

const expense = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const id = req.user.userId;
    const { amount, description } = req.body;
    const status = "EXPENSE";
    const checkedBalance = await client.query(
      `SELECT total.total_income, total.total_expense, (total.total_income - total.total_expense) AS balance FROM (SELECT
      SUM(CASE WHEN status = 'INCOME' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN status = 'EXPENSE' THEN amount ELSE 0 END) AS total_expense
  FROM transactions
  WHERE user_id = $1 
) as total`,
      [id]
    );
    const balance = checkedBalance.rows[0].balance;
    console.log(checkedBalance);
    if (balance < amount) {
      res.json({ message: "Your balance in hand is low!" });
    } else {
      const expense = await client.query(
        `INSERT INTO transactions (user_id,status, amount, description) VALUES ($1,$2,$3,$4) RETURNING *`,
        [id, status, amount, description]
      );
      res.json(expense.rows[0]);
    }
  } catch (err) {
    console.log(err);
    if (err.code === "23502") {
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

//ABLE TO UPDATE ALL FROM TRANSACTIONS TABLE
const updateTransactions = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const id = +req.params.id;
    const user_id = req.user.userId;
    const { status, amount, description, created_at } = req.body;
    const transaction = await client.query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    const result = transaction.rows[0];
    if (!result) {
      res.json({ message: "Transaction not found" });
    }
    const upStatus = status ?? result.status;
    const upAmount = amount ?? result.amount;
    const upDescription = description ?? result.description;
    const upCreateAt = created_at ?? result.created_at;
    const updateTransaction = await client.query(
      `UPDATE transactions SET status = $1, amount = $2, description = $3, created_at = $4 , updated_at = NOW() WHERE id = $5 AND user_id = $6 RETURNING *`,
      [upStatus, upAmount, upDescription, upCreateAt, id, user_id]
    );

    res.json(updateTransaction.rows[0]);
  } catch (err) {
    console.log(err);
    if (err.code === "23502") {
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

const deleteTransaction = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const id = +req.params.id;
    const user_id = req.user.userId;
    const transaction = await client.query(
      `SELECT * FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    if (!transaction.rows[0]) {
      res.json({ message: "Transaction not found" });
    }
    const delTransaction = await client.query(
      `DELETE FROM transactions WHERE id = $1 AND user_id = $2`,
      [id, user_id]
    );
    res.json({ message: "Deleted successfully!" });
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const singleUserTransactions = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const user_id = req.user.userId;
    const singleUserTransactions = await client.query(
      `SELECT * FROM transactions WHERE user_id = $1 `,
      [user_id]
    );
    if (!singleUserTransactions.rows[0]) {
      res.json({ message: "Any transaction history not found!" });
    }
    res.json(singleUserTransactions.rows);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const getAllTransactions = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const transactions = await client.query(`SELECT * FROM transactions`);
    res.json(transactions.rows);
  } catch (err) {
    console.log(err);
  } finally {
    await database.disconnectDatabase();
  }
};

const dailyReport = async (req, res) => {
  console.log(req.params);
  const client = await database.connectDatabase();
  try {
    const date = req.params.date;
    const user_id = req.user.userId;
    const totals = await client.query(
      `
  SELECT  
      SUM(CASE WHEN status = 'INCOME' THEN amount ELSE 0 END) AS total_income,
      SUM(CASE WHEN status = 'EXPENSE' THEN amount ELSE 0 END) AS total_expense
  FROM transactions
  WHERE user_id = $1 
`,
      [user_id]
    );
    const totalIncome = totals.rows[0].total_income || 0;
    const totalExpense = totals.rows[0].total_expense || 0;
    const balance = totalIncome - totalExpense;

    const dailyReport = await client.query(
      `SELECT * FROM transactions
      WHERE user_id = $1
      AND DATE(created_at) = $2
      ORDER BY created_at DESC `,
      [user_id, date]
    );

    if (!dailyReport.rows[0]) {
      res.status(404).json({ message: "No transaction history on that day!" });
    }

    const result = {
      transactions: dailyReport.rows,
      totals: {
        total_income: Number(totalIncome),
        total_expense: Number(totalExpense),
        balance: Number(balance),
      },
    };
    res.json(result);
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};

const weeklyReport = async (req, res) => {
  const client = await database.connectDatabase();
  try {
    const date = req.params.date;
    const user_id = req.user.userId;
  } catch (err) {
    console.log(err);
    res.status(500).json({
      message: "internal server error!",
    });
  } finally {
    await database.disconnectDatabase();
  }
};
module.exports = {
  registerUser,
  getAllUsers,
  updateUser,
  deleteUser,
  loginUser,
  income,
  expense,
  updateTransactions,
  deleteTransaction,
  singleUserTransactions,
  getAllTransactions,
  dailyReport,
};
