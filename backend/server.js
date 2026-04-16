require("dotenv").config();
const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const ocorrenciasRoutes = require("./routes/ocorrencias");

const app = express();

app.use(cors());
app.use(express.json());

app.use("/login", authRoutes);
app.use("/register", authRoutes);
app.use("/ocorrencias", ocorrenciasRoutes);

app.listen(process.env.PORT, () => {
  console.log("Servidor a correr");
});