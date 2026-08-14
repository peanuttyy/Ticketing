# Database Draft & Schema Specification - Ticket Triage

## 1. Overview & Azure Free-Tier Configuration

The **Ticket Triage** application utilizes **Azure Cosmos DB for NoSQL** as its primary persistent database. The database configuration is designed strictly within the Azure Cosmos DB Free Tier allocation.

| Parameter | Setting | Free-Tier Guarantee |
| :--- | :--- | :--- |
| **Database Account** | Azure Cosmos DB for NoSQL | Free Tier (1,000 RU/s + 25 GB free storage) |
| **Database Name** | `tickettriage-db` | Configurable via `COSMOS_DATABASE` env var |
| **Container Name** | `tickets` | Configurable via `COSMOS_CONTAINER` env var |
| **Partition Key** | `/id` | Single-partition point operations (<1 RU) |
| **Throughput** | Autoscale max 1,000 RU/s (or 400 RU/s manual) | 100% Free |
| **Fallback Strategy** | Thread-safe `InMemoryTicketRepository` | Automatic offline demo fallback if credentials missing |

---

## 2. Partitioning Strategy & Architectural Rationale

### Chosen Partition Key: `/id`

In Azure Cosmos DB, partition keys are **immutable** once a document is created.

- **Why `/id` is chosen over `/category`**:
  - In our helpdesk workflow, an admin user may re-categorise a ticket (e.g., from `General Enquiry` to `IT Support`). If `/category` were used as the partition key, updating a ticket's category would require deleting and re-inserting the document.
  - Using `/id` ensures each ticket acts as its own logical partition. Point reads (`GET /api/tickets/{id}`) and updates (`PATCH /api/tickets/{id}`) are single-partition operations costing **< 1.0 RU**.
  - Querying tickets across categories (`SELECT * FROM c WHERE c.category = @category`) is a cross-partition query, which at university helpdesk scale (< 10,000 tickets) costs **< 3.5 RUs** per page.

---

## 3. Ticket Entity JSON Schema

