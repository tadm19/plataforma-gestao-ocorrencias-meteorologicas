const { CosmosClient } = require("@azure/cosmos");

const client = new CosmosClient({
  endpoint: process.env.COSMOS_ENDPOINT,
  key: process.env.COSMOS_KEY
});

const db = client.database(process.env.COSMOS_DB);

module.exports = {
  users: db.container("users"),
  ocorrencias: db.container("ocorrencias")
};