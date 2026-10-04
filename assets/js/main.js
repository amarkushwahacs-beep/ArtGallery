const leftWall = document.getElementById("leftWall");
const rightWall = document.getElementById("rightWall");
const detailsPanel = document.getElementById("detailsPanel");
const artistWorks = document.getElementById("artistWorks");
const artistWorksGrid = document.getElementById("artistWorksGrid");
const moreArtistBtn = document.getElementById("moreArtistBtn");
const selectedArtwork = document.getElementById("selectedArtwork");

const detailsTitle = document.getElementById("detailsTitle");
const detailsPrice = document.getElementById("detailsPrice");
const detailsMeta = document.getElementById("detailsMeta");
const detailsDescription = document.getElementById("detailsDescription");
const detailsArtist = document.getElementById("detailsArtist");
const inquireBtn = document.getElementById("inquireBtn");
const inquiryModal = document.getElementById("inquiryModal");
const inquiryForm = document.getElementById("inquiryForm");
const closeInquiryBtn = document.getElementById("closeInquiryBtn");
const cancelInquiryBtn = document.getElementById("cancelInquiryBtn");
const addPaintingBtn = document.getElementById("addPaintingBtn");
const deletePaintingBtn = document.getElementById("deletePaintingBtn");
const addPaintingModal = document.getElementById("addPaintingModal");
const addPaintingForm = document.getElementById("addPaintingForm");
const closeAddPaintingBtn = document.getElementById("closeAddPaintingBtn");
const cancelAddPaintingBtn = document.getElementById("cancelAddPaintingBtn");

let selectedPainting = null;

function isLocalhost() {
  const host = window.location.hostname.toLowerCase();
  return host === "localhost"
    || host === "127.0.0.1"
    || host === "::1"
    || host === "[::1]"
    || host.startsWith("127.0.0.");
}

function getAdminPassword() {
  const storedValue = sessionStorage.getItem("gallery-admin-password");
  if (storedValue !== null) {
    return storedValue;
  }

  const entered = window.prompt(
    "Enter admin password for localhost editing (leave blank if no password is configured):",
    ""
  );

  if (entered === null) {
    return "";
  }

  sessionStorage.setItem("gallery-admin-password", entered);
  return entered;
}

function setLocalAdminControls() {
  const enabled = isLocalhost();
  if (addPaintingBtn) {
    addPaintingBtn.style.display = enabled ? "inline-flex" : "none";
  }
  if (deletePaintingBtn) {
    deletePaintingBtn.style.display = enabled ? "inline-flex" : "none";
  }
}

function resetDetailsView() {
  selectedPainting = null;
  detailsPanel.classList.remove("visible");
  selectedArtwork.classList.remove("visible");
  artistWorks.classList.remove("visible");
}

let activePaintings = Array.isArray(paintings) ? [...paintings] : [];

function artworkPageUrl(painting) {
  return `./artwork.html?id=${encodeURIComponent(painting.id)}`;
}

function renderPaintings() {
  leftWall.innerHTML = "";
  rightWall.innerHTML = "";

  activePaintings.forEach((p, index) => {
    const frame = document.createElement("a");
    frame.className = "painting";
    frame.href = artworkPageUrl(p);
    frame.setAttribute("aria-label", `${p.title} by ${p.artist}`);
    frame.style.backgroundImage = `url("${p.image}")`;
    frame.dataset.id = p.id;
    frame.dataset.title = p.title;

    if (index % 2 === 0) {
      leftWall.appendChild(frame);
    } else {
      rightWall.appendChild(frame);
    }
  });
}

function showDetails(painting) {
  selectedPainting = painting;
  detailsTitle.textContent = painting.title;
  detailsPrice.textContent = painting.price;
  detailsMeta.textContent = `Painted by ${painting.artist} • Created on ${formatDate(painting.date)}`;
  detailsDescription.textContent = painting.description;
  detailsArtist.textContent = `Artist: ${painting.artist}`;

  selectedArtwork.style.backgroundImage = `url("${painting.image}")`;
  selectedArtwork.classList.add("visible");
  detailsPanel.classList.add("visible");
  artistWorks.classList.remove("visible");
}

function renderArtistWorks(artistName) {
  const relatedPaintings = activePaintings.filter((painting) => painting.artist === artistName);
  artistWorksGrid.innerHTML = "";

  if (!relatedPaintings.length) {
    artistWorks.classList.remove("visible");
    return;
  }

  relatedPaintings.forEach((painting) => {
    const card = document.createElement("a");
    card.className = "artist-work";
    card.href = artworkPageUrl(painting);
    card.style.backgroundImage = `url("${painting.image}")`;
    card.title = painting.title;

    const label = document.createElement("span");
    label.className = "artist-work-label";
    label.textContent = painting.title;
    card.appendChild(label);

    artistWorksGrid.appendChild(card);
  });
}

