const updateResult = document.getElementById("update-result");
const copyList = document.getElementById("copy-list");
const editList = document.getElementById("edit-list");
const messageForm = document.getElementById("message-form");
const formTitle = document.getElementById("form-title");
const formClose = document.getElementById("form-close");
const formSubmit = document.getElementById("form-submit");
const formDelete = document.getElementById("form-delete");
const titleInput = document.getElementById("new-message-title");
const bodyInput = document.getElementById("new-message-body");
const bulkDeleteBtn = document.getElementById("bulk-delete");
const bulkCount = document.getElementById("bulk-count");
const showFormBtn = document.getElementById("show-form");
const themeToggle = document.getElementById("theme-toggle");
const settingsToggle = document.querySelector(".settings-toggle");
const settingsPanel = document.querySelector(".settings-panel");
const settingsClose = document.getElementById("settings-close");
const scrim = document.querySelector(".scrim");
const installBtn = document.getElementById("install-btn");
const updateCheckBtn = document.getElementById("update-check");
const themeTrack = document.querySelector(".theme-track");
const themeHandle = themeTrack?.querySelector(".theme-handle");
const viewButtons = document.querySelectorAll(".switch-btn");
const panels = document.querySelectorAll("[data-view]");
const jsonStatus = document.getElementById("json-status");

const messagesState = {
  items: [],
};

const STORAGE_KEY = "mensajes";
const APP_VERSION = "1.0.0";
const RELEASE_CHECK_URL = "https://api.github.com/repos/tomas-medel/A-msg/releases/latest";

let editingId = null;
const selectedIds = new Set();
let installPromptEvent = null;
let isReloadPending = false;

function reloadPage() {
  if (isReloadPending) return;
  isReloadPending = true;
  window.location.reload();
}

function loadMessagesFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch (error) {
    console.error("Error parsing mensajes from storage", error);
    return [];
  }
}

function saveMessagesToStorage(messages) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
}

function restoreTheme() {
  const savedTheme = localStorage.getItem("modo-mensajes");
  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.checked = true;
  }
  updateThemeToggle(savedTheme === "dark");
}

function updateThemeToggle(isDark) {
  if (!themeHandle) return;
  themeHandle.textContent = isDark ? "🌙" : "☀️";
}

function setJsonStatus(message, isError = false) {
  if (!jsonStatus) return;
  jsonStatus.textContent = message;
  jsonStatus.style.color = isError ? "var(--danger)" : "var(--muted)";
}

function copyTextToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "readonly");
  textarea.style.position = "absolute";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
  return Promise.resolve();
}

async function copyWithFeedback(text, options = {}) {
  try {
    await copyTextToClipboard(text);
    if (options.onSuccess) options.onSuccess();
  } catch (err) {
    if (options.onError) options.onError();
    console.error("No se pudo copiar", err);
  }
}

async function refreshMessages() {
  selectedIds.clear();
  messagesState.items = loadMessagesFromStorage();
  renderList();
  setJsonStatus("");
}

function cleanupSelection() {
  for (const id of Array.from(selectedIds)) {
    if (!messagesState.items.find((msg) => msg.id === id)) {
      selectedIds.delete(id);
    }
  }
}

function refreshBulkActions() {
  const count = selectedIds.size;
  bulkCount.textContent = count === 1 ? "1 seleccionado" : `${count} seleccionados`;
  bulkDeleteBtn.disabled = count === 0;
}

function toggleSelection(id, checked) {
  if (checked) selectedIds.add(id);
  else selectedIds.delete(id);
  refreshBulkActions();
}

function openForm(mode = "add", message = null) {
  messageForm.classList.remove("hidden");
  if (mode === "edit" && message) {
    editingId = message.id;
    formTitle.textContent = "Editar mensaje";
    formSubmit.textContent = "Guardar cambios";
    formDelete.classList.remove("hidden");
    titleInput.value = message.title || "";
    bodyInput.value = message.text;
  } else {
    editingId = null;
    formTitle.textContent = "Agregar mensaje";
    formSubmit.textContent = "Guardar";
    formDelete.classList.add("hidden");
    messageForm.reset();
    bodyInput.value = "";
  }
  messageForm.scrollIntoView({ behavior: "smooth", block: "center" });
}

function closeForm() {
  messageForm.classList.add("hidden");
  messageForm.reset();
  editingId = null;
  formDelete.classList.add("hidden");
}

function closeSettings() {
  settingsPanel.classList.remove("open");
  scrim.classList.remove("visible");
}

function getSnippet(text, limit = 5) {
  if (!text) return "";
  const words = text.trim().split(/\s+/);
  if (words.length <= limit) return words.join(" ");
  return `${words.slice(0, limit).join(" ")}…`;
}

