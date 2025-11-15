const { Client } = require("pg");

async function connectDatabase() {
  const client = new Client({
    port: 5432,
    database: "expense-tracker",
    host: "localhost",
    user: "admin",
    password: "admin",
  });
  await client.connect();
  return client;
}
async function disconnectDatabase() {
  const client = new Client({
    port: 5432,
    database: "book-store",
    host: "localhost",
    user: "admin",
    password: "admin",
  });

  await client.connect();
  return client;
}

module.exports = { connectDatabase, disconnectDatabase };
