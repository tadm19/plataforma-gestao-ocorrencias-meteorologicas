const { CosmosClient } = require("@azure/cosmos");

const requiredEnv = ["COSMOS_ENDPOINT", "COSMOS_KEY", "COSMOS_DATABASE"];

requiredEnv.forEach((name) => {
  if (!process.env[name]) {
    throw new Error(`Variavel de ambiente em falta: ${name}`);
  }
});

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY,
});

const database = client.database(process.env.COSMOS_DATABASE);

module.exports = {
  users: database.container("utilizadores"),
  utilizadores: database.container("utilizadores"),
  ocorrencias: database.container("ocorrencias"),
};