function renderList() {
  cleanupSelection();
  copyList.innerHTML = "";
  editList.innerHTML = "";

  if (!messagesState.items.length) {
    const helperCopy = document.createElement("p");
    helperCopy.className = "helper-text";
    helperCopy.textContent = "Tus mensajes aparecerán aquí para copiar rápido.";
    copyList.append(helperCopy);

    const helperEdit = document.createElement("p");
    helperEdit.className = "helper-text";
    helperEdit.textContent = "Pulsa el icono + para comenzar a guardar respuestas.";
    editList.append(helperEdit);
    refreshBulkActions();
    return;
  }

  messagesState.items.forEach((msg) => {
    const copyRow = document.createElement("div");
    copyRow.className = "copy-row";
    const copyText = document.createElement("div");
    copyText.className = "copy-text";
    const title = document.createElement("strong");
    title.textContent = msg.title || msg.text.slice(0, 40) || "Sin título";
    copyText.append(title);
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "icon-action";
    copyBtn.setAttribute("aria-label", `Copiar mensaje ${msg.title || "sin título"}`);
    copyBtn.innerHTML = `
      <span aria-hidden="true">📋</span>
      <span class="sr-only">Copiar mensaje ${msg.title || "sin título"}</span>
    `;
    copyBtn.dataset.template = copyBtn.innerHTML;
    copyBtn.addEventListener("click", () => {
      copyWithFeedback(msg.text, {
        onSuccess: () => {
          copyBtn.innerHTML = '<span aria-hidden="true">✔</span>';
          setTimeout(() => (copyBtn.innerHTML = copyBtn.dataset.template), 900);
        },
      });
    });
    copyRow.append(copyText, copyBtn);
    copyList.append(copyRow);

    const editRow = document.createElement("div");
    editRow.className = "edit-row";
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = selectedIds.has(msg.id);
    checkbox.addEventListener("change", (event) => toggleSelection(msg.id, event.target.checked));
    const info = document.createElement("div");
    info.className = "edit-info";
    const editTitle = document.createElement("strong");
    editTitle.textContent = msg.title || msg.text.slice(0, 40) || "Sin título";
    const editSnippet = document.createElement("p");
    editSnippet.textContent = getSnippet(msg.text);
    info.append(editTitle, editSnippet);
    const actionGroup = document.createElement("div");
    actionGroup.className = "edit-actions";
    const editBtn = document.createElement("button");
    editBtn.type = "button";
    editBtn.className = "icon-action";
    editBtn.setAttribute("aria-label", "Editar mensaje");
    editBtn.innerHTML = `
      <span aria-hidden="true">✏️</span>
      <span class="sr-only">Editar mensaje</span>
    `;
    editBtn.addEventListener("click", () => openForm("edit", msg));
    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "icon-action destructive";
    deleteBtn.setAttribute("aria-label", "Eliminar mensaje");
    deleteBtn.innerHTML = `
      <span aria-hidden="true">🗑️</span>
      <span class="sr-only">Eliminar mensaje</span>
    `;
    deleteBtn.addEventListener("click", async () => {
      try {
        const response = await fetch(`/api/messages/${msg.id}`, {
          method: "DELETE",
        });
        if (!response.ok) throw new Error();
        await refreshMessages();
        if (editingId === msg.id) closeForm();
        setJsonStatus("Mensaje eliminado.");
      } catch (error) {
        console.error(error);
        setJsonStatus("No se pudo eliminar el mensaje.", true);
      }
    });
    actionGroup.append(editBtn, deleteBtn);
    editRow.append(checkbox, info, actionGroup);
    editList.append(editRow);
  });

  refreshBulkActions();
}

messageForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const title = titleInput.value.trim();
  const body = bodyInput.value.trim();
  if (!body) {
    setJsonStatus("Agrega el texto del mensaje.", true);
    return;
  }

  const messages = loadMessagesFromStorage();
  if (editingId) {
    const index = messages.findIndex((msg) => msg.id === editingId);
    if (index === -1) {
      setJsonStatus("Mensaje no encontrado.", true);
      return;
    }
    messages[index] = {
      ...messages[index],
      title,
      text: body,
    };
    saveMessagesToStorage(messages);
    await refreshMessages();
    closeForm();
    setJsonStatus("Mensaje actualizado.");
    return;
  }

  const next = {
    id: Date.now().toString(),
    title,
    text: body,
  };
  messages.unshift(next);
  saveMessagesToStorage(messages);
  await refreshMessages();
  closeForm();
  setJsonStatus("Mensaje guardado.");
});

formDelete.addEventListener("click", async () => {
  if (!editingId) return;
  const messages = loadMessagesFromStorage();
  const filtered = messages.filter((msg) => msg.id !== editingId);
  if (filtered.length === messages.length) {
    setJsonStatus("Mensaje no encontrado.", true);
    return;
  }
  saveMessagesToStorage(filtered);
  await refreshMessages();
  closeForm();
  setJsonStatus("Mensaje eliminado.");
});