Below is the complete document structure stored in the `tickets` container:

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "Ticket",
  "type": "object",
  "required": [
    "id",
    "name",
    "email",
    "title",
    "description",
    "priority",
    "category",
    "suggestedCategory",
    "categorySource",
    "classificationMethod",
    "classificationConfidence",
    "classificationEvidence",
    "status",
    "createdAt",
    "updatedAt",
    "statusHistory"
  ],
  "properties": {
    "id": {
      "type": "string",
      "format": "uuid",
      "description": "Unique GUID identifier and partition key."
    },
    "name": {
      "type": "string",
      "maxLength": 100,
      "description": "Full name of student or staff member."
    },
    "email": {
      "type": "string",
      "format": "email",
      "maxLength": 200,
      "description": "Email address of requester (normalized to lowercase)."
    },
    "title": {
      "type": "string",
      "maxLength": 150,
      "description": "Short summary title of the issue."
    },
    "description": {
      "type": "string",
      "minLength": 10,
      "maxLength": 4000,
      "description": "Detailed description of the support request."
    },
    "priority": {
      "type": "string",
      "enum": ["Low", "Medium", "High"],
      "default": "Medium"
    },
    "category": {
      "type": "string",
      "enum": [
        "IT Support",
        "Facilities",
        "Course Registration",
        "Student Finance",
        "Library Services",
        "General Enquiry"
      ],
      "description": "Active category assigned to the ticket."
    },
    "suggestedCategory": {
      "type": "string",
      "description": "Category auto-detected by AI or keyword logic upon submission."
    },
    "categorySource": {
      "type": "string",
      "enum": ["user", "auto", "admin"],
      "description": "Origin of the active category assignment."
    },
    "classificationMethod": {
      "type": "string",
      "enum": ["azure-ai-language-custom", "azure-ai-language-keyphrase", "keyword-rules"],
      "description": "Method used to generate suggested category."
    },
    "classificationConfidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0,
      "description": "Confidence score of the classification (0.00 to 1.00)."
    },
    "classificationEvidence": {
      "type": "array",
      "items": { "type": "string" },
      "description": "Keywords or keyphrases that contributed to the classification decision."
    },
    "status": {
      "type": "string",
      "enum": ["New", "Categorised", "In Progress", "Resolved"],
      "default": "New"
    },
    "createdAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp with microsecond resolution (e.g. 2026-08-08T10:30:00.123456Z)."
    },
    "updatedAt": {
      "type": "string",
      "format": "date-time",
      "description": "ISO 8601 UTC timestamp of last status or category modification."
    },
    "statusHistory": {
      "type": "array",
      "description": "Audit trail log of all status updates.",
      "items": {
        "type": "object",
        "required": ["status", "at", "by"],
        "properties": {
          "status": { "type": "string" },
          "at": { "type": "string", "format": "date-time" },
          "by": { "type": "string", "enum": ["system", "admin"] },
          "note": { "type": "string", "maxLength": 500 }
        }
      }
    }
  }
}
```

---

## 4. Sample Document Benchmark (Capstone Example Data)

Here is a live sample document stored in Cosmos DB based on the scenario from Section 7 of the project brief:

```json
{
  "id": "df0062f3-6850-49dc-88c6-89e51e870890",
  "name": "Aiman Rahman",
  "email": "aiman@example.com",
  "title": "Cannot access campus Wi-Fi",
  "description": "I cannot connect to the campus Wi-Fi from my laptop.",
  "priority": "Medium",
  "category": "IT Support",
  "suggestedCategory": "IT Support",
  "categorySource": "auto",
  "classificationMethod": "keyword-rules",
  "classificationConfidence": 0.97,
  "classificationEvidence": [
    "phrase: campus wi-fi (wt 4)",
    "strong: wifi (wt 3)",
    "strong: laptop (wt 3)",
    "weak: connect (wt 1)"
  ],
  "status": "Categorised",
  "createdAt": "2026-08-08T10:15:30.102934Z",
  "updatedAt": "2026-08-08T10:15:30.102934Z",
  "statusHistory": [
    {
      "status": "Categorised",
      "at": "2026-08-08T10:15:30.102934Z",
      "by": "system"
    }
  ]
}
```

---

## 5. Cosmos DB Indexing Policy & Optimization

To minimize Request Unit (RU) consumption on write operations, long text bodies (like `description`) are excluded from full indexing, while query fields are indexed.

```json
{
  "indexingMode": "consistent",
  "automatic": true,
  "includedPaths": [
    {
      "path": "/*"
    }
  ],
  "excludedPaths": [
    {
      "path": "/description/?"
    },
    {
      "path": "/\"_etag\"/?"
    }
  ],
  "compositeIndexes": [
    [
      { "path": "/category", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ],
    [
      { "path": "/status", "order": "ascending" },
      { "path": "/createdAt", "order": "descending" }
    ]
  ]
}
```

---

## 6. Access Layer Queries

All database interactions use **parameterized SQL queries** to prevent SQL injection vulnerabilities.

### 1. Paginated Ticket List with Dynamic Filters
```sql
SELECT * FROM c 
WHERE c.category = @category 
  AND c.status = @status 
  AND CONTAINS(LOWER(c.email), @email) 
  AND (CONTAINS(LOWER(c.title), @q) OR CONTAINS(LOWER(c.description), @q)) 
ORDER BY c.createdAt DESC 
OFFSET 0 LIMIT @limit
```

### 2. Point Read (Single Ticket lookup)
```sql
SELECT * FROM c WHERE c.id = @id
```

### 3. Triage & Summary Analytics (`/api/health` and Admin Dashboard)
```sql
SELECT c.status, c.category FROM c
```

---

## 7. Storage Backend Abstraction Architecture

The application implements a Repository Pattern via [`api/shared/repository.py`](file:///c:/Users/Azrul/Downloads/tickettriage/api/shared/repository.py):

```mermaid
graph TD
    API[Azure Functions API] --> Factory[get_repository()]
    Factory -->|COSMOS_ENDPOINT set| Cosmos[CosmosTicketRepository]
    Factory -->|Missing Credentials or Local Dev| InMemory[InMemoryTicketRepository]
    Cosmos --> AzureCosmos[Azure Cosmos DB Container 'tickets']
    InMemory --> ThreadSafeMap[Thread-Safe In-Memory Map]
```

This guarantees 100% testability offline while providing full production persistence on Azure Cosmos DB Free Tier.
