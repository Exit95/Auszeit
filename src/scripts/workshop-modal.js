// Workshop Modal Handler
document.addEventListener("DOMContentLoaded", () => {
  const modal = document.getElementById("workshopModal");
  const overlay = modal?.querySelector(".modal__overlay");
  const closeBtn = modal?.querySelector(".modal__close");
  const workshopCards = document.querySelectorAll(".workshop-card");

  // Elemente im Modal
  const modalImage = document.getElementById("workshopModalImage");
  const modalTitle = document.getElementById("workshopModalTitle");
  const modalMeta = document.getElementById("workshopModalMeta");
  const modalDescription = document.getElementById("workshopModalDescription");
  const modalBadge = document.getElementById("workshopModalBadge");
  const modalBooking = document.getElementById("workshopModalBooking");
  const modalClosed = document.getElementById("workshopModalClosed");
  const bookingForm = document.getElementById("workshopBookingForm");
  const bookingMessageDiv = document.getElementById("bookingMessageDiv");

  // Workshop-Daten laden
  async function loadWorkshopData(workshopId) {
    try {
      const response = await fetch("/api/workshops");
      if (!response.ok) throw new Error("Failed to load workshops");
      const workshops = await response.json();
      return workshops.find((w) => w.id === workshopId);
    } catch (error) {
      console.error("Error loading workshop:", error);
      return null;
    }
  }

  // Modal öffnen
  async function openModal(workshopId) {
    const workshop = await loadWorkshopData(workshopId);
    if (!workshop) return;

    // Bild setzen
    const imageUrl = workshop.imageFilename
      ? `/uploads/${workshop.imageFilename}`
      : "/becher.jpeg";
    modalImage.src = imageUrl;
    modalImage.alt = workshop.title;

    // Titel setzen
    modalTitle.textContent = workshop.title;

    // Beschreibung setzen (ausführliche Beschreibung bevorzugen, sonst Kurzbeschreibung)
    modalDescription.textContent = workshop.detailedDescription || workshop.description;

    // Verfügbarkeit berechnen
    const currentParticipants = workshop.currentParticipants ?? 0;
    const availableSpots = workshop.maxParticipants - currentParticipants;
    const isFull = availableSpots <= 0;

    // Badge setzen
    if (isFull) {
      modalBadge.textContent = "Ausgebucht";
      modalBadge.className = "modal__badge sold";
    } else {
      modalBadge.textContent = `${availableSpots} Plätze frei`;
      modalBadge.className = "modal__badge available";
    }

    // Datum formatieren
    const formattedDate = new Date(
      workshop.date + "T00:00:00"
    ).toLocaleDateString("de-DE", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    // Meta-Infos setzen
    const location =
      workshop.location || "Atelier Auszeit, Feldstiege 6a, Gronau";
    modalMeta.innerHTML = `
      <div class="modal__meta-item">
        <span>📅</span>
        <span>${formattedDate}</span>
      </div>
      <div class="modal__meta-item">
        <span>⏰</span>
        <span>${workshop.time} Uhr</span>
      </div>
      <div class="modal__meta-item">
        <span>📍</span>
        <span>${location}</span>
      </div>
      <div class="modal__meta-item">
        <span>👥</span>
        <span>${currentParticipants} / ${workshop.maxParticipants} Plätze belegt</span>
      </div>
      <div class="modal__meta-item price">
        <span>💶</span>
        <span>${workshop.price}</span>
      </div>
    `;

    // Buchungsbereich oder "Geschlossen"-Nachricht anzeigen
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const isPast = new Date(workshop.date + "T00:00:00") < today;
    const canBook = workshop.active && !isFull && !isPast;

    if (canBook) {
      modalBooking.classList.remove("hidden");
      modalClosed.classList.add("hidden");

      // Formular-Felder setzen
      document.getElementById("bookingWorkshopId").value = workshop.id;
      document.getElementById("bookingWorkshopTitle").value = workshop.title;
    } else {
      modalBooking.classList.add("hidden");
      modalClosed.classList.remove("hidden");

      let closedMessage = "";
      if (isPast) {
        closedMessage = "<p>Dieser Workshop hat bereits stattgefunden.</p>";
      } else if (isFull) {
        closedMessage =
          '<p>Leider sind alle Plätze ausgebucht.<br><a href="/kontakt">Schreiben Sie mir</a> für die Warteliste.</p>';
      } else {
        closedMessage = "<p>Buchung ist derzeit nicht möglich.</p>";
      }
      modalClosed.innerHTML = closedMessage;
    }

    // Modal anzeigen
    modal.classList.add("active");
    document.body.style.overflow = "hidden";
  }

  // Modal schließen
  function closeModal() {
    modal.classList.remove("active");
    document.body.style.overflow = "";
    bookingForm.reset();
    bookingMessageDiv.classList.add("hidden");
  }

  // Event Listeners
  workshopCards.forEach((card) => {
    card.addEventListener("click", (e) => {
      e.preventDefault();
      const workshopId = card.getAttribute("data-workshop-id");
      if (workshopId) {
        openModal(workshopId);
      }
    });
  });

  closeBtn?.addEventListener("click", closeModal);
  overlay?.addEventListener("click", closeModal);

  // ESC-Taste zum Schließen
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal.classList.contains("active")) {
      closeModal();
    }
  });

  // Formular-Submit
  bookingForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = bookingForm.querySelector('button[type="submit"]');

    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Wird gesendet...";
    }

    const formData = new FormData(bookingForm);
    const raw = Object.fromEntries(formData.entries());

    const payload = {
      ...raw,
      workshopId: String(raw.workshopId || ""),
      name: String(raw.name || "").trim(),
      email: String(raw.email || "").trim(),
      phone: raw.phone ? String(raw.phone).trim() : undefined,
      participants: Number(raw.participants || 1),
      notes: (raw.message || raw.notes || "").toString().trim(),
    };

    delete payload.message;

    try {
      const res = await fetch("/api/workshops/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      bookingMessageDiv.classList.remove("hidden");

      if (res.ok && result.success) {
        bookingMessageDiv.textContent =
          "Vielen Dank! Ihre Anfrage wurde gesendet. Sie erhalten bald eine Bestätigung.";
        bookingMessageDiv.className = "message success";
        bookingForm.reset();
      } else {
        bookingMessageDiv.textContent =
          result.error || "Fehler beim Senden der Anfrage.";
        bookingMessageDiv.className = "message error";
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = "Jetzt verbindlich anfragen";
        }
      }
    } catch (error) {
      bookingMessageDiv.classList.remove("hidden");
      bookingMessageDiv.textContent =
        "Ein Fehler ist aufgetreten. Bitte versuchen Sie es später erneut.";
      bookingMessageDiv.className = "message error";
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "Jetzt verbindlich anfragen";
      }
    }
  });
});

