import re
from datetime import datetime, timezone
from uuid import uuid4


VALID_CATEGORIES = [
    "IT Support",
    "Facilities",
    "Course Registration",
    "Student Finance",
    "Library Services",
    "General Enquiry",
]


VALID_PRIORITIES = [
    "low",
    "medium",
    "high",
]


VALID_STATUSES = [
    "New",
    "Categorised",
    "In Progress",
    "Resolved",
]


def validate_ticket_input(data):
    if not isinstance(data, dict):
        raise ValueError("Request body must be a JSON object.")


    required_fields = [
        "name",
        "email",
        "title",
        "description",
    ]


    for field in required_fields:
        value = data.get(field)

        if not isinstance(value, str) or not value.strip():
            raise ValueError(f"{field} is required.")


    name = data["name"].strip()
    email = data["email"].strip()
    title = data["title"].strip()
    description = data["description"].strip()


    if len(name) > 100:
        raise ValueError("Name must be 100 characters or fewer.")


    if len(email) > 254:
        raise ValueError("Email address is too long.")


    if not re.match(
        r"^[^@\s]+@[^@\s]+\.[^@\s]+$",
        email
    ):
        raise ValueError("Invalid email address.")


    if len(title) > 200:
        raise ValueError("Title must be 200 characters or fewer.")


    if len(description) > 5000:
        raise ValueError(
            "Description must be 5000 characters or fewer."
        )


    priority = data.get("priority", "medium")


    if priority not in VALID_PRIORITIES:
        raise ValueError(
            "Priority must be low, medium, or high."
        )


    category = data.get("category", "")


    if category:
        category = category.strip()

        if category not in VALID_CATEGORIES:
            raise ValueError(
                "Invalid category."
            )


    return {
        "name": name,
        "email": email,
        "title": title,
        "description": description,
        "priority": priority,
        "category": category,
    }


def build_ticket(data, classification):
    now = datetime.now(timezone.utc).isoformat()


    ticket_id = str(uuid4())


    category = classification["category"]


    ticket = {
        "id": ticket_id,

        "name": data["name"],
        "email": data["email"],

        "title": data["title"],
        "description": data["description"],

        "category": category,
        "priority": data["priority"],

        "status": "New",

        "classificationMethod":
            classification["method"],

        "classificationConfidence":
            classification["confidence"],

        "classificationEvidence":
            classification["evidence"],

        "createdAt": now,

        "updatedAt": now,

        "statusHistory": [
            {
                "status": "New",
                "changedAt": now
            }
        ]
    }


    return ticket