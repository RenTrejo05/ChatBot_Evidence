const router = require("express").Router();
const { connectDB } = require("../lib/mongodb");
const { formatMedicamentoField } = require("../utils/functions/formatter");

// In-memory session store by IP (replace with persistent store in production)
const sessions = {}; // { [sessionId]: { lastMedicamento: string|null, lastContext?: string } }

/**
 * Calculates the Levenshtein distance between two strings.
 */
function levenshtein(a, b) {
  const m = a.length,
    n = b.length;
  const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
  }
  return dp[m][n];
}

/** Utility to pick random element. */
function getRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Single-response small-talk */
function detectSmallTalkSingle(text) {
  const t = text.trim().toLowerCase();
  const single = [
    {
      frases: ["hola", "ola", "holá", "buenas", "hi", "hello"],
      respuestas: [
        "¡Hola! ¿Cómo puedo ayudarte hoy?",
        "¡Hey! ¿En qué te puedo ayudar?",
        "¡Saludos! ¿Qué necesitas saber?",
      ],
    },
    {
      frases: ["cómo estás", "como estas", "qué tal", "que tal", "cmo estas"],
      respuestas: [
        "Estoy bien, gracias por preguntar. ¿En qué más puedo ayudarte?",
      ],
    },
    {
      frases: [
        "gracias",
        "merci",
        "thank you",
        "thanks",
        "thank u",
        "grasias",
        "grazias",
        "graciaz",
        "graciac",
      ],
      respuestas: ["Por nada, estoy para ayudarte."],
    },
    {
      frases: ["gracias tilin"],
      respuestas: ["Por nada tilin!"],
    },
    {
      frases: ["qué eres", "quién eres", "quien eres", "qué sos", "quien sos"],
      respuestas: [
        "Soy el asistente virtual de MediTime, aquí para resolver tus dudas sobre medicamentos.",
        "Un chatbot de MediTime para ayudarte con información médica.",
      ],
    },
    {
      frases: [
        "remplazas a un medico",
        "reemplazas a un medico",
        "remplazas a un médico",
        "reemplazas a un médico",
      ],
      respuestas: [
        "No, no reemplazo a un médico. Estoy aquí para complementar tu conocimiento.",
        "Nunca sustituyo la atención de un profesional de la salud; siempre consulta a un médico.",
      ],
    },
    {
      frases: [
        "remplazas a la medicina",
        "reemplazas a la medicina",
        "como le sirves a la medicina",
        "cómo le sirves a la medicina",
      ],
      respuestas: [
        "Complemento datos sobre medicamentos; no sustituyo la práctica médica.",
        "Ofrezco información y referencias, pero sigue las indicaciones de tu médico.",
      ],
    },
  ];

  for (const item of single) {
    for (const frase of item.frases) {
      if (levenshtein(t, frase) <= 2) {
        return getRandom(item.respuestas);
      }
    }
  }
  return null;
}

/** Multi-response small-talk */
function detectSmallTalkArray(text) {
  const t = text.trim().toLowerCase();
  const multi = [
    {
      frases: [
        "qué haces",
        "que haces",
        "cómo funcionas",
        "como funcionas",
        "cmo funcionas",
      ],
      respuestas: [
        "Soy el ChatBot de MediTime y puedo proporcionarte información sobre medicamentos, sus usos, efectos, presentaciones e interacciones, y llevo un historial de tus consultas.",
      ],
    },
    {
      frases: ["cómo te uso", "como te uso"],
      respuestas: [
        "Para usarme, simplemente escribe en el chat el nombre del medicamento o la pregunta que tengas sobre él (por ejemplo: “¿Para qué sirve la aspirina?”, “¿Qué efectos secundarios tiene la warfarina?”).",
        "También puedes desplegar las preguntas predefinidas pulsando la flecha junto al campo de entrada y seleccionando la que necesites. Cada consulta que hagas se guardará automáticamente en tu historial, al que puedes acceder desde el menú (≡) y borrar con el botón ‘Limpiar historial’.",
      ],
    },
    {
      frases: [
        "qué puedo preguntarte",
        "que puedo preguntarte",
        "q puedo preguntarte",
        "que te puedo preguntar",
        "qué te puedo preguntar",
        "que puedo preguntar",
        "qué puedo preguntar",
        "q puedo preguntar",
      ],
      respuestas: [
        "Puedes preguntarme sobre usos, efectos, presentaciones e interacciones de medicamentos.",
        "Cada consulta se guarda en tu historial, que puedes limpiar desde el menú.",
      ],
    },
  ];

  for (const item of multi) {
    for (const frase of item.frases) {
      if (levenshtein(t, frase) <= 2) {
        return item.respuestas;
      }
    }
  }
  return null;
}

