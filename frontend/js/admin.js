import {
    getCategories,
    getTickets,
    updateTicket
} from "./api.js";


const categoryFilter =
    document.getElementById("f-category");

const statusFilter =
    document.getElementById("f-status");

const emailFilter =
    document.getElementById("f-email");

const searchFilter =
    document.getElementById("f-q");

const adminKeyInput =
    document.getElementById("admin-key");

const applyButton =
    document.getElementById("apply");

const clearButton =
    document.getElementById("clear");

const refreshButton =
    document.getElementById("refresh");

const rows =
    document.getElementById("rows");

const stats =
    document.getElementById("stats");

const banner =
    document.getElementById("banner");


/* ============================================================
   Constants
   ============================================================ */

const STATUSES = [
    "New",
    "Categorised",
    "In Progress",
    "Resolved"
];


const PRIORITIES = [
    "low",
    "medium",
    "high"
];


/* ============================================================
   UI helpers
   ============================================================ */

function showBanner(message, type = "success") {
    banner.innerHTML = "";


    const element = document.createElement("div");

    element.className = `banner ${type}`;

    element.textContent = message;

    banner.appendChild(element);
}


function clearBanner() {
    banner.innerHTML = "";
}


function escapeHtml(value) {
    const div = document.createElement("div");

    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return div.innerHTML;
}


function formatDate(value) {
    if (!value) {
        return "-";
    }


    const date = new Date(value);


    if (Number.isNaN(date.getTime())) {
        return value;
    }


    return date.toLocaleString();
}


/* ============================================================
   Badges
   ============================================================ */

function categoryBadge(category) {
    return `
        <span class="badge cat">
            ${escapeHtml(category || "General Enquiry")}
        </span>
    `;
}


function priorityBadge(priority) {
    const value =
        (priority || "medium").toLowerCase();


    let className = "neutral";


    if (value === "high") {
        className = "urgent";
    } else if (value === "medium") {
        className = "amber";
    } else if (value === "low") {
        className = "sky";
    }


    return `
        <span class="badge ${className}">
            ${escapeHtml(value)}
        </span>
    `;
}


function statusBadge(status) {
    const value =
        status || "New";


    let className = "neutral";


    if (value === "Resolved") {
        className = "ok";
    } else if (value === "In Progress") {
        className = "sky";
    } else if (value === "New") {
        className = "amber";
    }


    return `
        <span class="badge ${className}">
            ${escapeHtml(value)}
        </span>
    `;
}


/* ============================================================
   Ticket extraction
   ============================================================ */

function extractTickets(payload) {
    /*
     * Supports:
     *
     * [
     *   {...},
     *   {...}
     * ]
     *
     * and:
     *
     * {
     *   "tickets": [...]
     * }
     *
     * and:
     *
     * {
     *   "items": [...]
     * }
     */


    if (Array.isArray(payload)) {
        return payload;
    }


    if (Array.isArray(payload?.tickets)) {
        return payload.tickets;
    }


    if (Array.isArray(payload?.items)) {
        return payload.items;
    }


    return [];
}


/* ============================================================
   Filters
   ============================================================ */

function getFilters() {
    return {
        category:
            categoryFilter.value.trim(),

        status:
            statusFilter.value.trim(),

        email:
            emailFilter.value.trim(),

        q:
            searchFilter.value.trim(),

        limit: 100
    };
}


/* ============================================================
   Load filter options
   ============================================================ */

async function loadFilterOptions() {
    try {
        const categories =
            await getCategories();


        categoryFilter.innerHTML =
            '<option value="">All categories</option>';


        for (const category of categories) {
            const option =
                document.createElement("option");

            option.value = category;
            option.textContent = category;

            categoryFilter.appendChild(option);
        }


        statusFilter.innerHTML =
            '<option value="">All statuses</option>';


        for (const status of STATUSES) {
            const option =
                document.createElement("option");

            option.value = status;
            option.textContent = status;

            statusFilter.appendChild(option);
        }

    } catch (error) {
        console.error(
            "Could not load filter options:",
            error
        );


        /*
         * Keep a local fallback so the Admin page remains
         * usable if /api/categories is temporarily unavailable.
         */

        categoryFilter.innerHTML =
            '<option value="">All categories</option>' +
            '<option value="IT Support">IT Support</option>' +
            '<option value="Facilities">Facilities</option>' +
            '<option value="Course Registration">Course Registration</option>' +
            '<option value="Student Finance">Student Finance</option>' +
            '<option value="Library Services">Library Services</option>' +
            '<option value="General Enquiry">General Enquiry</option>';


        statusFilter.innerHTML =
            '<option value="">All statuses</option>' +
            '<option value="New">New</option>' +
            '<option value="Categorised">Categorised</option>' +
            '<option value="In Progress">In Progress</option>' +
            '<option value="Resolved">Resolved</option>';
    }
}


