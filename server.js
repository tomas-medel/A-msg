const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "mensajes.json");

app.use(express.json());

async function ensureDataFile() {
  try {
    await fs.access(DATA_FILE);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
    await fs.writeFile(DATA_FILE, "[]", "utf8");
  }
}

async function readMessages() {
  await ensureDataFile();
  const content = await fs.readFile(DATA_FILE, "utf8");
  return JSON.parse(content || "[]");
}

async function writeMessages(messages) {
  await ensureDataFile();
  await fs.writeFile(DATA_FILE, JSON.stringify(messages, null, 2), "utf8");
}

app.get("/api/messages", async (req, res) => {
  try {
    const messages = await readMessages();
    res.json(messages);
  } catch (error) {
    console.error("GET /api/messages", error);
    res.status(500).json({ error: "No se pudieron leer los mensajes." });
  }
});

app.post("/api/messages", async (req, res) => {
  try {
    const { title = "", text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "El mensaje necesita texto." });
    }
    const messages = await readMessages();
    const next = {
      id: Date.now().toString(),
      title: title.toString().trim(),
      text: text.toString().trim(),
    };
    messages.unshift(next);
    await writeMessages(messages);
    res.status(201).json(next);
  } catch (error) {
    console.error("POST /api/messages", error);
    res.status(500).json({ error: "No se pudo guardar el mensaje." });
  }
});

app.put("/api/messages/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const { title = "", text } = req.body;
    if (!text || typeof text !== "string" || !text.trim()) {
      return res.status(400).json({ error: "El mensaje necesita texto." });
    }
    const messages = await readMessages();
    const index = messages.findIndex((msg) => msg.id === id);
    if (index === -1) return res.status(404).json({ error: "Mensaje no encontrado." });
    messages[index] = {
      ...messages[index],
      title: title.toString().trim(),
      text: text.toString().trim(),
    };
    await writeMessages(messages);
    res.json(messages[index]);
  } catch (error) {
    console.error("PUT /api/messages/:id", error);
    res.status(500).json({ error: "No se pudo actualizar el mensaje." });
  }
});

app.delete("/api/messages/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const messages = await readMessages();
    const filtered = messages.filter((msg) => msg.id !== id);
    if (filtered.length === messages.length) {
      return res.status(404).json({ error: "Mensaje no encontrado." });
    }
    await writeMessages(filtered);
    res.status(204).end();
  } catch (error) {
    console.error("DELETE /api/messages/:id", error);
    res.status(500).json({ error: "No se pudo eliminar el mensaje." });
  }
});

app.post("/api/messages/bulk-delete", async (req, res) => {
  try {
    const ids = Array.isArray(req.body.ids) ? req.body.ids.map(String) : [];
    if (!ids.length) return res.status(400).json({ error: "Envía IDs válidos." });
    const messages = await readMessages();
    const filtered = messages.filter((msg) => !ids.includes(msg.id));
    await writeMessages(filtered);
    res.status(200).json({ deleted: messages.length - filtered.length });
  } catch (error) {
    console.error("POST /api/messages/bulk-delete", error);
    res.status(500).json({ error: "No se pudo eliminar los mensajes." });
  }
});

app.post("/api/messages/import", async (req, res) => {
  try {
    const incoming = Array.isArray(req.body.messages) ? req.body.messages : [];
    const normalized = incoming
      .filter((item) => item && typeof item.text === "string")
      .map((item) => ({
        id: typeof item.id === "string" && item.id ? item.id : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        title: item.title ? item.title.toString().trim() : "",
        text: item.text.toString().trim(),
      }));
    if (!normalized.length) {
      return res.status(400).json({ error: "No hay mensajes válidos." });
    }
    await writeMessages(normalized);
    res.status(201).json(normalized);
  } catch (error) {
    console.error("POST /api/messages/import", error);
    res.status(500).json({ error: "No se pudo importar los mensajes." });
  }
});

app.use(express.static(path.join(__dirname)));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor listo en http://localhost:${PORT}`);
});
