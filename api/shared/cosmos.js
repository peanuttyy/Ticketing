const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;
const databaseId = process.env.COSMOS_DATABASE || "tickettriage-db";
const containerId = process.env.COSMOS_CONTAINER || "tickets";

if (!endpoint || !key) {
  throw new Error("COSMOS_ENDPOINT and COSMOS_KEY must be configured.");
}

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

module.exports = { client, database, container };
