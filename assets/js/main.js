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

let selectedPainting = null;

function resetDetailsView() {
  selectedPainting = null;
  detailsPanel.classList.remove("visible");
  selectedArtwork.classList.remove("visible");
  artistWorks.classList.remove("visible");
}

function renderPaintings() {
  leftWall.innerHTML = "";
  rightWall.innerHTML = "";

  paintings.forEach((p) => {
    const frame = document.createElement("div");
    frame.className = "painting";
    frame.style.backgroundImage = `url("${p.image}")`;
    frame.dataset.id = p.id;
    frame.dataset.title = p.title;
    frame.addEventListener("click", () => showDetails(p));

    if (p.wall === "left") {
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
  const relatedPaintings = paintings.filter((painting) => painting.artist === artistName);
  artistWorksGrid.innerHTML = "";

  if (!relatedPaintings.length) {
    artistWorks.classList.remove("visible");
    return;
  }

  relatedPaintings.forEach((painting) => {
    const card = document.createElement("div");
    card.className = "artist-work";
    card.style.backgroundImage = `url("${painting.image}")`;
    card.title = painting.title;

    const label = document.createElement("span");
    label.className = "artist-work-label";
    label.textContent = painting.title;
    card.appendChild(label);

    card.addEventListener("click", () => showDetails(painting));
    artistWorksGrid.appendChild(card);
  });
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

inquireBtn.addEventListener("click", openInquiryModal);
closeInquiryBtn.addEventListener("click", closeInquiryModal);
cancelInquiryBtn.addEventListener("click", closeInquiryModal);
inquiryModal.addEventListener("click", (event) => {
  if (event.target === inquiryModal) {
    closeInquiryModal();
  }
});

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
