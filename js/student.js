const categories = [
  "IT Support",
  "Facilities",
  "Course Registration",
  "Student Finance",
  "Library Services",
  "General Enquiry"
];

const banner = document.getElementById("banner");
const categorySelect = document.getElementById("category");
const submitButton = document.getElementById("submit");
const clearButton = document.getElementById("clear");

function buildCategoryOptions() {
  categorySelect.innerHTML = `<option value="">Suggest one for me</option>` +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join("");
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

async function submitTicket() {
  clearBanner();

  const payload = {
    name: document.getElementById("full-name").value,
    email: document.getElementById("email").value,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    priority: document.getElementById("priority").value,
    category: document.getElementById("category").value
  };

  try {
    const response = await fetch(`${apiRoot}/tickets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const body = await response.json();
    if (!response.ok) {
      throw new Error(body.error || "Unable to submit ticket.");
    }

    showBanner(`Ticket submitted successfully. Category: ${body.category}. Status: ${body.status}.`);
    document.querySelector("form").reset();
    buildCategoryOptions();
  } catch (err) {
    showBanner(err.message, "error");
  }
}

function clearForm() {
  document.querySelector("form").reset();
  buildCategoryOptions();
  clearBanner();
}

submitButton.addEventListener("click", (event) => {
  event.preventDefault();
  submitTicket();
});

clearButton.addEventListener("click", (event) => {
  event.preventDefault();
  clearForm();
});

buildCategoryOptions();
