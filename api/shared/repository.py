"""
Ticket storage repository.

If Cosmos DB settings are available, tickets are stored in Cosmos DB.
Otherwise, the application falls back to the in-memory store.

This keeps the rest of the API independent from the storage technology.
"""

import os
from threading import Lock
from azure.cosmos import CosmosClient
from azure.identity import DefaultAzureCredential
from azure.keyvault.secrets import SecretClient

_TICKETS = {}

_LOCK = Lock()


COSMOS_ENDPOINT = os.getenv("COSMOS_ENDPOINT")
COSMOS_KEY = os.getenv("COSMOS_KEY")

COSMOS_DATABASE = os.getenv(
    "COSMOS_DATABASE",
    "tickettriage"
)

COSMOS_CONTAINER = os.getenv(
    "COSMOS_CONTAINER",
    "tickets"
)


_cosmos_container = None


def _get_cosmos_container():
    global _cosmos_container

    if _cosmos_container is not None:
        return _cosmos_container

    if not COSMOS_ENDPOINT or not COSMOS_KEY:
        return None

    client = CosmosClient(
        COSMOS_ENDPOINT,
        credential=COSMOS_KEY
    )

    database = client.get_database_client(
        COSMOS_DATABASE
    )

    _cosmos_container = (
        database.get_container_client(
            COSMOS_CONTAINER
        )
    )

    return _cosmos_container


def create_ticket(ticket):
    container = _get_cosmos_container()

    if container is not None:
        container.upsert_item(ticket)
        return ticket

    with _LOCK:
        _TICKETS[ticket["id"]] = ticket

    return ticket


def get_ticket(ticket_id):
    container = _get_cosmos_container()

    if container is not None:
        try:
            return container.read_item(
                item=ticket_id,
                partition_key=ticket_id
            )
        except Exception:
            return None

    with _LOCK:
        return _TICKETS.get(ticket_id)


def list_tickets(
    category=None,
    status=None,
    email=None,
    q=None,
    limit=100
):
    container = _get_cosmos_container()

    if container is not None:
        query = """
            SELECT * FROM c
            ORDER BY c.createdAt DESC
        """

        tickets = list(
            container.query_items(
                query=query,
                enable_cross_partition_query=True
            )
        )

        tickets = tickets[:limit]

    else:
        with _LOCK:
            tickets = list(
                _TICKETS.values()
            )

    if category:
        tickets = [
            ticket
            for ticket in tickets
            if ticket.get("category") == category
        ]

    if status:
        tickets = [
            ticket
            for ticket in tickets
            if ticket.get("status") == status
        ]

    if email:
        email_lower = email.lower()

        tickets = [
            ticket
            for ticket in tickets
            if email_lower in ticket.get(
                "email",
                ""
            ).lower()
        ]

    if q:
        q_lower = q.lower()

        def matches(ticket):
            searchable = " ".join([
                str(ticket.get("title", "")),
                str(ticket.get("description", "")),
                str(ticket.get("category", "")),
                str(ticket.get("name", "")),
                str(ticket.get("email", "")),
            ]).lower()

            return q_lower in searchable

        tickets = [
            ticket
            for ticket in tickets
            if matches(ticket)
        ]

    tickets.sort(
        key=lambda ticket:
            ticket.get(
                "createdAt",
                ""
            ),
        reverse=True
    )

    return tickets[:limit]


def update_ticket(
    ticket_id,
    changes
):
    container = _get_cosmos_container()

    if container is not None:
        ticket = get_ticket(ticket_id)

        if ticket is None:
            return None

        for key, value in changes.items():
            ticket[key] = value

        container.upsert_item(ticket)

        return ticket

    with _LOCK:
        ticket = _TICKETS.get(
            ticket_id
        )

        if ticket is None:
            return None

        for key, value in changes.items():
            ticket[key] = value

        return ticket

# This line is used to store the URL of the Azure Key Vault where secrets are stored.
VAULT_URL = "https://kv-tickettriagegrouptwo.vault.azure.net/"

def get_cosmos_client():
    # Reads local settings first, falls back to Azure Key Vault
    connection_string = os.environ.get("COSMOS_DB_CONNECTION")
    if not connection_string:
        credential = DefaultAzureCredential()
        secret_client = SecretClient(vault_url=VAULT_URL, credential=credential)
        connection_string = secret_client.get_secret("CosmosDbConnectionString").value
    return CosmosClient.from_connection_string(connection_string)
