import { animate, scroll, inView, stagger } from "https://cdn.jsdelivr.net/npm/motion@14.4.0/+esm";

// ─── Reduced motion ────────────────────────────────────────────────────────────
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ─── 1. Progress bar ───────────────────────────────────────────────────────────
// scroll() links the animation to the native ScrollTimeline where supported
if (!reduceMotion) {
  scroll(animate(".sp", { scaleX: [0, 1] }, { ease: "linear" }));
}

// ─── 2. Nav + breadcrumb border (class toggles, not animated) ─────────────────
const navEl = document.getElementById("nav");
const bcEl  = document.getElementById("breadcrumb");
window.addEventListener("scroll", () => {
  const on = window.scrollY > 40;
  navEl?.classList.toggle("on", on);
  bcEl?.classList.toggle("on", on);
}, { passive: true });

// ─── 3. Reveal on scroll (.rv) ────────────────────────────────────────────────
document.querySelectorAll(".rv").forEach(el => {
  let stop;
  stop = inView(el, () => {
    if (!reduceMotion) {
      animate(el, { opacity: [0, 1], y: [24, 0] }, { duration: 0.8, ease: [0.22, 1, 0.36, 1] });
    } else {
      el.style.opacity = "1";
      el.style.transform = "none";
    }
    stop?.();
  }, { margin: "0px 0px -40px 0px" });
});

// Children of .rv2 stagger in (e.g. meta-strip .mi items)
document.querySelectorAll(".rv2").forEach(el => {
  const kids = Array.from(el.children);
  let stop;
  stop = inView(el, () => {
    if (!reduceMotion) {
      animate(kids, { opacity: [0, 1], y: [18, 0] }, {
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay: stagger(0.06),
      });
    } else {
      kids.forEach(c => { c.style.opacity = "1"; c.style.transform = "none"; });
    }
    stop?.();
  }, { margin: "0px 0px -40px 0px" });
});

// ─── 4. Count-up ──────────────────────────────────────────────────────────────
document.querySelectorAll(".count-num[data-count]").forEach(el => {
  const target = parseInt(el.dataset.count, 10);
  let stop;
  stop = inView(el, () => {
    if (reduceMotion) {
      el.textContent = target;
    } else {
      animate(0, target, {
        duration: 1.2,
        ease: [0, 0.55, 0.45, 1],
        onUpdate: v => { el.textContent = Math.round(v); },
      });
    }
    stop?.();
  }, { amount: 0.5 });
});

// ─── 5. Root cause: travelling hotspot ────────────────────────────────────────
// Each .cs-cause-ol li carries data-hotspot="left%,top%,width%,height%"
// A single outline element is animated over the sticky screenshot.
// Mobile (≤900px): outline is hidden; numbered list is shown as-is.
const outline    = document.getElementById("rcOutline");
const outlineNum = document.getElementById("rcOutlineNum");

if (outline) {
  const isMobile = () => window.innerWidth <= 900;

  // ?debug=hotspots — click the screenshot to log coordinates you can paste into data-hotspot
  if (location.search.includes("debug=hotspots")) {
    const wrap = document.querySelector(".rc-screenshot-wrap");
    if (wrap) {
      wrap.style.cursor = "crosshair";
      wrap.addEventListener("click", e => {
        const r = wrap.getBoundingClientRect();
        const x = ((e.clientX - r.left) / r.width  * 100).toFixed(1);
        const y = ((e.clientY - r.top)  / r.height * 100).toFixed(1);
        console.log(`Hotspot click — x:${x}% y:${y}%`);
        console.log(`Suggested data-hotspot="${x},${y},20,20"`);
      });
    }
  }

  let outlineShown = false;

  document.querySelectorAll(".cs-cause-ol li[data-hotspot]").forEach((cause, i) => {
    inView(cause, () => {
      if (isMobile()) return;

      const [lv, tv, wv, hv] = cause.dataset.hotspot.split(",").map(n => n.trim() + "%");
      if (outlineNum) outlineNum.textContent = `0${i + 1}`;

      if (reduceMotion) {
        Object.assign(outline.style, { left: lv, top: tv, width: wv, height: hv, opacity: "1" });
        return;
      }

      if (!outlineShown) {
        // First activation: snap to position, then fade in
        Object.assign(outline.style, { left: lv, top: tv, width: wv, height: hv });
        animate(outline, { opacity: [0, 1] }, { duration: 0.3 });
        outlineShown = true;
      } else {
        // Travel to new hotspot with a spring
        animate(outline, { left: lv, top: tv, width: wv, height: hv }, {
          type: "spring",
          visualDuration: 0.5,
          bounce: 0.15,
        });
      }
    }, { amount: 0.6 });
  });
}

// ─── 6. Nav reorganization demo (FLIP) ────────────────────────────────────────
// Illustrates the redesign decision: flat object-model nav → intent-grouped nav.
// animateLayout cannot handle cross-container moves, so FLIP is done manually:
//   1. Snapshot positions before DOM change
//   2. Rebuild DOM into new structure
//   3. Measure new positions; apply inverse (delta) transforms
//   4. Animate each item from its delta to 0 using a spring with stagger