async function loadSavedPaintings() {
  if (!isLocalhost()) {
    return;
  }

  try {
    const response = await fetch("/api/paintings");
    if (!response.ok) {
      return;
    }

    const savedPaintings = await response.json();
    if (!Array.isArray(savedPaintings)) {
      return;
    }

    const merged = [];
    const seen = new Set();

    [...savedPaintings, ...activePaintings].forEach((painting) => {
      const imagePath = painting && painting.image ? painting.image.toLowerCase() : "";
      if (!imagePath || seen.has(imagePath)) {
        return;
      }
      seen.add(imagePath);
      merged.push(painting);
    });

    activePaintings = merged;
    renderPaintings();
  } catch (error) {
    console.warn("Unable to load saved paintings from local upload API:", error);
  }
}

moreArtistBtn.addEventListener("click", () => {
  if (!selectedPainting) return;
  renderArtistWorks(selectedPainting.artist);
  artistWorks.classList.toggle("visible");
  if (artistWorks.classList.contains("visible")) {
    artistWorks.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
});

function openInquiryModal() {
  inquiryModal.classList.add("visible");
  inquiryModal.setAttribute("aria-hidden", "false");
  document.getElementById("inquiryName").focus();
}

function closeInquiryModal() {
  inquiryModal.classList.remove("visible");
  inquiryModal.setAttribute("aria-hidden", "true");
  inquiryForm.reset();
}

function openAddPaintingModal() {
  addPaintingModal.classList.add("visible");
  addPaintingModal.setAttribute("aria-hidden", "false");
  addPaintingForm.querySelector("input[name='title']").focus();
}

function closeAddPaintingModal() {
  addPaintingModal.classList.remove("visible");
  addPaintingModal.setAttribute("aria-hidden", "true");
  addPaintingForm.reset();
}

async function submitAddPainting(event) {
  event.preventDefault();

  const formData = new FormData(addPaintingForm);
  const file = formData.get("image");

  if (!file || !file.name) {
    window.alert("Please choose an image file first.");
    return;
  }

  const submitButton = addPaintingForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Uploading...";

  try {
    const headers = {};
    const password = getAdminPassword();
    if (password) {
      headers["X-Admin-Password"] = password;
    }

    const response = await fetch("/api/upload", {
      method: "POST",
      headers,
      body: formData
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Upload failed.");
    }

    const nextWall = activePaintings.length % 2 === 0 ? "left" : "right";
    activePaintings.unshift({
      ...payload,
      wall: payload.wall || nextWall
    });

    window.location.href = artworkPageUrl(activePaintings[0]);
  } catch (error) {
    window.alert(error.message || "Unable to upload the painting.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Add painting";
  }
}

async function deleteSelectedPainting() {
  if (!selectedPainting) {
    return;
  }

  const confirmed = window.confirm(`Delete "${selectedPainting.title}" from the gallery?`);
  if (!confirmed) {
    return;
  }

  try {
    const headers = {
      "Content-Type": "application/json"
    };
    const password = getAdminPassword();
    if (password) {
      headers["X-Admin-Password"] = password;
    }

    const response = await fetch("/api/delete", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ image: selectedPainting.image })
    });

    const payload = await response.json();
    if (!response.ok) {
      throw new Error(payload.error || "Failed to delete painting.");
    }

    const index = activePaintings.findIndex((painting) => painting.image === selectedPainting.image);
    if (index >= 0) {
      activePaintings.splice(index, 1);
    }

    renderPaintings();
    resetDetailsView();
  } catch (error) {
    window.alert(error.message || "Unable to delete the painting.");
  }
}

inquireBtn.addEventListener("click", openInquiryModal);
closeInquiryBtn.addEventListener("click", closeInquiryModal);
cancelInquiryBtn.addEventListener("click", closeInquiryModal);
inquiryModal.addEventListener("click", (event) => {
  if (event.target === inquiryModal) {
    closeInquiryModal();
  }
});

if (addPaintingBtn) {
  addPaintingBtn.addEventListener("click", openAddPaintingModal);
}

if (closeAddPaintingBtn) {
  closeAddPaintingBtn.addEventListener("click", closeAddPaintingModal);
}

if (cancelAddPaintingBtn) {
  cancelAddPaintingBtn.addEventListener("click", closeAddPaintingModal);
}

if (addPaintingModal) {
  addPaintingModal.addEventListener("click", (event) => {
    if (event.target === addPaintingModal) {
      closeAddPaintingModal();
    }
  });
}

if (addPaintingForm) {
  addPaintingForm.addEventListener("submit", submitAddPainting);
}

if (deletePaintingBtn) {
  deletePaintingBtn.addEventListener("click", deleteSelectedPainting);
}

inquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = document.getElementById("inquiryName").value.trim();
  const email = document.getElementById("inquiryEmail").value.trim();
  const phone = document.getElementById("inquiryPhone").value.trim();
  const comments = document.getElementById("inquiryComments").value.trim();

  const subject = encodeURIComponent(
    `Inquiry for ${selectedPainting ? selectedPainting.title : "artwork"}`
  );
  const body = encodeURIComponent(
    `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\n\nComments:\n${comments}`
  );

  window.location.href = `mailto:amarmaddy000@gmail.com?subject=${subject}&body=${body}`;
  closeInquiryModal();
});

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

renderPaintings();
resetDetailsView();
setLocalAdminControls();
loadSavedPaintings();
