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

let editingId = null;
const selectedIds = new Set();
let installPromptEvent = null;

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
  try {
    const response = await fetch("/api/messages", {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("No se pudo cargar");
    selectedIds.clear();
    messagesState.items = await response.json();
    renderList();
    setJsonStatus("");
  } catch (error) {
    console.error("No se pudo sincronizar con el servidor", error);
    setJsonStatus("No se pudo obtener los mensajes.", true);
  }
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
  const payload = {
    title,
    text: body,
  };
  const endpoint = editingId ? `/api/messages/${editingId}` : "/api/messages";
  const method = editingId ? "PUT" : "POST";
  try {
    const response = await fetch(endpoint, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("No se pudo guardar");
    await refreshMessages();
    closeForm();
    setJsonStatus(editingId ? "Mensaje actualizado." : "Mensaje guardado.");
  } catch (error) {
    console.error(error);
    setJsonStatus("No se pudo guardar el mensaje.", true);
  }
});

formDelete.addEventListener("click", async () => {
  if (!editingId) return;
  try {
    const response = await fetch(`/api/messages/${editingId}`, {
      method: "DELETE",
    });
    if (!response.ok) throw new Error("No se pudo eliminar");
    await refreshMessages();
    closeForm();
    setJsonStatus("Mensaje eliminado.");
  } catch (error) {
    console.error(error);
    setJsonStatus("No se pudo eliminar el mensaje.", true);
  }
});

formClose.addEventListener("click", closeForm);
showFormBtn.addEventListener("click", () => openForm());
bulkDeleteBtn.addEventListener("click", async () => {
  if (!selectedIds.size) return;
  const ids = Array.from(selectedIds);
  try {
    const response = await fetch("/api/messages/bulk-delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) throw new Error("No se pudo eliminar");
    await refreshMessages();
    closeForm();
    setJsonStatus("Mensajes eliminados.");
  } catch (error) {
    console.error(error);
    setJsonStatus("No se pudo eliminar los mensajes.", true);
  }
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
  settingsPanel.classList.remove("open");
  scrim.classList.remove("visible");
});

themeToggle.addEventListener("change", () => {
  document.body.classList.toggle("dark", themeToggle.checked);
  localStorage.setItem("modo-mensajes", themeToggle.checked ? "dark" : "light");
  updateThemeToggle(themeToggle.checked);
});

updateCheckBtn.addEventListener("click", async () => {
  updateResult.textContent = "Buscando...";
  try {
    const res = await fetch(
      "https://api.github.com/repos/tomas-medel/A-msg/releases/latest"
    );
    if (!res.ok) throw new Error("No hay info disponible");
    const data = await res.json();
    updateResult.textContent = `Versión ${data.tag_name} · publicada el ${new Date(
      data.published_at
    ).toLocaleDateString()}`;
  } catch (error) {
    updateResult.textContent = "Repositorio no disponible";
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


