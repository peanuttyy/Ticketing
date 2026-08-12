const API_BASE = "/api";


async function requestJson(path, options = {}) {
    const response = await fetch(`${API_BASE}${path}`, {
        ...options,
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        }
    });


    let payload = null;

    try {
        payload = await response.json();
    } catch (error) {
        // Response was not JSON.
    }


    if (!response.ok) {
        const message =
            payload?.error ||
            payload?.message ||
            `Request failed with status ${response.status}.`;

        throw new Error(message);
    }


    return payload;
}


/* ============================================================
   Categories
   ============================================================ */

export async function getCategories() {
    const payload = await requestJson("/categories");


    // Supports:
    // { "categories": ["IT Support", ...] }
    //
    // and:
    // ["IT Support", ...]


    if (Array.isArray(payload)) {
        return payload;
    }


    if (Array.isArray(payload?.categories)) {
        return payload.categories;
    }


    throw new Error("Invalid categories response from API.");
}


/* ============================================================
   Student
   ============================================================ */

export async function createTicket(ticket) {
    return requestJson("/tickets", {
        method: "POST",
        body: JSON.stringify(ticket)
    });
}


/* ============================================================
   Admin
   ============================================================ */

export async function getTickets(filters = {}) {
    const params = new URLSearchParams();


    if (filters.category) {
        params.set("category", filters.category);
    }


    if (filters.status) {
        params.set("status", filters.status);
    }


    if (filters.email) {
        params.set("email", filters.email);
    }


    if (filters.q) {
        params.set("q", filters.q);
    }


    if (filters.limit) {
        params.set("limit", filters.limit);
    }


    const query = params.toString();

    const path = query
        ? `/tickets?${query}`
        : "/tickets";


    return requestJson(path, {
        method: "GET"
    });
}


export async function getTicket(ticketId) {
    return requestJson(
        `/ticket_item/${encodeURIComponent(ticketId)}`,
        {
            method: "GET"
        }
    );
}


export async function updateTicket(ticketId, changes, adminKey = "") {
    const headers = {};


    if (adminKey) {
        headers["x-admin-key"] = adminKey;
    }


    return requestJson(
        `/ticket_item/${encodeURIComponent(ticketId)}`,
        {
            method: "PATCH",
            headers: headers,
            body: JSON.stringify(changes)
        }
    );
}