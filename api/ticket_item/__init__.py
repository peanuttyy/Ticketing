import json

import azure.functions as func

from shared.repository import (
    get_ticket,
    update_ticket,
)

from shared.models import (
    VALID_CATEGORIES,
    VALID_STATUSES,
)


def main(req: func.HttpRequest) -> func.HttpResponse:

    ticket_id = req.route_params.get(
        "ticket_id"
    )

    if not ticket_id:
        return func.HttpResponse(
            json.dumps({
                "error": "Ticket ID is required."
            }),
            status_code=400,
            mimetype="application/json"
        )

    if req.method == "GET":
        return get_ticket_endpoint(
            ticket_id
        )

    if req.method == "PATCH":
        return update_ticket_endpoint(
            req,
            ticket_id
        )

    return func.HttpResponse(
        json.dumps({
            "error": "Method not allowed."
        }),
        status_code=405,
        mimetype="application/json"
    )


def get_ticket_endpoint(ticket_id):

    ticket = get_ticket(
        ticket_id
    )

    if ticket is None:
        return func.HttpResponse(
            json.dumps({
                "error": "Ticket not found."
            }),
            status_code=404,
            mimetype="application/json"
        )

    return func.HttpResponse(
        json.dumps(ticket),
        status_code=200,
        mimetype="application/json"
    )


def update_ticket_endpoint(
    req,
    ticket_id
):
    try:
        data = req.get_json()

    except ValueError:
        return func.HttpResponse(
            json.dumps({
                "error": "Request body must contain valid JSON."
            }),
            status_code=400,
            mimetype="application/json"
        )

    if not isinstance(data, dict):
        return func.HttpResponse(
            json.dumps({
                "error": "Request body must be a JSON object."
            }),
            status_code=400,
            mimetype="application/json"
        )

    allowed_fields = {
        "status",
        "category",
    }

    changes = {
        key: value
        for key, value in data.items()
        if key in allowed_fields
    }

    if not changes:
        return func.HttpResponse(
            json.dumps({
                "error": "Only status or category can be updated."
            }),
            status_code=400,
            mimetype="application/json"
        )

    if "status" in changes:
        if changes["status"] not in VALID_STATUSES:
            return func.HttpResponse(
                json.dumps({
                    "error": "Invalid status."
                }),
                status_code=400,
                mimetype="application/json"
            )

    if "category" in changes:
        if changes["category"] not in VALID_CATEGORIES:
            return func.HttpResponse(
                json.dumps({
                    "error": "Invalid category."
                }),
                status_code=400,
                mimetype="application/json"
            )

    ticket = update_ticket(
        ticket_id,
        changes
    )

    if ticket is None:
        return func.HttpResponse(
            json.dumps({
                "error": "Ticket not found."
            }),
            status_code=404,
            mimetype="application/json"
        )

    return func.HttpResponse(
        json.dumps(ticket),
        status_code=200,
        mimetype="application/json"
    )