formClose.addEventListener("click", closeForm);
showFormBtn.addEventListener("click", () => openForm());
bulkDeleteBtn.addEventListener("click", async () => {
  if (!selectedIds.size) return;
  const ids = Array.from(selectedIds);
  const messages = loadMessagesFromStorage();
  const filtered = messages.filter((msg) => !ids.includes(msg.id));
  if (filtered.length === messages.length) {
    setJsonStatus("No hay mensajes seleccionados.", true);
    return;
  }
  saveMessagesToStorage(filtered);
  await refreshMessages();
  closeForm();
  setJsonStatus("Mensajes eliminados.");
});

function setActiveView(target) {
  viewButtons.forEach((btn) => {
    const isActive = btn.dataset.target === target;
    btn.classList.toggle("is-active", isActive);
    btn.setAttribute("aria-selected", isActive);
  });
  panels.forEach((panel) => {
    const isActivePanel = panel.dataset.view === target;
    panel.classList.toggle("hidden", !isActivePanel);
    panel.dataset.active = isActivePanel ? "true" : "false";
  });
}

viewButtons.forEach((button) => {
  button.addEventListener("click", () => setActiveView(button.dataset.target));
});

settingsToggle.addEventListener("click", () => {
  settingsPanel.classList.toggle("open");
  scrim.classList.toggle("visible");
});

scrim.addEventListener("click", () => {
  closeSettings();
});

settingsClose?.addEventListener("click", closeSettings);

themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("modo-mensajes", themeToggle.checked ? "dark" : "light");
  updateThemeToggle(themeToggle.checked);
});

function sanitizeVersion(tag) {
  return typeof tag === "string" ? tag.replace(/^v/i, "").trim() : "";
}

function formatReleaseMessage(info) {
  if (!info?.version) {
    return `Versión ${APP_VERSION}`;
  }
  const publishedDate = info.publishedAt
    ? new Date(info.publishedAt).toLocaleDateString()
    : "fecha desconocida";
  if (info.version === APP_VERSION) {
    return `Ya estás en la versión ${APP_VERSION}.`;
  }
  return `Versión ${info.version} disponible · publicada el ${publishedDate}`;
}

function handleWaitingWorker(worker, latestVersion) {
  if (!worker) return false;
  const message = latestVersion
    ? `Aplicando la versión ${latestVersion}...`
    : "Aplicando una nueva versión...";
  if (updateResult) {
    updateResult.textContent = message;
  }

  const onStateChange = () => {
    if (worker.state === "activated") {
      worker.removeEventListener("statechange", onStateChange);
      reloadPage();
    }
  };

  worker.addEventListener("statechange", onStateChange);
  worker.postMessage({ type: "SKIP_WAITING" });
  return true;
}

async function ensureServiceWorkerUpdate(latestVersion) {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  let applied = false;
  const applyWorker = (worker) => {
    if (!worker || applied) return false;
    applied = handleWaitingWorker(worker, latestVersion);
    return applied;
  };

  registration.addEventListener("updatefound", () => {
    const installing = registration.installing;
    if (!installing) return;
    installing.addEventListener("statechange", () => {
      if (installing.state === "installed" && registration.waiting) {
        applyWorker(registration.waiting);
      }
    });
  });

  await registration.update();

  if (registration.waiting) {
    return applyWorker(registration.waiting);
  }

  return false;
}

async function fetchLatestReleaseInfo() {
  const response = await fetch(RELEASE_CHECK_URL, {
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("No hay información disponible");
  }
  const data = await response.json();
  return {
    version: sanitizeVersion(data.tag_name),
    publishedAt: data.published_at,
  };
}

updateCheckBtn.addEventListener("click", async () => {
  updateResult.textContent = "Buscando actualizaciones...";
  let releaseInfo = null;
  try {
    releaseInfo = await fetchLatestReleaseInfo();
    updateResult.textContent = formatReleaseMessage(releaseInfo);
  } catch (error) {
    console.error("Actualizaciones:", error);
    updateResult.textContent = "No se pudo consultar la versión más reciente.";
  }

  const updated = await ensureServiceWorkerUpdate(releaseInfo?.version);
  if (updated) return;

  if (releaseInfo?.version && releaseInfo.version !== APP_VERSION) {
    updateResult.textContent += " Recarga la página para aplicarla.";
  }
});

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPromptEvent = event;
  installBtn.disabled = false;
});

installBtn.addEventListener("click", async () => {
  if (!installPromptEvent) {
    alert("Abre este sitio en un navegador compatible y busca el icono agregar a pantalla.");
    return;
  }
  installPromptEvent.prompt();
  const choice = await installPromptEvent.userChoice;
  if (choice.outcome === "accepted") {
    installPromptEvent = null;
  }
});

if (navigator.serviceWorker) {
  navigator.serviceWorker
    .register("sw.js")
    .catch((err) => console.warn("El service worker no pudo registrar:", err));
}

restoreTheme();
setActiveView("copy");
refreshMessages();
