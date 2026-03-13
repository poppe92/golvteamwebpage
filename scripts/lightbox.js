/**
 * lightbox.js — Vanilla JS image lightbox, no dependencies.
 *
 * Usage in HTML:
 *   <a href="images/photo.jpg" data-lightbox="gallery-name" data-title="Caption text">
 *     <img src="images/photo.jpg" />
 *   </a>
 *
 * - Group multiple images into a gallery by giving them the same data-lightbox value.
 * - data-title is optional; it becomes the caption shown above the image.
 * - Keyboard: left/right arrows navigate, Escape closes.
 * - Clicking the dark backdrop also closes.
 *
 * Sizing is handled entirely by CSS (.lb-content max-width/max-height + object-fit),
 * so this script never manually calculates pixel dimensions.
 */

(() => {
  "use strict";

  const body = document.body;

  // Selector that identifies lightbox trigger links in the page.
  const linkSelector = "a[data-lightbox]";

  // galleryMap groups all trigger links by their data-lightbox value.
  // Structure: Map<groupName, Array<{ href, title, link }>>
  const galleryMap = new Map();

  const links = Array.from(document.querySelectorAll(linkSelector));
  if (links.length === 0) {
    // No lightbox links on this page — nothing to do.
    return;
  }

  // Build the gallery map from all matching links found at page load.
  links.forEach((link) => {
    const group = link.getAttribute("data-lightbox") || "default";
    const title = link.getAttribute("data-title") || "";
    const href = link.getAttribute("href");

    if (!href) {
      return;
    }

    if (!galleryMap.has(group)) {
      galleryMap.set(group, []);
    }

    galleryMap.get(group).push({ href, title, link });
  });

  // --- State ---
  // Tracks which gallery group and index are currently displayed.
  let currentGroup = null;
  let currentIndex = 0;

  // --- DOM references ---
  // These are created once in buildOverlay() and reused for every open/close cycle.
  let overlay = null;   // Dark semi-transparent backdrop
  let lightbox = null;  // Centered dialog wrapper
  let imageEl = null;   // The <img> being displayed
  let captionEl = null; // Text description (data-title)
  let numberEl = null;  // "image X of Y" counter
  let loaderEl = null;  // Spinner shown while the image loads
  let prevEl = null;    // Previous-image button (fixed left-centre of viewport)
  let nextEl = null;    // Next-image button (fixed right-centre of viewport)
  let closeEl = null;   // Close button (fixed top-right of viewport)

  /**
   * buildOverlay — creates the lightbox DOM and appends it to <body>.
   * Called lazily on first open so we don't add DOM nodes unnecessarily.
   * Safe to call multiple times — returns immediately if already built.
   *
 * DOM structure produced:
 *
 *   .lightboxOverlay          — fixed full-viewport dark backdrop
 *   .lightbox                 — fixed full-viewport flex centering wrapper
 *     .lb-content             — column flex: caption bar stacked above image
 *       .lb-dataContainer     — caption bar
 *         .lb-data
 *           .lb-details
 *             .lb-caption     — description text
 *             .lb-number      — "image X of Y"
 *       .lb-outerContainer    — image frame
 *         .lb-container
 *           .lb-image         — the <img>
 *           .lb-loader        — spinner overlay (shown during load)
 *     .lb-close               — close button (fixed top-right of viewport)
 *     .lb-prev                — prev arrow (fixed left-centre of viewport)
 *     .lb-next                — next arrow (fixed right-centre of viewport)
   */
  const buildOverlay = () => {
    if (overlay) {
      return;
    }

    // Backdrop — clicking it closes the lightbox.
    overlay = document.createElement("div");
    overlay.className = "lightboxOverlay";

    // Outer dialog wrapper — centered with flexbox in CSS.
    lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("role", "dialog");
    lightbox.setAttribute("aria-modal", "true");

    // Inner column: caption bar on top, image below.
    const content = document.createElement("div");
    content.className = "lb-content";

    // --- Caption bar ---
    const dataContainer = document.createElement("div");
    dataContainer.className = "lb-dataContainer";

    const data = document.createElement("div");
    data.className = "lb-data";

    const details = document.createElement("div");
    details.className = "lb-details";

    captionEl = document.createElement("span");
    captionEl.className = "lb-caption";

    numberEl = document.createElement("span");
    numberEl.className = "lb-number";

    details.appendChild(captionEl);
    details.appendChild(numberEl);

    data.appendChild(details);
    dataContainer.appendChild(data);

    // --- Image container ---
    const outer = document.createElement("div");
    outer.className = "lb-outerContainer";

    const container = document.createElement("div");
    container.className = "lb-container";

    imageEl = document.createElement("img");
    imageEl.className = "lb-image";
    imageEl.alt = "";
    imageEl.style.display = "none"; // Hidden until fully loaded

    // Spinner shown while the next image is fetching.
    loaderEl = document.createElement("div");
    loaderEl.className = "lb-loader";
    const cancel = document.createElement("a");
    cancel.className = "lb-cancel";
    cancel.setAttribute("href", "#");
    loaderEl.appendChild(cancel);

    container.appendChild(imageEl);
    container.appendChild(loaderEl);
    outer.appendChild(container);

    // Assemble: caption bar → image
    content.appendChild(dataContainer);
    content.appendChild(outer);
    lightbox.appendChild(content);

    // --- Viewport-fixed controls (siblings of .lb-content inside .lightbox) ---

    closeEl = document.createElement("a");
    closeEl.className = "lb-close";
    closeEl.setAttribute("href", "#");
    closeEl.setAttribute("aria-label", "Close");

    prevEl = document.createElement("a");
    prevEl.className = "lb-prev";
    prevEl.setAttribute("href", "#");
    prevEl.setAttribute("aria-label", "Previous image");

    nextEl = document.createElement("a");
    nextEl.className = "lb-next";
    nextEl.setAttribute("href", "#");
    nextEl.setAttribute("aria-label", "Next image");

    lightbox.appendChild(closeEl);
    lightbox.appendChild(prevEl);
    lightbox.appendChild(nextEl);

    document.body.appendChild(overlay);
    document.body.appendChild(lightbox);

    // --- Event listeners ---
    overlay.addEventListener("click", (e) => { e.preventDefault(); close(); });
    closeEl.addEventListener("click", (e) => { e.preventDefault(); close(); });
    prevEl.addEventListener("click", (e) => { e.preventDefault(); changeImage(-1); });
    nextEl.addEventListener("click", (e) => { e.preventDefault(); changeImage(1); });

    // Keyboard navigation: arrows to move, Escape to close.
    document.addEventListener("keydown", (e) => {
      if (!isOpen()) return;
      if (e.key === "Escape")        close();
      else if (e.key === "ArrowLeft")  changeImage(-1);
      else if (e.key === "ArrowRight") changeImage(1);
    });
  };

  /** Returns true when the lightbox is currently visible. */
  const isOpen = () => overlay && overlay.style.display !== "none";

  /**
   * open — shows the lightbox for the given group at the given index.
   * @param {string} group - The data-lightbox group name.
   * @param {number} index - Zero-based index within the group.
   */
  const open = (group, index) => {
    buildOverlay();
    currentGroup = group;
    currentIndex = index;
    overlay.style.display = "block";
    lightbox.classList.add("lb-open"); // CSS switches display:none → display:flex
    body.classList.add("lb-disable-scrolling");
    showImage();
  };

  /** close — hides the lightbox and restores page scrolling. */
  const close = () => {
    if (!overlay) return;
    overlay.style.display = "none";
    lightbox.classList.remove("lb-open");
    body.classList.remove("lb-disable-scrolling");
  };

  /**
   * changeImage — moves to the next or previous image within the current group.
   * Wraps around at the ends.
   * @param {number} direction - +1 for next, -1 for previous.
   */
  const changeImage = (direction) => {
    if (!currentGroup) return;
    const items = galleryMap.get(currentGroup) || [];
    if (!items.length) return;
    // Modulo wrapping handles both directions cleanly.
    currentIndex = (currentIndex + direction + items.length) % items.length;
    showImage();
  };

  /**
   * showImage — loads the current item's image and updates caption/counter.
   * Uses a temporary Image object to preload so the spinner shows during fetch.
   */
  const showImage = () => {
    const items = galleryMap.get(currentGroup) || [];
    const item = items[currentIndex];
    if (!item) return;

    // Show spinner, hide previous image while new one loads.
    imageEl.style.display = "none";
    loaderEl.style.display = "flex";

    const img = new Image();

    img.onload = () => {
      imageEl.src = item.href;
      imageEl.alt = item.title || "";

      // Update caption and "image X of Y" counter.
      captionEl.textContent = item.title || "";
      numberEl.textContent = items.length > 1
        ? `image ${currentIndex + 1} of ${items.length}`
        : "";

      loaderEl.style.display = "none";
      imageEl.style.display = "block";

      updateNavigation(items.length);
      preloadNeighbors(items); // Start fetching adjacent images in the background.
    };

    img.onerror = () => {
      loaderEl.style.display = "none";
      imageEl.style.display = "block";
      captionEl.textContent = "Could not load image";
      numberEl.textContent = "";
    };

    img.src = item.href;
  };

  /**
   * updateNavigation — shows or hides prev/next arrows.
   * Arrows are hidden when there is only one image in the group.
   * @param {number} length - Number of images in the current group.
   */
  const updateNavigation = (length) => {
    const show = length > 1 ? "block" : "none";
    prevEl.style.display = show;
    nextEl.style.display = show;
  };

  /**
   * preloadNeighbors — fetches the next and previous images in the background
   * so navigation feels instant when the user clicks prev/next.
   * @param {Array} items - The current group's image list.
   */
  const preloadNeighbors = (items) => {
    if (items.length <= 1) return;
    const nextIdx = (currentIndex + 1) % items.length;
    const prevIdx = (currentIndex - 1 + items.length) % items.length;
    [nextIdx, prevIdx].forEach((idx) => {
      const pre = new Image();
      pre.src = items[idx].href;
    });
  };

  /**
   * Delegated click handler — listens on the whole document so it works even
   * if gallery links are added dynamically after page load.
   */
  document.addEventListener("click", (event) => {
    const target = event.target.closest(linkSelector);
    if (!target) return;
    event.preventDefault();
    const group = target.getAttribute("data-lightbox") || "default";
    const items = galleryMap.get(group) || [];
    const index = items.findIndex((item) => item.link === target);
    open(group, index === -1 ? 0 : index);
  });
})();