/** Detects user intent related to medication info. */
function detectIntent(text) {
  const t = text.toLowerCase();
  if (/uso(s)?|para qué|sirve/.test(t)) return "usos";
  if (/efecto(s)? comunes?|qué efectos|efectos/.test(t)) return "efectos";
  if (/adverso(s)?|efecto(s)? secundario(s)?/.test(t)) return "adversos";
  if (/presentaci(o|ó)n/.test(t)) return "presentacion";
  if (/interacci(o|ó)n|mezclar|combinar/.test(t)) return "interacciones";
  return "full";
}

/** Detects general “what to take for X” questions. */
function detectSymptomAdvice(text) {
  const clean = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!]/g, "")
      .trim();
  const c = clean(text.toLowerCase());
  return /^(?:que\s+)?(?:puedo\s+)?(?:tomo|tomar)\s+(?:para|por)?\s*(?:los|las|el|la)?\s*(.+)$/.test(
    c
  );
}

/** Detects medication name with fuzzy matching. */
async function detectMedicamentoName(text, db) {
  const meds = await db
    .collection("medicamentos")
    .find({}, { projection: { nombre: 1 } })
    .toArray();
  const lower = text.toLowerCase();
  const tokens = lower.match(/\b[a-záéíóúüñ]+\b/g) || [];
  for (const { nombre } of meds) {
    const nLow = nombre.toLowerCase();
    if (tokens.includes(nLow) || lower.includes(nLow)) return nombre;
  }
  for (const tok of tokens) {
    for (const { nombre } of meds) {
      const nLow = nombre.toLowerCase();
      if (
        levenshtein(tok, nLow) <= 2 &&
        Math.abs(tok.length - nLow.length) <= 2
      ) {
        return nombre;
      }
    }
  }
  return null;
}

// --- Routes ---

router.get("/preguntas", async (_, res) => {
  try {
    const db = await connectDB();
    const list = await db
      .collection("preguntas")
      .find()
      .sort({ texto: 1 })
      .toArray();
    res.json(list);
  } catch (err) {
    console.error("Error loading questions:", err);
    res.status(500).json({ message: "No se pudieron cargar las preguntas" });
  }
});

router.get("/historial", async (_, res) => {
  try {
    const db = await connectDB();
    const list = await db
      .collection("historials")
      .find()
      .sort({ fecha: -1 })
      .limit(50)
      .toArray();
    res.json(list);
  } catch (err) {
    console.error("Error fetching history:", err);
    res.status(500).json({ message: "No se pudo cargar el historial" });
  }
});

router.delete("/historial", async (req, res) => {
  try {
    const db = await connectDB();
    const count = await db.collection("historials").countDocuments();
    if (count === 0) {
      return res
        .status(400)
        .json({ ok: false, message: "No hay historial para borrar." });
    }
    await db.collection("historials").deleteMany({});
    delete sessions[req.ip];
    res.json({ ok: true, message: "Historial borrado correctamente." });
  } catch (err) {
    console.error("Error deleting history:", err);
    res.status(500).json({ ok: false, message: "Error al borrar historial." });
  }
});