const NAV_BEFORE = [
  "Dashboard", "System Users", "Groups", "Resources",
  "Certificates", "Policies", "JIT Access", "Session Recordings",
  "Discovery", "RBAC", "Reports", "Audit Logs",
  "Integrations", "Settings",
];

const NAV_AFTER = [
  { group: "Overview",        items: ["Dashboard"] },
  { group: "Setup",           items: ["Resources", "Discovery", "System Users", "Certificates"] },
  { group: "Access Control",  items: ["Policies", "RBAC", "JIT Access", "Groups"] },
  { group: "Security Ops",    items: ["Session Recordings", "Audit Logs", "Reports"] },
  { group: "Identity Config", items: ["Integrations", "Settings"] },
];

const rail      = document.getElementById("navDemoRail");
const demoToggle = document.getElementById("navDemoToggle");
const demoLabel  = document.getElementById("navDemoLabel");

if (rail && demoToggle) {
  let isAfter = false;

  function buildFlat() {
    rail.innerHTML = "";
    NAV_BEFORE.forEach((name, i) => {
      const el = document.createElement("div");
      el.className = "nav-demo-item" + (i === 0 ? " active" : "");
      el.dataset.navId = name;
      el.setAttribute("role", "listitem");
      el.textContent = name;
      rail.appendChild(el);
    });
  }

  function buildGrouped() {
    rail.innerHTML = "";
    NAV_AFTER.forEach(({ group, items }) => {
      const gl = document.createElement("div");
      gl.className = "nav-demo-group-label";
      gl.setAttribute("aria-hidden", "true");
      gl.textContent = group;
      rail.appendChild(gl);
      items.forEach(name => {
        const el = document.createElement("div");
        el.className = "nav-demo-item sub" + (name === "Dashboard" ? " active" : "");
        el.dataset.navId = name;
        el.setAttribute("role", "listitem");
        el.textContent = name;
        rail.appendChild(el);
      });
    });
  }

  buildFlat();

  demoToggle.addEventListener("click", () => {
    // Step 1: snapshot item positions before DOM change
    const snapBefore = {};
    rail.querySelectorAll(".nav-demo-item").forEach(el => {
      snapBefore[el.dataset.navId] = el.getBoundingClientRect();
    });

    // Step 2: rebuild DOM
    if (isAfter) {
      buildFlat();
    } else {
      buildGrouped();
      if (!reduceMotion) {
        animate(
          rail.querySelectorAll(".nav-demo-group-label"),
          { opacity: [0, 1] },
          { duration: 0.3, delay: stagger(0.07) }
        );
      }
    }

    // Step 3 + 4: FLIP each item
    rail.querySelectorAll(".nav-demo-item").forEach((el, idx) => {
      const before = snapBefore[el.dataset.navId];
      if (!before || reduceMotion) return;
      const after = el.getBoundingClientRect();
      const dy = before.top - after.top;
      if (Math.abs(dy) < 1) return;
      animate(el, { y: [dy, 0] }, {
        type: "spring",
        visualDuration: 0.4,
        bounce: 0.1,
        delay: idx * 0.03,
      });
    });

    isAfter = !isAfter;
    demoLabel.textContent = isAfter ? "After: organized by intent" : "Before: organized by object";
    demoToggle.textContent = isAfter ? "← Reset" : "Reorganize →";
  });
}

// ─── 7. Section nav active state ──────────────────────────────────────────────
// Uses IntersectionObserver directly (inView suits single-trigger reveals;
// active-state tracking needs to fire on both enter and leave)
const csNavLinks = Array.from(document.querySelectorAll(".cs-section-nav a"));
const csSections = csNavLinks.map(link => {
  const id = link.getAttribute("href").replace("#", "");
  const el = document.getElementById(id);

  link.addEventListener("click", e => {
    e.preventDefault();
    if (!el) return;
    el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
  });

  return { el, link };
}).filter(s => s.el);

const sectionIO = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      csSections.forEach(s => s.link.classList.toggle("active", s.el === entry.target));
    }
  });
}, { threshold: 0.2, rootMargin: "-10% 0px -60% 0px" });

csSections.forEach(({ el }) => sectionIO.observe(el));

// ─── 8. Before/After slider ───────────────────────────────────────────────────
// Not scroll-driven; kept as vanilla pointer events
const baSlider = document.getElementById("baSlider");
if (baSlider) {
  const baAfter  = document.getElementById("baAfter");
  const baHandle = document.getElementById("baHandle");
  let dragging = false;

  function setSliderPos(clientX) {
    const rect = baSlider.getBoundingClientRect();
    const pct  = Math.max(5, Math.min(95, (clientX - rect.left) / rect.width * 100));
    baAfter.style.width = pct + "%";
    baHandle.style.left = pct + "%";
  }

  baSlider.addEventListener("mousedown",  e => { dragging = true; setSliderPos(e.clientX); e.preventDefault(); });
  window.addEventListener("mousemove",    e => { if (dragging) setSliderPos(e.clientX); });
  window.addEventListener("mouseup",      () => { dragging = false; });
  baSlider.addEventListener("touchstart", e => { dragging = true; setSliderPos(e.touches[0].clientX); }, { passive: true });
  window.addEventListener("touchmove",    e => { if (dragging) setSliderPos(e.touches[0].clientX); }, { passive: true });
  window.addEventListener("touchend",     () => { dragging = false; });
}
