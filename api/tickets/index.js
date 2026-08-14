const { CosmosClient } = require("@azure/cosmos");
const { v4: uuidv4 } = require("uuid");

const databaseId = process.env.COSMOS_DATABASE || "tickettriage-db";
const containerId = process.env.COSMOS_CONTAINER || "tickets";
const endpoint = process.env.COSMOS_ENDPOINT;
const key = process.env.COSMOS_KEY;

const client = new CosmosClient({ endpoint, key });
const database = client.database(databaseId);
const container = database.container(containerId);

const categories = [
  "IT Support",
  "Facilities",
  "Course Registration",
  "Student Finance",
  "Library Services",
  "General Enquiry"
];

function suggestCategory(title, description) {
  const text = `${title} ${description}`.toLowerCase();
  if (/wi[- ]?fi|wifi|network|vpn|password|login|email/.test(text)) return "IT Support";
  if (/room|facility|clean|air[- ]?con|electric|door|maintenance|parking/.test(text)) return "Facilities";
  if (/register|enrol|course|timetable|schedule|withdraw|add class/.test(text)) return "Course Registration";
  if (/fee|finance|payment|scholarship|loan|invoice|refund/.test(text)) return "Student Finance";
  if (/library|book|borrow|study room|catalogue|catalog|renew|overdue/.test(text)) return "Library Services";
  return "General Enquiry";
}

function buildEvidence(title, description) {
  const words = `${title} ${description}`.toLowerCase();
  const evidence = [];
  const checks = [
    { re: /wi[- ]?fi|wifi/, label: "wifi" },
    { re: /network|vpn|password|login/, label: "network/login" },
    { re: /room|facility|clean|air[- ]?con|electric|door/, label: "facility" },
    { re: /register|enrol|course|timetable|schedule|withdraw/, label: "course registration" },
    { re: /fee|finance|payment|scholarship|loan|invoice|refund/, label: "finance" },
    { re: /library|book|borrow|study room|catalogue|renew|overdue/, label: "library" }
  ];

  checks.forEach((check) => {
    if (check.re.test(words)) evidence.push(check.label);
  });

  return evidence;
}

function nowUtc() {
  return new Date().toISOString();
}
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization'
};

module.exports = async function (context, req) {
  if ((req.method || '').toUpperCase() === 'OPTIONS') {
    context.res = { status: 204, headers: corsHeaders };
    return;
  }
  if (!endpoint || !key) {
    context.res = {
      status: 500,
      headers: corsHeaders,
      body: { error: "Cosmos DB credentials are not configured." }
    };
    return;
  }

  const method = req.method.toUpperCase();
  if (method === "GET") {
    const category = (req.query.category || "").trim();
    const status = (req.query.status || "").trim();
    const email = (req.query.email || "").trim().toLowerCase();
    const q = (req.query.q || "").trim().toLowerCase();
    const limit = Number(req.query.limit || 50);

    let query = "SELECT * FROM c WHERE 1=1";
    const parameters = [];

    if (category) {
      query += " AND c.category = @category";
      parameters.push({ name: "@category", value: category });
    }
    if (status) {
      query += " AND c.status = @status";
      parameters.push({ name: "@status", value: status });
    }
    if (email) {
      query += " AND CONTAINS(LOWER(c.email), @email)";
      parameters.push({ name: "@email", value: email });
    }
    if (q) {
      query += " AND (CONTAINS(LOWER(c.title), @q) OR CONTAINS(LOWER(c.description), @q))";
      parameters.push({ name: "@q", value: q });
    }

    query += " ORDER BY c.createdAt DESC";
    const { resources } = await container.items.query({ query, parameters }).fetchAll();

    context.res = {
      status: 200,
      headers: corsHeaders,
      body: resources.slice(0, limit)
    };
    return;
  }

  if (method === "POST") {
    const payload = req.body || {};
    const name = (payload.name || "").trim();
    const email = (payload.email || "").trim().toLowerCase();
    const title = (payload.title || "").trim();
    const description = (payload.description || "").trim();
    const priority = payload.priority || "Medium";
    const category = payload.category || "";

    if (!name || !email || !title || !description) {
      context.res = {
        status: 400,
        headers: corsHeaders,
        body: { error: "Missing required ticket fields." }
      };
      return;
    }

    const suggestedCategory = suggestCategory(title, description);
    const categorySource = category ? "user" : "auto";
    const assignedCategory = category || suggestedCategory;
    const classificationEvidence = buildEvidence(title, description);
    const classificationConfidence = classificationEvidence.length > 0 ? 0.85 : 0.6;

    const ticket = {
      id: uuidv4(),
      name,
      email,
      title,
      description,
      priority,
      category: assignedCategory,
      suggestedCategory,
      categorySource,
      classificationMethod: "keyword-rules",
      classificationConfidence,
      classificationEvidence,
      status: "New",
      createdAt: nowUtc(),
      updatedAt: nowUtc(),
      statusHistory: [
        { status: "New", at: nowUtc(), by: "system" }
      ]
    };

    const { resource } = await container.items.create(ticket);
    context.res = {
      status: 201,
      headers: corsHeaders,
      body: resource
    };
    return;
  }

  context.res = {
    status: 405,
    headers: corsHeaders,
    body: { error: "Method not allowed." }
  };
};
