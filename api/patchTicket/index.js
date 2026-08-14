const { CosmosClient } = require("@azure/cosmos");

const databaseId = process.env.COSMOS_DATABASE || "tickettriage-db";
const containerId = process.env.COSMOS_CONTAINER || "tickets";
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });
const container = client.database(databaseId).container(containerId);

function nowUtc() {
  return new Date().toISOString();
}

module.exports = async function (context, req) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization'
  };

  if ((req.method || '').toUpperCase() === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders };
    return;
  }

  if (!endpoint || !key) {
    context.res = { status: 500, headers: corsHeaders, body: { error: "Cosmos DB credentials are not configured." } };
    return;
  }

  const ticketId = context.bindingData.id;
  if (!ticketId) {
    context.res = { status: 400, headers: corsHeaders, body: { error: "Ticket id is required." } };
    return;
  }

  const payload = req.body || {};
  const status = payload.status;
  const category = payload.category;
  const note = payload.note || null;

  if (!status && !category && !note) {
    context.res = { status: 400, headers: corsHeaders, body: { error: "Nothing to update." } };
    return;
  }

  try {
    const { resource: existing } = await container.item(ticketId, ticketId).read();
    if (!existing) {
      context.res = { status: 404, headers: corsHeaders, body: { error: "Ticket not found." } };
      return;
    }

    const now = nowUtc();

    const updated = {
      ...existing,
      updatedAt: now,
      status: status || existing.status,
      category: category || existing.category,
      statusHistory: existing.statusHistory || []
    };

    if (status && status !== existing.status) {
      updated.statusHistory.push({ status, at: now, by: "admin", note });
    }

    const { resource } = await container.item(ticketId, ticketId).replace(updated);
    context.res = { status: 200, headers: corsHeaders, body: resource };
  } catch (err) {
    context.log.error(err);
    context.res = { status: 500, headers: { 'Access-Control-Allow-Origin': '*' }, body: { error: 'Server error' } };
  }
};