/* ============================================================
   Statistics
   ============================================================ */

function renderStats(tickets) {
    const total =
        tickets.length;


    const newCount =
        tickets.filter(
            ticket => ticket.status === "New"
        ).length;


    const inProgressCount =
        tickets.filter(
            ticket => ticket.status === "In Progress"
        ).length;


    const resolvedCount =
        tickets.filter(
            ticket => ticket.status === "Resolved"
        ).length;


    stats.innerHTML = `
        <div class="stat">
            <div class="n">${total}</div>
            <div class="l">Tickets shown</div>
        </div>

        <div class="stat">
            <div class="n">${newCount}</div>
            <div class="l">New</div>
        </div>

        <div class="stat">
            <div class="n">${inProgressCount}</div>
            <div class="l">In progress</div>
        </div>

        <div class="stat">
            <div class="n">${resolvedCount}</div>
            <div class="l">Resolved</div>
        </div>
    `;
}


/* ============================================================
   Ticket table
   ============================================================ */

function renderRows(tickets) {
    if (!tickets.length) {
        rows.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="muted"
                    style="padding:22px;"
                >
                    No tickets found.
                </td>
            </tr>
        `;

        return;
    }


    rows.innerHTML = "";


    for (const ticket of tickets) {
        const row =
            document.createElement("tr");


        const id =
            ticket.id ||
            ticket.ticketId ||
            "";


        const requester =
            ticket.name ||
            ticket.fullName ||
            "-";


        const email =
            ticket.email ||
            "-";


        const title =
            ticket.title ||
            "-";


        const category =
            ticket.category ||
            "General Enquiry";


        const priority =
            ticket.priority ||
            "medium";


        const status =
            ticket.status ||
            "New";


        const createdAt =
            ticket.createdAt ||
            ticket.submittedAt ||
            ticket.created ||
            null;


        row.innerHTML = `
            <td>
                <span class="mono">
                    ${escapeHtml(formatDate(createdAt))}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHtml(requester)}
                </strong>
                <br>
                <span class="muted">
                    ${escapeHtml(email)}
                </span>
            </td>

            <td>
                <strong>
                    ${escapeHtml(title)}
                </strong>
            </td>

            <td>
                ${categoryBadge(category)}
            </td>

            <td>
                ${priorityBadge(priority)}
            </td>

            <td>
                ${statusBadge(status)}
            </td>

            <td>
                <div class="row-actions">

                    <button
                        class="ghost"
                        data-action="status"
                        data-id="${escapeHtml(id)}"
                        data-status="${escapeHtml(status)}"
                    >
                        Change status
                    </button>

                    <button
                        class="ghost"
                        data-action="category"
                        data-id="${escapeHtml(id)}"
                        data-category="${escapeHtml(category)}"
                    >
                        Change category
                    </button>

                </div>
            </td>
        `;


        rows.appendChild(row);
    }
}


/* ============================================================
   Load tickets
   ============================================================ */

async function loadTickets() {
    clearBanner();


    rows.innerHTML = `
        <tr>
            <td
                colspan="7"
                class="muted"
                style="padding:22px;"
            >
                Loading tickets...
            </td>
        </tr>
    `;


    try {
        const payload =
            await getTickets(getFilters());


        const tickets =
            extractTickets(payload);


        renderStats(tickets);

        renderRows(tickets);

    } catch (error) {
        console.error(
            "Could not load tickets:",
            error
        );


        stats.innerHTML = "";


        rows.innerHTML = `
            <tr>
                <td
                    colspan="7"
                    class="muted"
                    style="padding:22px;"
                >
                    Could not load tickets.
                </td>
            </tr>
        `;


        showBanner(
            error.message ||
            "Could not load tickets.",
            "error"
        );
    }
}


/* ============================================================
   Change status
   ============================================================ */

async function changeStatus(ticketId) {
    const currentStatus =
        getCurrentStatusFromRow(ticketId);


    const selected =
        window.prompt(
            "Enter the new status:\n\n" +
            "New\n" +
            "Categorised\n" +
            "In Progress\n" +
            "Resolved",
            currentStatus || "New"
        );


    if (selected === null) {
        return;
    }


    const status =
        selected.trim();


    if (!STATUSES.includes(status)) {
        showBanner(
            "Invalid status. Use New, Categorised, In Progress, or Resolved.",
            "error"
        );

        return;
    }


    await saveTicketChange(
        ticketId,
        {
            status: status
        }
    );
}


/* ============================================================
   Change category
   ============================================================ */

async function changeCategory(ticketId) {
    const currentCategory =
        getCurrentCategoryFromRow(ticketId);


    const categories =
        await getCategories();


    const selected =
        window.prompt(
            "Enter the new category:\n\n" +
            categories.join("\n"),
            currentCategory || "General Enquiry"
        );


    if (selected === null) {
        return;
    }


    const category =
        selected.trim();


    if (!categories.includes(category)) {
        showBanner(
            "Invalid category.",
            "error"
        );

        return;
    }


    await saveTicketChange(
        ticketId,
        {
            category: category
        }
    );
}


/* ============================================================
   Find current values from table
   ============================================================ */

function findRowByTicketId(ticketId) {
    const buttons =
        rows.querySelectorAll(
            `button[data-id="${CSS.escape(ticketId)}"]`
        );


    if (!buttons.length) {
        return null;
    }


    return buttons[0].closest("tr");
}


function getCurrentStatusFromRow(ticketId) {
    const row =
        findRowByTicketId(ticketId);


    if (!row) {
        return "New";
    }


    const button =
        row.querySelector(
            'button[data-action="status"]'
        );


    return button?.dataset.status ||
        "New";
}


function getCurrentCategoryFromRow(ticketId) {
    const row =
        findRowByTicketId(ticketId);


    if (!row) {
        return "General Enquiry";
    }


    const button =
        row.querySelector(
            'button[data-action="category"]'
        );


    return button?.dataset.category ||
        "General Enquiry";
}


/* ============================================================
   Save admin change
   ============================================================ */

async function saveTicketChange(
    ticketId,
    changes
) {
    const adminKey =
        adminKeyInput.value.trim();


    try {
        await updateTicket(
            ticketId,
            changes,
            adminKey
        );


        showBanner(
            "Ticket updated successfully.",
            "success"
        );


        await loadTickets();

    } catch (error) {
        console.error(
            "Could not update ticket:",
            error
        );


        showBanner(
            error.message ||
            "Could not update ticket.",
            "error"
        );
    }
}


/* ============================================================
   Table actions
   ============================================================ */

rows.addEventListener(
    "click",
    async function(event) {
        const button =
            event.target.closest("button[data-action]");


        if (!button) {
            return;
        }


        const ticketId =
            button.dataset.id;


        const action =
            button.dataset.action;


        if (!ticketId) {
            showBanner(
                "Ticket ID is missing.",
                "error"
            );

            return;
        }


        if (action === "status") {
            await changeStatus(ticketId);
        }


        if (action === "category") {
            await changeCategory(ticketId);
        }
    }
);


/* ============================================================
   Filter controls
   ============================================================ */

applyButton.addEventListener(
    "click",
    function(event) {
        event.preventDefault();

        loadTickets();
    }
);


clearButton.addEventListener(
    "click",
    function(event) {
        event.preventDefault();


        categoryFilter.value = "";
        statusFilter.value = "";
        emailFilter.value = "";
        searchFilter.value = "";


        loadTickets();
    }
);


refreshButton.addEventListener(
    "click",
    function(event) {
        event.preventDefault();

        loadTickets();
    }
);


/* ============================================================
   Initialisation
   ============================================================ */

async function initialise() {
    await loadFilterOptions();

    await loadTickets();
}


initialise();