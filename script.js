/* ===========================
   DND Classes — script.js
   =========================== */

// ------- Data:class cards -------
const CLASS_CARDS = [
  { img: "Warrior.jpg",      alt: "Warrior",      name: "Warrior",
    desc: "Disciplined frontline fighter—balances offense and defense with shield, spear, or sword." },
  { img: "Mage.jpg",         alt: "Wizard",       name: "Wizard",
    desc: "Scholar of the arcane—prepares potent spells and bends the battlefield to their will." },
  { img: "Assassin.jpg",     alt: "Rogue",        name: "Rogue",
    desc: "Master of stealth and precision—disarms traps, picks locks, and strikes where it hurts." },
  { img: "Bard.jpg",         alt: "Bard",         name: "Bard",
    desc: "Charismatic virtuoso—bolsters allies, bewilders foes, and casts versatile support magic." },
  { img: "Necromancer.png",  alt: "Necromancer",  name: "Necromancer",
    desc: "Wields forbidden rites—raises undead servants and siphons life from the living." },
  { img: "Spellsword.png",   alt: "Spellsword",   name: "Spellsword",
    desc: "Blade and spell as one—enchants weapons and weaves magic between rapid strikes." },
  { img: "Ranger.png",       alt: "Ranger",       name: "Ranger",
    desc: "Tracker and archer—thrives in the wilds with traps, terrain tactics, and keen senses." },
  { img: "Barbarian.png",    alt: "Barbarian",    name: "Barbarian",
    desc: "Rage-fueled berserker—soaks up punishment and hits back with brutal force." },
  { img: "Beast-master.png", alt: "Beast Master", name: "Beast Master",
    desc: "Ranger bonded to a loyal companion—coordinates pack tactics and harrying attacks." },
  { img: "Artifiser.png",    alt: "Artificer",    name: "Artificer",
    desc: "Inventive mage-engineer—infuses gear and gadgets with magic, crafting clever solutions." },
];

// ------- Render cards into the rail -------
function renderCards() {
  const rail = document.getElementById("classRail");
  rail.innerHTML = CLASS_CARDS.map(c => `
    <div class="class-card" role="button" tabindex="0" aria-label="${c.name}. ${c.desc}">
      <img src="${c.img}" alt="${c.alt}">
      <div class="overlay">
        <h3>${c.name}</h3>
        <p>${c.desc}</p>
      </div>
    </div>
  `).join("");
}

// ------- Portal animation + transition -------
function setupPortal(startAutoScroll) {
  const openBtn = document.getElementById("openPortal");
  const overlay = document.getElementById("portalOverlay");
  const hero = document.getElementById("hero");
  const classesSection = document.getElementById("classes");

  openBtn.addEventListener("click", () => {
    overlay.classList.add("portal-open");
    setTimeout(() => {
      hero.style.display = "none";
      classesSection.style.display = "block";
      renderCards();
      setTimeout(() => {
        startAutoScroll();
        document.getElementById("classRail").focus();
      }, 50);
    }, 900); 
  });
}


