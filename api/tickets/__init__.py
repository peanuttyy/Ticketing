import json

import azure.functions as func

from shared.models import (
    build_ticket,
    validate_ticket_input,
)

from shared.classifier import (
    classify_ticket,
)

from shared.repository import (
    create_ticket,
    list_tickets,
)


def main(req: func.HttpRequest) -> func.HttpResponse:

    if req.method == "POST":
        return create_ticket_endpoint(req)


    if req.method == "GET":
        return list_tickets_endpoint(req)


    return func.HttpResponse(
        json.dumps({
            "error": "Method not allowed."
        }),
        status_code=405,
        mimetype="application/json"
    )


def create_ticket_endpoint(req):
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


    try:
        data = validate_ticket_input(
            data
        )

    except ValueError as error:
        return func.HttpResponse(
            json.dumps({
                "error": str(error)
            }),
            status_code=400,
            mimetype="application/json"
        )

    # If the student selected a category,
    # respect that choice.
    #
    # Otherwise classify automatically.

    if data["category"]:
        classification = {
            "category": data["category"],
            "confidence": 1.0,
            "method": "user-selected",
            "evidence": [],
        }

    else:
        classification = classify_ticket(
            data["title"],
            data["description"]
        )


    ticket = build_ticket(
        data,
        classification
    )


    create_ticket(ticket)


    return func.HttpResponse(
        json.dumps(ticket),
        status_code=201,
        mimetype="application/json"
    )


def list_tickets_endpoint(req):
    category = req.params.get(
        "category"
    )


    status = req.params.get(
        "status"
    )


    email = req.params.get(
        "email"
    )


    q = req.params.get(
        "q"
    )


    limit_text = req.params.get(
        "limit",
        "100"
    )


    try:
        limit = int(limit_text)

    except ValueError:
        limit = 100


    limit = max(
        1,
        min(limit, 100)
    )


    tickets = list_tickets(
        category=category,
        status=status,
        email=email,
        q=q,
        limit=limit
    )


    return func.HttpResponse(
        json.dumps({
            "tickets": tickets,
            "count": len(tickets)
        }),
        status_code=200,
        mimetype="application/json"
    )