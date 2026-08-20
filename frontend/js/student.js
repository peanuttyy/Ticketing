import {
    getCategories,
    createTicket
} from "./api.js";


const fullNameInput = document.getElementById("full-name");
const emailInput = document.getElementById("email");
const titleInput = document.getElementById("title");
const descriptionInput = document.getElementById("description");
const priorityInput = document.getElementById("priority");
const categoryInput = document.getElementById("category");

const submitButton = document.getElementById("submit");
const clearButton = document.getElementById("clear");
const banner = document.getElementById("banner");


/* ============================================================
   UI helpers
   ============================================================ */

function clearBanner() {
    banner.innerHTML = "";
}


function showBanner(message, type = "success") {
    banner.innerHTML = "";


    const element = document.createElement("div");

    element.className = `banner ${type}`;

    element.textContent = message;

    banner.appendChild(element);
}


function setSubmitting(isSubmitting) {
    submitButton.disabled = isSubmitting;

    submitButton.textContent = isSubmitting
        ? "Submitting..."
        : "Submit ticket";
}


/* ============================================================
   Form helpers
   ============================================================ */

function getFormData() {
    return {
        name: fullNameInput.value.trim(),
        email: emailInput.value.trim(),
        title: titleInput.value.trim(),
        description: descriptionInput.value.trim(),
        priority: priorityInput.value,
        category: categoryInput.value
    };
}


function validateForm(data) {
    if (!data.name) {
        return "Please enter your full name.";
    }


    if (!data.email) {
        return "Please enter your email address.";
    }


    if (!emailInput.checkValidity()) {
        return "Please enter a valid email address.";
    }


    if (!data.title) {
        return "Please enter a short title.";
    }


    if (!data.description) {
        return "Please describe the problem.";
    }


    if (data.name.length > 100) {
        return "Full name is too long.";
    }


    if (data.email.length > 254) {
        return "Email address is too long.";
    }


    if (data.title.length > 200) {
        return "Short title is too long.";
    }


    if (data.description.length > 5000) {
        return "Description is too long.";
    }


    return null;
}


function clearForm() {
    fullNameInput.value = "";
    emailInput.value = "";
    titleInput.value = "";
    descriptionInput.value = "";
    priorityInput.value = "medium";
    categoryInput.value = "";

    clearBanner();
}


/* ============================================================
   Categories
   ============================================================ */

async function loadCategories() {
    try {
        const categories = await getCategories();


        categoryInput.innerHTML =
            '<option value="">Suggest one for me</option>';


        for (const category of categories) {
            const option = document.createElement("option");

            option.value = category;
            option.textContent = category;

            categoryInput.appendChild(option);
        }

    } catch (error) {
        console.error(
            "Could not load categories:",
            error
        );


        /*
         * Category is optional.
         *
         * Therefore the student can still submit the ticket
         * and allow the backend classifier to determine the
         * category.
         */

        showBanner(
            "The category list could not be loaded. " +
            "You can still submit the ticket and let the system " +
            "suggest a category.",
            "error"
        );
    }
}


/* ============================================================
   Submit ticket
   ============================================================ */

async function handleSubmit(event) {
    if (event) {
        event.preventDefault();
    }


    clearBanner();


    const data = getFormData();

    const validationError = validateForm(data);


    if (validationError) {
        showBanner(
            validationError,
            "error"
        );

        return;
    }


    setSubmitting(true);


    try {
        const ticket = await createTicket(data);


        const ticketId =
            ticket?.id ||
            ticket?.ticketId ||
            "created";


        const category =
            ticket?.category ||
            "Pending classification";


        showBanner(
            `Ticket submitted successfully. ` +
            `Ticket ID: ${ticketId}. ` +
            `Category: ${category}.`,
            "success"
        );


        /*
         * Clear the form after successful submission.
         */

        fullNameInput.value = "";
        emailInput.value = "";
        titleInput.value = "";
        descriptionInput.value = "";
        priorityInput.value = "medium";
        categoryInput.value = "";

    } catch (error) {
        console.error(
            "Ticket submission failed:",
            error
        );


        showBanner(
            error.message ||
            "The ticket could not be submitted. Please try again.",
            "error"
        );

    } finally {
        setSubmitting(false);
    }
}


/* ============================================================
   Clear
   ============================================================ */

function handleClear(event) {
    if (event) {
        event.preventDefault();
    }


    clearForm();
}


/* ============================================================
   Events
   ============================================================ */

submitButton.addEventListener(
    "click",
    handleSubmit
);


clearButton.addEventListener(
    "click",
    handleClear
);


/*
 * The current HTML has:
 *
 * <form onsubmit="return false;">
 *
 * This listener is still useful if the HTML is changed later.
 */

const ticketForm =
    submitButton.closest("form");


if (ticketForm) {
    ticketForm.addEventListener(
        "submit",
        handleSubmit
    );
}


/* ============================================================
   Initialisation
   ============================================================ */

loadCategories();

/*
 * For student.html use the following code to reset the form when the "Clear" button is clicked.
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('ticket-form');
  const clearBtn = document.getElementById('clear');

  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    form.reset();
  });
});