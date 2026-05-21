const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 8080;
const rootDir = __dirname;

app.get("/", (req, res) => {
  res.redirect(302, "/index.html");
});

app.get("/lista", (req, res) => {
  res.sendFile(path.join(rootDir, "lista.html"));
});

app.get("/nova", (req, res) => {
  res.sendFile(path.join(rootDir, "nova.html"));
});

app.get("/detalhe", (req, res) => {
  res.sendFile(path.join(rootDir, "detalhe.html"));
});

app.get("/editar", (req, res) => {
  res.sendFile(path.join(rootDir, "editar.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(rootDir, "login.html"));
});

app.get("/registo", (req, res) => {
  res.sendFile(path.join(rootDir, "registo.html"));
});

app.use(express.static(rootDir, {
  extensions: false,
  index: false,
  redirect: false,
}));

app.use((req, res) => {
  res.status(404).send("Not found");
});

app.listen(PORT, () => {
  console.log(`Frontend a correr na porta ${PORT}`);
});