router.post("/chat", async (req, res) => {
  const { message } = req.body;
  const db = await connectDB();
  const t = message.trim();

 // --- Context for "pastillero" ---
sessions[req.ip] = sessions[req.ip] || {};
if (/pastillero/i.test(t)) {
  sessions[req.ip].lastContext = "pastillero";
}

if (sessions[req.ip].lastContext === "pastillero") {
  if (/\b(luz|corriente|energ[ií]a)\b/i.test(t)) {
    const resp =
      "El pastillero IoT necesita alimentación eléctrica (5 V DC) o baterías recargables para funcionar correctamente.";
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }
  else if (/\b(?:hecho|fabricad[oa]|material)\b/i.test(t)) {
    const resp =
      "La carcasa del pastillero está impresa en 3D con plástico ABS y el interior incluye un ESP32, display LCD y LEDs.";
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }
  else if (/\b(?:golpe|guamazo|chingazo|putazo)\b/i.test(t)) {
    const resp =
      "¡No! Es nuestro bebé tecnológico, por favor trátalo con cuidado.";
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }
  else if (/\b(?:ubicad[oa]|mantener|colocar|guardarlo)\b/i.test(t)) {
    const resp =
      "Es importante mantener el pastillero en un lugar fresco y seco, a temperatura ambiente (20 °C–25 °C), lejos de la luz solar directa y la humedad. Además, colócalo cerca de una fuente de alimentación estable y fuera del alcance de los niños.";
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }
  else if (!/pastillero/i.test(t)) {
    delete sessions[req.ip].lastContext;
  }
}

  // 1) Small-talk array (multi-response)
  const multi = detectSmallTalkArray(t);
  if (multi) {
    for (const part of multi) {
      await db
        .collection("historials")
        .insertOne({ pregunta: message, respuesta: part, fecha: new Date() });
    }
    return res.json({ respuestas: multi });
  }

  // 2) Single-response small-talk
  const single = detectSmallTalkSingle(t);
  if (single) {
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: single, fecha: new Date() });
    return res.json({ respuestas: [single] });
  }

  // 3) Symptom advice
  if (detectSymptomAdvice(t)) {
    const resp =
      "Lo siento, no puedo recomendar medicamentos. Consulta con un profesional de la salud.";
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }

  // 4) FAQs
  const faqs = await db.collection("preguntas").find().toArray();
  const cleanNorm = (s) => s.toLowerCase().replace(/[^a-z0-9áéíóúüñ¿? ]/g, "");
  const inputNorm = cleanNorm(t);
  const matched = faqs.find(
    (f) => levenshtein(inputNorm, cleanNorm(f.texto)) <= 6
  );
  if (matched) {
    await db.collection("historials").insertOne({
      pregunta: message,
      respuesta: matched.respuesta,
      fecha: new Date(),
    });
    return res.json({ respuestas: [matched.respuesta] });
  }

  // 5) Medication lookup with context
  let medName = await detectMedicamentoName(t, db);
  if (!medName && sessions[req.ip]?.lastMedicamento) {
    medName = sessions[req.ip].lastMedicamento;
  }
  if (medName) {
    sessions[req.ip] = sessions[req.ip] || {};
    sessions[req.ip].lastMedicamento = medName;
    const intent = detectIntent(t);
    const med = await db
      .collection("medicamentos")
      .findOne({ nombre: medName });
    const resp = med
      ? formatMedicamentoField(med, intent)
      : `No encontré información sobre "${medName}".`;
    await db
      .collection("historials")
      .insertOne({ pregunta: message, respuesta: resp, fecha: new Date() });
    return res.json({ respuestas: [resp] });
  }

  // 6) Fallback
  const fallback =
    "Lo siento, no pude encontrar información sobre eso. ¿Puedes reformular?";
  await db
    .collection("historials")
    .insertOne({ pregunta: message, respuesta: fallback, fecha: new Date() });
  res.json({ respuestas: [fallback] });
});

module.exports = router;
