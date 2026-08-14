# Ticket Triage

## Overview
Ticket Triage is a simple Azure-based helpdesk assistant for students and staff. Users submit tickets through a web form, and admins review and update ticket status.

## Azure Services
- Azure Static Web Apps (Free)
- Azure Functions (Node.js)
- Azure Cosmos DB for NoSQL (Free Tier)

## Database Setup
1. In Azure Portal, create an Azure Cosmos DB account using the Core (SQL) API.
2. Enable Free Tier during creation if available.
3. Create a database named `tickettriage-db`.
4. Create a container named `tickets` with partition key `/id`.

## Local Development
1. Copy `api/local.settings.json.example` to `api/local.settings.json`.
2. Fill in `COSMOS_ENDPOINT` and `COSMOS_KEY` from Azure Cosmos DB.
3. Install dependencies:
   ```powershell
   cd "c:\Users\Azrul\Documents\Ticketing"
   npm install
   ```
4. Run the API locally (requires Azure Functions Core Tools):
   ```powershell
   cd "c:\Users\Azrul\Documents\Ticketing\api"
   func start
   ```
5. Open `student.html` and `admin.html` in the browser for testing.

## Deployment
1. Push code to GitHub on the `main` branch.
2. Configure GitHub Actions secret `AZURE_STATIC_WEB_APPS_API_TOKEN`.
3. Deploy via `.github/workflows/azure-static-web-apps.yml`.

## API Endpoints
- `POST /api/tickets` - create a ticket
- `GET /api/tickets` - list tickets
- `PATCH /api/tickets/{id}` - update ticket status/category

## Ticket Schema
- `id`
- `name`
- `email`
- `title`
- `description`
- `priority`
- `category`
- `suggestedCategory`
- `categorySource`
- `classificationMethod`
- `classificationConfidence`
- `classificationEvidence`
- `status`
- `createdAt`
- `updatedAt`
- `statusHistory`
