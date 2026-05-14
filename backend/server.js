require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/auth");
const ocorrenciasRoutes = require("./routes/ocorrencias");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/", authRoutes);
app.use("/ocorrencias", ocorrenciasRoutes);

app.use((req, res) => {
  res.status(404).json({ erro: "Rota nao encontrada" });
});

app.use((error, req, res, next) => {
  console.error(error);

  if (error.name === "MulterError" || error.message?.includes("imagem")) {
    return res.status(400).json({ erro: error.message });
  }

  res.status(500).json({ erro: "Erro interno do servidor" });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Servidor a correr na porta ${PORT}`);
});
