(() => {
  "use strict";

  const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const bootScreen = document.getElementById("boot-screen");
  const bootLog = document.getElementById("boot-log");
  const bootProgress = document.getElementById("boot-progress");
  const bootState = document.getElementById("boot-state");
  const skipBoot = document.getElementById("skip-boot");

  const bootLines = [
    "INITIALIZING IB AFRIDI SYSTEM...",
    "Loading identity...",
    "Loading projects...",
    "Loading security arsenal...",
    "Connecting to GitHub...",
    "Loading network visualization...",
    "SYSTEM ONLINE",
    "ACCESS GRANTED"
  ];

  let bootTimers = [];
  let bootFinished = false;

  function finishBoot() {
    if (bootFinished) return;
    bootFinished = true;
    bootTimers.forEach(window.clearTimeout);
    bootTimers = [];
    if (bootScreen) {
      bootScreen.classList.add("is-hidden");
      bootScreen.setAttribute("aria-hidden", "true");
      bootScreen.inert = true;
    }
    startNetworkAnimation();
  }

  function runBootSequence() {
    if (!bootScreen || !bootLog) {
      finishBoot();
      return;
    }

    function typeLine(index) {
      if (bootFinished) return;
      if (index >= bootLines.length) return;

      const line = bootLines[index];
      const row = document.createElement("div");
      row.className = "boot-log-line is-typing";
      const typedText = document.createElement("span");
      row.append(typedText);
      bootLog.append(row);
      let character = 0;

      function typeNextCharacter() {
        if (bootFinished) return;
        character += 1;
        typedText.textContent = line.slice(0, character);
        if (character < line.length) {
          bootTimers.push(window.setTimeout(typeNextCharacter, prefersReducedMotion ? 0 : 7));
          return;
        }

        row.classList.remove("is-typing");
        if (index === bootLines.length - 2) row.classList.add("is-complete");
        if (index === bootLines.length - 1) row.classList.add("is-access");
        if (bootProgress) bootProgress.style.width = `${((index + 1) / bootLines.length) * 100}%`;
        if (bootState) bootState.textContent = index === bootLines.length - 1 ? "ACCESS GRANTED" : "VERIFYING COMPONENTS";

        if (index === bootLines.length - 1) {
          bootTimers.push(window.setTimeout(finishBoot, prefersReducedMotion ? 120 : 380));
        } else {
          bootTimers.push(window.setTimeout(() => typeLine(index + 1), prefersReducedMotion ? 25 : 85));
        }
      }

      typeNextCharacter();
    }

    bootTimers.push(window.setTimeout(() => typeLine(0), prefersReducedMotion ? 25 : 260));
  }

  if (skipBoot) skipBoot.addEventListener("click", finishBoot);
  runBootSequence();

  // The lightweight network canvas uses a small hand-authored 3D graph; no WebGL or external library is required.
  const networkCanvas = document.getElementById("network-canvas");
  const networkStage = document.getElementById("network-stage");
  const networkContext = networkCanvas ? networkCanvas.getContext("2d", { alpha: true }) : null;
  let networkFrame = 0;
  let networkLastDraw = 0;
  let networkWidth = 0;
  let networkHeight = 0;
  let networkPixelRatio = 1;
  let networkStarted = false;
  let pointerX = 0;
  let pointerY = 0;
  let manualRotationX = 0;
  let manualRotationY = 0;
  let dragPoint = null;

  const networkNodes = [
    { id: "core", x: 0, y: 0, z: 0, core: true },
    { id: "python", x: -.15, y: .72, z: .45 },
    { id: "linux", x: -.79, y: .23, z: .13 },
    { id: "web", x: .76, y: .41, z: .22 },
    { id: "network", x: -.72, y: -.46, z: .39 },
    { id: "three", x: -.03, y: -.79, z: -.05 },
    { id: "javascript", x: .78, y: -.35, z: .34 },
    { id: "github", x: .1, y: .18, z: -.82 }
  ];
  const networkEdges = [
    [0, 1], [0, 2], [0, 3], [0, 4], [0, 5], [0, 6], [0, 7],
    [1, 2], [1, 3], [1, 7], [2, 4], [2, 7], [3, 6], [3, 7],
    [4, 5], [4, 7], [5, 6], [5, 7], [6, 7]
  ];

  function resizeNetwork() {
    if (!networkCanvas || !networkContext) return;
    const rect = networkCanvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    networkWidth = rect.width;
    networkHeight = rect.height;
    networkPixelRatio = Math.min(window.devicePixelRatio || 1, 1.6);
    networkCanvas.width = Math.round(networkWidth * networkPixelRatio);
    networkCanvas.height = Math.round(networkHeight * networkPixelRatio);
    networkContext.setTransform(networkPixelRatio, 0, 0, networkPixelRatio, 0, 0);
    drawNetwork(0);
  }

  function drawNetwork(time) {
    if (!networkContext || !networkWidth || !networkHeight) return;
    const ctx = networkContext;
    const w = networkWidth;
    const h = networkHeight;
    const cx = w * .5;
    const cy = h * .51;
    const radius = Math.min(w, h) * (w < 400 ? .31 : .34);
    const drift = prefersReducedMotion ? 0 : time;
    const rotationY = drift * .00011 + pointerX * .2 + manualRotationY;
    const rotationX = Math.sin(drift * .00018) * .06 + pointerY * .11 + manualRotationX;
    const sinY = Math.sin(rotationY);
    const cosY = Math.cos(rotationY);
    const sinX = Math.sin(rotationX);
    const cosX = Math.cos(rotationX);

    ctx.clearRect(0, 0, w, h);

    // Low-contrast orbit guides keep the visualization technical without competing with its content.
    ctx.save();
    ctx.translate(cx, cy);
    ctx.strokeStyle = "rgba(139, 220, 160, .10)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.1, radius * .46, -.26, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "rgba(119, 216, 204, .075)";
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * .54, radius * 1.08, .44, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    const projected = networkNodes.map((node) => {
      const x1 = node.x * cosY - node.z * sinY;
      const z1 = node.x * sinY + node.z * cosY;
      const y1 = node.y * cosX - z1 * sinX;
      const z2 = node.y * sinX + z1 * cosX;
      const perspective = 1 / (1.9 - z2 * .31);
      return {
        x: cx + x1 * radius * perspective,
        y: cy + y1 * radius * perspective,
        z: z2,
        scale: perspective,
        core: node.core
      };
    });

    const compactMode = w < 410;
    const edgesToDraw = compactMode ? networkEdges.slice(0, 11) : networkEdges;
    edgesToDraw.forEach(([from, to], index) => {
      const a = projected[from];
      const b = projected[to];
      const depth = Math.max(0, Math.min(1, (a.z + b.z + 2) / 4));
      const alpha = .11 + depth * .31;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = index % 5 === 2
        ? `rgba(119, 216, 204, ${alpha * .8})`
        : `rgba(120, 220, 148, ${alpha})`;
      ctx.lineWidth = .7 + depth * .45;
      ctx.stroke();

      if (!prefersReducedMotion && !compactMode && depth > .34) {
        const phase = (time * .00012 + index * .173) % 1;
        const pulseX = a.x + (b.x - a.x) * phase;
        const pulseY = a.y + (b.y - a.y) * phase;
        ctx.beginPath();
        ctx.arc(pulseX, pulseY, 1.35, 0, Math.PI * 2);
        ctx.fillStyle = index % 4 === 0 ? "rgba(119, 216, 204, .82)" : "rgba(166, 255, 190, .76)";
        ctx.fill();
      }
    });

    projected
      .map((node, index) => ({ ...node, index }))
      .sort((a, b) => a.z - b.z)
      .forEach((node) => {
        const depth = Math.max(.38, Math.min(1, .66 + node.z * .23));
        if (node.core) {
          ctx.beginPath();
          ctx.arc(node.x, node.y, 27, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(146, 245, 176, .24)";
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(node.x, node.y, 19, 0, Math.PI * 2);
          ctx.strokeStyle = "rgba(119, 216, 204, .13)";
          ctx.stroke();
          return;
        }
        const dotRadius = 2.5 + Math.max(0, node.z) * 1.45;
        ctx.beginPath();
        ctx.arc(node.x, node.y, dotRadius + 4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(112, 233, 151, ${.035 * depth})`;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, dotRadius, 0, Math.PI * 2);
        ctx.shadowBlur = node.z > -.4 ? 9 : 4;
        ctx.shadowColor = node.index % 3 === 0 ? "#76d8cb" : "#97f1b1";
        ctx.fillStyle = node.index % 3 === 0 ? `rgba(119, 216, 204, ${depth})` : `rgba(154, 242, 181, ${depth})`;
        ctx.fill();
        ctx.shadowBlur = 0;
      });
  }

  function animateNetwork(time) {
    if (!networkStarted || document.hidden) return;
    const targetFrameGap = networkWidth < 410 ? 64 : 38;
    if (!networkLastDraw || time - networkLastDraw > targetFrameGap) {
      networkLastDraw = time;
      drawNetwork(time);
    }
    if (!prefersReducedMotion) networkFrame = window.requestAnimationFrame(animateNetwork);
  }

  function startNetworkAnimation() {
    if (!networkCanvas || !networkContext || networkStarted) return;
    networkStarted = true;
    resizeNetwork();
    if (prefersReducedMotion) {
      drawNetwork(0);
      return;
    }
    networkFrame = window.requestAnimationFrame(animateNetwork);
  }

  if (networkCanvas && networkContext) {
    resizeNetwork();
    if ("ResizeObserver" in window) {
      const resizeObserver = new ResizeObserver(resizeNetwork);
      resizeObserver.observe(networkStage || networkCanvas);
    } else {
      window.addEventListener("resize", resizeNetwork, { passive: true });
    }

    networkCanvas.addEventListener("pointermove", (event) => {
      const rect = networkCanvas.getBoundingClientRect();
      if (dragPoint) {
        const dx = event.clientX - dragPoint.x;
        const dy = event.clientY - dragPoint.y;
        manualRotationY += dx * .004;
        manualRotationX += dy * .003;
        dragPoint = { x: event.clientX, y: event.clientY };
      } else {
        pointerX = ((event.clientX - rect.left) / rect.width - .5) * 2;
        pointerY = ((event.clientY - rect.top) / rect.height - .5) * 2;
      }
      if (prefersReducedMotion) drawNetwork(0);
    });
    networkCanvas.addEventListener("pointerdown", (event) => {
      dragPoint = { x: event.clientX, y: event.clientY };
      if (networkCanvas.setPointerCapture) networkCanvas.setPointerCapture(event.pointerId);
    });
    networkCanvas.addEventListener("pointerup", () => { dragPoint = null; });
    networkCanvas.addEventListener("pointercancel", () => { dragPoint = null; });
    networkCanvas.addEventListener("pointerleave", () => {
      if (!dragPoint) {
        pointerX = 0;
        pointerY = 0;
        if (prefersReducedMotion) drawNetwork(0);
      }
    });
  }

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (networkFrame) window.cancelAnimationFrame(networkFrame);
      networkFrame = 0;
      return;
    }
    if (networkStarted && !prefersReducedMotion && !networkFrame) {
      networkFrame = window.requestAnimationFrame(animateNetwork);
    }
  });

  // Progressive section reveals and the compact active section index.
  const revealSections = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !prefersReducedMotion) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: .08, rootMargin: "0px 0px -35px 0px" });
    revealSections.forEach((section) => revealObserver.observe(section));
  } else {
    revealSections.forEach((section) => section.classList.add("is-revealed"));
  }

  const railLinks = [...document.querySelectorAll(".rail-link")];
  const observedSections = railLinks
    .map((link) => document.querySelector(link.getAttribute("href")))
    .filter(Boolean);
  if ("IntersectionObserver" in window && observedSections.length) {
    const activeObserver = new IntersectionObserver((entries) => {
      const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible) return;
      railLinks.forEach((link) => {
        const isActive = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("is-active", isActive);
        if (isActive) link.setAttribute("aria-current", "location");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-20% 0px -65% 0px", threshold: [0, .1, .25, .5] });
    observedSections.forEach((section) => activeObserver.observe(section));
  }

  // Accessible, keyboard-operable arsenal tabs.
  const arsenalTabs = [...document.querySelectorAll(".arsenal-tab")];
  function selectArsenalTab(tab, moveFocus = false) {
    arsenalTabs.forEach((candidate) => {
      const selected = candidate === tab;
      candidate.classList.toggle("is-selected", selected);
      candidate.setAttribute("aria-selected", String(selected));
      candidate.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(candidate.getAttribute("aria-controls"));
      if (panel) {
        panel.hidden = !selected;
        panel.classList.toggle("is-visible", selected);
      }
    });
    if (moveFocus) tab.focus();
  }
  arsenalTabs.forEach((tab, index) => {
    tab.addEventListener("click", () => selectArsenalTab(tab));
    tab.addEventListener("keydown", (event) => {
      let nextIndex = index;
      if (event.key === "ArrowRight" || event.key === "ArrowDown") nextIndex = (index + 1) % arsenalTabs.length;
      else if (event.key === "ArrowLeft" || event.key === "ArrowUp") nextIndex = (index - 1 + arsenalTabs.length) % arsenalTabs.length;
      else if (event.key === "Home") nextIndex = 0;
      else if (event.key === "End") nextIndex = arsenalTabs.length - 1;
      else return;
      event.preventDefault();
      selectArsenalTab(arsenalTabs[nextIndex], true);
    });
  });

  // A deliberately limited portfolio command interface. Input is never executed by the operating system.
  const terminalForm = document.getElementById("terminal-form");
  const terminalInput = document.getElementById("terminal-command");
  const terminalOutput = document.getElementById("terminal-output");
  const terminalCommands = {
    help: "Available commands:\n\nabout       About IB Afridi\nprojects    Explore projects\nskills      Technical arsenal\ngithub      GitHub profile\ncontact     Contact information\nclear       Clear terminal",
    about: "IB AFRIDI\nCybersecurity enthusiast and web developer building Python-based security tools, web applications, 3D projects, and hybrid Android applications.",
    projects: "Eight projects are documented in the project index. Opening the project list…",
    skills: "Programming: Python (Intermediate), JavaScript (Beginner), C++ (Basic), HTML5 / CSS3 (Intermediate), Bash / Linux CLI (Intermediate).\nCybersecurity tools: Nmap, Wireshark, Burp Suite, Hydra, Netcat, SQLmap, Kali Linux.\nWeb and other technologies: HTML5, CSS3, Bootstrap 5, Flexbox, CSS Grid, Three.js, Node.js, Express, Git, GitHub, Netlify, Capacitor, VS Code, Chrome DevTools.",
    github: "GitHub profile: github.com/afridi017\nLive API data is not connected; repository counts and contribution statistics are not shown.",
    contact: "Email: ib.afridi.cs@gmail.com\nPhone: +92 333 2149829\nLinkedIn: linkedin.com/in/ishaqafridi017\nOpening contact channels…",
    "sudo ib-afridi": "ACCESS LEVEL: DEVELOPER\nSECURITY LAB MODE ENABLED",
    whoami: "IB AFRIDI\nCybersecurity Enthusiast\nWeb Developer\nPython Tool Developer",
    neofetch: "       /\\       IB AFRIDI\n      /  \\      PERSONAL COMMAND CENTER\n     /____\\     -----------------------\n                  ROLE     Security · Web · Python\n                  PURPOSE  Build & learn responsibly\n                  STACK    HTML · CSS · JavaScript\n                  MODE     Ethical research\n                  STATUS   SYSTEM ONLINE"
  };
  const destinationForCommand = {
    about: "identity",
    projects: "projects",
    skills: "arsenal",
    github: "github",
    contact: "contact"
  };

  function appendTerminalEcho(command) {
    const row = document.createElement("div");
    row.className = "terminal-command-line";
    const prompt = document.createElement("span");
    prompt.className = "terminal-prompt-text";
    prompt.textContent = "IB-AFRIDI@COMMAND_CENTER:~$";
    const value = document.createElement("span");
    value.className = "command-value";
    value.textContent = command;
    row.append(prompt, value);
    terminalOutput.append(row);
  }

  function appendTerminalResult(text, highlight = false) {
    const result = document.createElement("pre");
    result.className = `terminal-result${highlight ? " is-highlight" : ""}`;
    result.textContent = text;
    terminalOutput.append(result);
    terminalOutput.scrollTop = terminalOutput.scrollHeight;
  }

  function runTerminalCommand(rawCommand) {
    const command = rawCommand.trim().toLowerCase().replace(/\s+/g, " ");
    if (!command) return;
    if (command === "clear") {
      terminalOutput.replaceChildren();
      return;
    }

    appendTerminalEcho(rawCommand.trim());
    const response = terminalCommands[command];
    if (!response) {
      appendTerminalResult(`command not found: ${rawCommand.trim()}\nType help to see available portfolio commands.`);
      return;
    }

    const easterEgg = ["sudo ib-afridi", "whoami", "neofetch"].includes(command);
    appendTerminalResult(response, easterEgg);

    const targetId = destinationForCommand[command];
    if (targetId) {
      const target = document.getElementById(targetId);
      if (target) target.scrollIntoView({ behavior: prefersReducedMotion ? "auto" : "smooth", block: "start" });
    }
  }

  if (terminalForm && terminalInput && terminalOutput) {
    terminalForm.addEventListener("submit", (event) => {
      event.preventDefault();
      runTerminalCommand(terminalInput.value);
      terminalInput.value = "";
      terminalInput.focus();
    });
    document.querySelectorAll("[data-command]").forEach((button) => {
      button.addEventListener("click", () => {
        terminalInput.value = button.dataset.command || "";
        terminalForm.requestSubmit();
        terminalInput.focus();
      });
    });
  }

  // Scroll progress is updated once per frame instead of on every scroll event.
  const progressBar = document.getElementById("reading-progress-bar");
  let progressQueued = false;
  function updateProgress() {
    if (!progressBar || progressQueued) return;
    progressQueued = true;
    window.requestAnimationFrame(() => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
      progressBar.style.width = `${ratio * 100}%`;
      progressQueued = false;
    });
  }
  window.addEventListener("scroll", updateProgress, { passive: true });
  window.addEventListener("resize", updateProgress, { passive: true });
})();