function setupRailUX(rail) {
  const section = document.getElementById("classes");
  const GAP_PX = 16;           
  const FRICTION = 0.9;          
  const WHEEL_GAIN = 1.15;       
  const DRAG_GAIN  = 1.00;       
  const MIN_SPEED_FOR_SETTLE = 8; 
  const IDLE_AFTER_MS = 140;     
  const SETTLE_EASE_MS = 360;   
  let v = 0;                    
  let animId = null;           
  let lastInputTime = 0;        
  let dragging = false, startX = 0, startLeft = 0;
  let lastMoveTs = 0, lastMoveX = 0;
  const getStep = () => {
    const card = rail.querySelector(".class-card");
    return (card ? card.clientWidth : 300) + GAP_PX;
  };
  const clampScroll = () => {
    const max = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (rail.scrollLeft < 0) rail.scrollLeft = 0;
    if (rail.scrollLeft > max) rail.scrollLeft = max;
    return max;
  };
  function softSettle() {
    const step = getStep();
    const targetIndex = Math.round(rail.scrollLeft / step);
    const targetLeft = targetIndex * step;
    const startLeft = rail.scrollLeft;
    const dist = targetLeft - startLeft;
    if (Math.abs(dist) < 1) return;
    const t0 = performance.now();
    const dur = SETTLE_EASE_MS;
    const ease = x => 1 - Math.pow(1 - x, 3);
    function tick() {
      const t = performance.now();
      const p = Math.min(1, (t - t0) / dur);
      rail.scrollLeft = startLeft + dist * ease(p);
      if (p < 1) {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  }
  function frame() {
    const now = performance.now();
    if (!dragging) {
      rail.scrollLeft += v;
      v *= FRICTION;
      clampScroll();
    }
    const idle = (now - lastInputTime) > IDLE_AFTER_MS;
    if (!dragging && idle && Math.abs(v) < MIN_SPEED_FOR_SETTLE) {
      animId = null;
      v = 0;
      softSettle();
      return;
    }

    animId = requestAnimationFrame(frame);
  }
  function kick() {
    lastInputTime = performance.now();
    if (!animId) animId = requestAnimationFrame(frame);
  }
  const onWheel = (e) => {
    const horizontalIntent = Math.abs(e.deltaX) > Math.abs(e.deltaY);
    if (!horizontalIntent) {
      e.preventDefault();
      e.stopPropagation();
      v += (e.deltaY * WHEEL_GAIN) * 0.12; 
      kick();
    }
  };
  rail.addEventListener("wheel", onWheel, { passive: false });
  section.addEventListener("wheel", (e) => {
    const r = rail.getBoundingClientRect();
    const inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;
    if (inside) onWheel(e);
  }, { passive: false, capture: true });
  rail.addEventListener("keydown", (e) => {
    const step = getStep();
    if (e.key === "ArrowRight") {
      rail.scrollBy({ left: step, behavior: "smooth" });
      kick();
    }
    if (e.key === "ArrowLeft") {
      rail.scrollBy({ left: -step, behavior: "smooth" });
      kick();
    }
  });
  rail.addEventListener("pointerdown", (e) => {
    dragging = true;
    startX = lastMoveX = e.clientX;
    startLeft = rail.scrollLeft;
    lastMoveTs = performance.now();
    v = 0;
    rail.setPointerCapture(e.pointerId);
    rail.style.cursor = "grabbing";
    kick();
  });

  rail.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    const now = performance.now();
    const dx = e.clientX - startX;
    rail.scrollLeft = startLeft - dx * DRAG_GAIN;
    clampScroll();
    const dt = (now - lastMoveTs) || 16;
    const vx = (lastMoveX - e.clientX) / dt;
    v = vx * 12;
    lastMoveTs = now;
    lastMoveX = e.clientX;
  });

  const endDrag = () => {
    if (!dragging) return;
    dragging = false;
    rail.style.cursor = "";
    kick(); 
  };
  rail.addEventListener("pointerup", endDrag);
  rail.addEventListener("pointercancel", endDrag);
  kick();
}
function makeAutoScroller() {
  const rail = document.getElementById("classRail");
  setupRailUX(rail);
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (prefersReduced) return () => {}; 
  let rafId = null;
  let lastTime = null;
  let pausedUntil = 0;
  let direction = 1;              
  const SPEED = 20;              
  const PAUSE_MS = 4000;          
  const pause = () => { pausedUntil = performance.now() + PAUSE_MS; };
  ["pointerdown","wheel","touchstart","mouseenter","keydown"].forEach(evt =>
    rail.addEventListener(evt, pause, { passive: true })
  );

  const step = (ts) => {
    if (lastTime == null) lastTime = ts;
    const dt = (ts - lastTime) / 1000; 
    lastTime = ts;

    const maxScrollable = Math.max(0, rail.scrollWidth - rail.clientWidth);
    if (maxScrollable > 0 && performance.now() > pausedUntil) {
      rail.scrollLeft += direction * SPEED * dt;
      if (rail.scrollLeft <= 0) direction = 1;
      if (rail.scrollLeft >= maxScrollable - 1) direction = -1;
    }

    rafId = requestAnimationFrame(step);
  };

  return function start() {
    if (rafId) return; 
    requestAnimationFrame(step);
  };
}

document.addEventListener("DOMContentLoaded", () => {
  const startAutoScroll = makeAutoScroller();
  setupPortal(startAutoScroll);
});

document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = doccument.getElementById("loginScreen");
    const hero = document.getElementById("hero");

    const simulateLogin = (provider) => {
        localStorage.setItem("user", JSON.stringify({ provider, timestamp: Date.now() }));
        loginScreen.style.display = "none";
        hero.style.display = "block";
        document.querySelector(".classes-section").style.display = "block";
    };

    document.getElementById("googleLogin").addEventListener("click", () => simulateLogin("google"));
    document.getElementById("emailLogin").addEventListener("click", () => {
        new bootstrap.Modal(document.getElementById("emailModal")).show();
    });

    const user = JSON.parse(localStorage.getItem("user"));
    if (user) simulateLogin(user.provider);
})

/*
document.addEventListener("DOMContentLoaded", () => {
    const loginScreen = document.getElementById("loginScreen");
    const hero = document.getElementById("hero");
    const classesSection = document.getElementById(".classes-section");

    const showMainUi = () => {
        loginScreen.style.display = "none";
        hero.style.display = "block";
        classesSection.style.display = "block";
    };
    document.getElementById("googleLogin").addEventListener("click", () => {
        alert("Google login is clicked");
        showMainUi();
    });
    document.getElementById("emailLogin").addEventListener("click", () => {
        alert("Email login is clicked");
        showMainUi();
    });
});
*/

