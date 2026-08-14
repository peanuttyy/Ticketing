const categories = ["", "IT Support", "Facilities", "Course Registration", "Student Finance", "Library Services", "General Enquiry"];
const statuses = ["", "New", "Categorised", "In Progress", "Resolved"];
const banner = document.getElementById("banner");
const rows = document.getElementById("rows");
const stats = document.getElementById("stats");

function buildSelectOptions(select, items) {
  select.innerHTML = items.map(item => `<option value="${item}">${item || 'All ' + (select.id === 'f-category' ? 'categories' : 'statuses')}</option>`).join("");
}

function showBanner(message, type = "ok") {
  banner.innerHTML = `<div class="card" style="border-color:${type === 'error' ? '#E0645A' : '#3F9C6D'}; color:${type === 'error' ? '#B43D32' : '#16472E'}">${message}</div>`;
}

function clearBanner() {
  banner.innerHTML = "";
}

const isLocalDev = (
  window.location.protocol === "file:" ||
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1" ||
  window.location.hostname === "::1" ||
  window.location.port === "3000" ||
  window.location.port === "5500"
);
const apiRoot = isLocalDev ? "http://localhost:7071/api" : "/api";
console.log('TicketTriage: apiRoot=', apiRoot);

async function fetchTickets() {
  clearBanner();
  const params = new URLSearchParams();
  const category = document.getElementById("f-category").value;
  const status = document.getElementById("f-status").value;
  const email = document.getElementById("f-email").value;
  const q = document.getElementById("f-q").value;

  if (category) params.append("category", category);
  if (status) params.append("status", status);
  if (email) params.append("email", email);
  if (q) params.append("q", q);

  try {
    const response = await fetch(`${apiRoot}/tickets?${params.toString()}`);
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to load tickets.");
    renderTickets(body);
  } catch (err) {
    showBanner(err.message, "error");
  }
}

function renderTickets(tickets) {
  if (!tickets.length) {
    rows.innerHTML = `<tr><td colspan="7" class="muted" style="padding:22px;">No tickets found.</td></tr>`;
    stats.innerText = "No tickets returned.";
    return;
  }

  rows.innerHTML = tickets.map(ticket => {
    return `<tr>
      <td>${new Date(ticket.createdAt).toLocaleString()}</td>
      <td>${ticket.name}<br><span class="mono">${ticket.email}</span></td>
      <td>${ticket.title}</td>
      <td>${ticket.category}</td>
      <td>${ticket.priority}</td>
      <td>${ticket.status}</td>
      <td>
        <select data-id="${ticket.id}" class="status-select">
          ${statuses.map(s => `<option value="${s}" ${s === ticket.status ? 'selected' : ''}>${s || 'Choose'}</option>`).join("")}
        </select>
        <button class="update-btn" data-id="${ticket.id}">Update</button>
      </td>
    </tr>`;
  }).join("");

  stats.innerText = `${tickets.length} ticket${tickets.length === 1 ? '' : 's'} loaded.`;
  attachUpdateHandlers();
}

function attachUpdateHandlers() {
  document.querySelectorAll(".update-btn").forEach(button => {
    button.addEventListener("click", async () => {
      const ticketId = button.dataset.id;
      const select = document.querySelector(`select[data-id='${ticketId}']`);
      const status = select.value;
      await updateTicket(ticketId, { status });
    });
  });
}

async function updateTicket(id, payload) {
  clearBanner();
  try {
    const url = `${apiRoot}/tickets/${id}`;
    console.log('TicketTriage: PATCH', url, payload);
    const response = await fetch(url, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    const body = await response.json();
    if (!response.ok) throw new Error(body.error || "Unable to update ticket.");
    showBanner(`Ticket ${id} updated to ${body.status}.`);
    fetchTickets();
  } catch (err) {
    showBanner(err.message, "error");
  }
}

buildSelectOptions(document.getElementById("f-category"), categories);
buildSelectOptions(document.getElementById("f-status"), statuses);

document.getElementById("apply").addEventListener("click", (event) => {
  event.preventDefault();
  fetchTickets();
});

document.getElementById("clear").addEventListener("click", (event) => {
  event.preventDefault();
  document.querySelector("form").reset();
  buildSelectOptions(document.getElementById("f-category"), categories);
  buildSelectOptions(document.getElementById("f-status"), statuses);
  clearBanner();
});

document.getElementById("refresh").addEventListener("click", (event) => {
  event.preventDefault();
  fetchTickets();
});

fetchTickets();
