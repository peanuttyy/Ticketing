"""
Now we need somewhere to put the ticket.

For our first milestone, do not use Cosmos DB.

We'll use memory.
"""

from threading import Lock


_TICKETS = {}

_LOCK = Lock()


def create_ticket(ticket):
    with _LOCK:
        _TICKETS[ticket["id"]] = ticket

    return ticket


def get_ticket(ticket_id):
    with _LOCK:
        return _TICKETS.get(ticket_id)


def list_tickets(
    category=None,
    status=None,
    email=None,
    q=None,
    limit=100
):
    with _LOCK:
        tickets = list(
            _TICKETS.values()
        )


    if category:
        tickets = [
            ticket
            for ticket in tickets
            if ticket.get("category")
            == category
        ]


    if status:
        tickets = [
            ticket
            for ticket in tickets
            if ticket.get("status")
            == status
        ]


    if email:
        email_lower = email.lower()

        tickets = [
            ticket
            for ticket in tickets
            if email_lower
            in ticket.get(
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
    with _LOCK:
        ticket = _TICKETS.get(
            ticket_id
        )


        if ticket is None:
            return None


        for key, value in changes.items():
            ticket[key] = value


        return ticket