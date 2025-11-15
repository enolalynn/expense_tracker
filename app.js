const express = require("express");
const database = require("./database.js");
const routes = require("./routes/auth.route.js");
const app = express();

app.use(express.json());

const port = 8834;
app.use("/api", routes);

app.listen(port, () => {
  console.log(`Server is running on port no ${port} .....`);
});
