const artworkPage = document.getElementById("artworkPage");
const artworkId = new URLSearchParams(window.location.search).get("id");
const inquiryDialog = document.getElementById("inquiryDialog");
const inquiryForm = document.getElementById("inquiryForm");
const inquiryArtwork = document.getElementById("inquiryArtwork");
const inquiryStatus = document.getElementById("inquiryStatus");
let activePaintings = Array.isArray(paintings) ? [...paintings] : [];

function isLocalhost() {
  const host = window.location.hostname.toLowerCase();
  return host === "localhost"
    || host === "127.0.0.1"
    || host === "::1"
    || host === "[::1]"
    || host.startsWith("127.0.0.");
}

function formatDate(dateValue) {
  if (!dateValue) return "Date not provided";
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateValue;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

function showUnavailable() {
  artworkPage.innerHTML = '<p class="error-message">This artwork could not be found. <a href="./art_gallery.html">Return to the gallery</a>.</p>';
}

function renderArtwork(painting) {
  if (!painting || !painting.image) {
    showUnavailable();
    return;
  }

  document.title = `${painting.title || "Artwork"} | Soni Gallery`;
  const image = document.createElement("img");
  image.className = "artwork-image";
  image.src = painting.image;
  image.alt = `${painting.title || "Artwork"} by ${painting.artist || "Unknown artist"}`;

  const stage = document.createElement("div");
  stage.className = "artwork-stage";
  stage.appendChild(image);

  const info = document.createElement("section");
  info.className = "artwork-info";

  const eyebrow = document.createElement("p");
  eyebrow.className = "eyebrow";
  eyebrow.textContent = "Featured artwork";

  const title = document.createElement("h1");
  title.className = "artwork-title";
  title.textContent = painting.title || "Untitled artwork";

  const artist = document.createElement("p");
  artist.className = "artist-name";
  artist.textContent = `by ${painting.artist || "Unknown artist"}`;

  const rule = document.createElement("hr");
  rule.className = "detail-rule";

  const description = document.createElement("p");
  description.className = "artwork-description";
  description.textContent = painting.description || "No description is available for this artwork.";

  const meta = document.createElement("p");
  meta.className = "artwork-meta";
  meta.textContent = `Created ${formatDate(painting.date)}`;

  const priceRow = document.createElement("div");
  priceRow.className = "price-row";

  const priceBlock = document.createElement("div");
  const priceLabel = document.createElement("span");
  priceLabel.className = "price-label";
  priceLabel.textContent = "Price";
  const price = document.createElement("strong");
  price.className = "artwork-price";
  price.textContent = painting.price || "Contact for pricing";
  priceBlock.append(priceLabel, price);

  const inquiry = document.createElement("button");
  inquiry.className = "inquiry-link";
  inquiry.type = "button";
  inquiry.textContent = "Ask about this work";
  inquiry.addEventListener("click", () => {
    inquiryArtwork.textContent = `${painting.title || "Untitled artwork"} by ${painting.artist || "Unknown artist"} | ${painting.price || "Contact for pricing"}`;
    inquiryStatus.textContent = "";
    inquiryStatus.dataset.state = "";
    inquiryForm.querySelector('[type="submit"]').textContent = "Open email";
    inquiryDialog.showModal();
    inquiryForm.elements.name.focus();
  });
  priceRow.append(priceBlock, inquiry);

  const artistWorksToggle = document.createElement("button");
  artistWorksToggle.className = "artist-works-toggle";
  artistWorksToggle.type = "button";
  artistWorksToggle.textContent = "More from this artist";
  artistWorksToggle.setAttribute("aria-expanded", "false");
  artistWorksToggle.setAttribute("aria-controls", "artistWorks");

  const deleteButton = document.createElement("button");
  deleteButton.className = "delete-button";
  deleteButton.type = "button";
  deleteButton.textContent = "Delete painting";
  deleteButton.hidden = !isLocalhost();
  deleteButton.addEventListener("click", () => deleteArtwork(painting));

  info.append(eyebrow, title, artist, rule, description, meta, priceRow, deleteButton, artistWorksToggle);

  const artistWorks = document.createElement("section");
  artistWorks.className = "artist-works";
  artistWorks.id = "artistWorks";
  artistWorks.hidden = true;
  const artistWorksTitle = document.createElement("h2");
  artistWorksTitle.className = "artist-works-title";
  artistWorksTitle.id = "artistWorksTitle";
  artistWorksTitle.textContent = `More from ${painting.artist || "this artist"}`;
  artistWorks.setAttribute("aria-labelledby", artistWorksTitle.id);
  const artistWorksGrid = document.createElement("div");
  artistWorksGrid.className = "artist-works-grid";

  const relatedPaintings = activePaintings.filter((work) =>
    work.id !== painting.id && work.artist === painting.artist
  );
  if (relatedPaintings.length) {
    relatedPaintings.forEach((work) => {
      const card = document.createElement("a");
      card.className = "related-artwork";
      card.href = `./artwork.html?id=${encodeURIComponent(work.id)}`;

      const thumbnail = document.createElement("img");
      thumbnail.src = work.image;
      thumbnail.alt = work.title || "Artwork by this artist";

      const cardInfo = document.createElement("div");
      cardInfo.className = "related-artwork-info";
      const cardTitle = document.createElement("span");
      cardTitle.textContent = work.title || "Untitled artwork";
      const cardPrice = document.createElement("strong");
      cardPrice.textContent = work.price || "Contact for pricing";
      cardInfo.append(cardTitle, cardPrice);
      card.append(thumbnail, cardInfo);
      artistWorksGrid.appendChild(card);
    });
  } else {
    const emptyMessage = document.createElement("p");
    emptyMessage.className = "artist-works-empty";
    emptyMessage.textContent = "No other works by this artist are available yet.";
    artistWorksGrid.appendChild(emptyMessage);
  }

  artistWorksToggle.addEventListener("click", () => {
    const expanded = artistWorksToggle.getAttribute("aria-expanded") === "true";
    artistWorksToggle.setAttribute("aria-expanded", String(!expanded));
    artistWorks.hidden = expanded;
    artistWorksToggle.textContent = expanded ? "More from this artist" : "Hide artist's works";
    if (!expanded) artistWorks.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  artistWorks.append(artistWorksTitle, artistWorksGrid);
  artworkPage.replaceChildren(stage, info, artistWorks);
}

async function deleteArtwork(painting) {
  if (!window.confirm(`Delete "${painting.title}" from the gallery?`)) return;

  const headers = { "Content-Type": "application/json" };
  let password = sessionStorage.getItem("gallery-admin-password");
  if (password === null) {
    password = window.prompt("Enter admin password for localhost editing (leave blank if no password is configured):", "");
    if (password === null) return;
    sessionStorage.setItem("gallery-admin-password", password);
  }
  if (password) headers["X-Admin-Password"] = password;

  try {
    const response = await fetch("/api/delete", {
      method: "DELETE",
      headers,
      body: JSON.stringify({ image: painting.image })
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Failed to delete painting.");
    window.location.href = "./art_gallery.html";
  } catch (error) {
    window.alert(error.message || "Unable to delete the painting.");
  }
}

async function loadArtwork() {
  if (!artworkId) {
    showUnavailable();
    return;
  }

  if (isLocalhost()) {
    try {
      const response = await fetch("/api/paintings");
      if (response.ok) {
        const savedPaintings = await response.json();
        const mergedPaintings = new Map(
          [...activePaintings, ...savedPaintings].map((painting) => [painting.id, painting])
        );
        activePaintings = [...mergedPaintings.values()];
      }
    } catch (error) {
      console.warn("Unable to load saved artwork:", error);
    }
  }

  const selectedPainting = activePaintings.find((painting) => painting.id === artworkId);
  if (selectedPainting) {
    renderArtwork(selectedPainting);
  } else {
    showUnavailable();
  }
}

loadArtwork();

function closeInquiryDialog() {
  inquiryDialog.close();
  inquiryForm.reset();
  inquiryStatus.textContent = "";
  inquiryStatus.dataset.state = "";
}

document.getElementById("closeInquiryButton").addEventListener("click", closeInquiryDialog);
document.getElementById("cancelInquiryButton").addEventListener("click", closeInquiryDialog);

inquiryDialog.addEventListener("click", (event) => {
  if (event.target === inquiryDialog) closeInquiryDialog();
});

function buildInquiryMailto(painting, fields) {
  const title = painting?.title || "Artwork";
  const subject = encodeURIComponent(`Inquiry for ${title}`);
  const cc = encodeURIComponent(fields.get("email"));
  const body = encodeURIComponent([
    `Artwork: ${title}`,
    `Artist: ${painting?.artist || "Unknown artist"}`,
    `Price: ${painting?.price || "Contact for pricing"}`,
    `Created: ${formatDate(painting?.date)}`,
    `Description: ${painting?.description || "No description provided"}`,
    "",
    `Name: ${fields.get("name")}`,
    `Email: ${fields.get("email")}`,
    `Phone: ${fields.get("phone")}`,
    "",
    "Comments:",
    fields.get("comments")
  ].join("\n"));

  return `mailto:amarkushwahacs@outlook.com?cc=${cc}&subject=${subject}&body=${body}`;
}

inquiryForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const fields = new FormData(inquiryForm);
  const selectedPainting = activePaintings.find((painting) => painting.id === artworkId);
  window.location.href = buildInquiryMailto(selectedPainting, fields);
});
