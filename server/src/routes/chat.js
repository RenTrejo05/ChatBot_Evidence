const router = require("express").Router();
const { connectDB } = require("../lib/mongodb");
const { formatMedicamentoField } = require("../utils/functions/formatter");

/**
 * Calculates the Levenshtein distance between two strings.
 * Used for approximate string matching.
 * @param {string} a
 * @param {string} b
 * @returns {number} Distance
 */
// Levenshtein distance function
// Source: https://en.wikipedia.org/wiki/Levenshtein_distance
// This function calculates the distance between two strings.
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

/**
 * Detects basic small-talk intents and returns canned responses.
 * @param {string} text User input
 * @returns {string|string[]|null} Response or null if no match
 */
function detectSmallTalk(text) {
  const t = text.trim().toLowerCase();

  const smallTalks = [
    {
      frases: ["hola", "ola", "holá", "buenas", "hi", "hello"],
      respuesta: "¡Hola! ¿Cómo puedo ayudarte hoy?",
    },
    {
      frases: ["cómo estás", "como estas", "qué tal", "que tal", "cmo estas"],
      respuesta:
        "Estoy bien, gracias por preguntar. ¿En qué más puedo ayudarte?",
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
      respuesta: "Por nada, estoy para ayudarte.",
    },
    {
      frases: [
        "qué haces",
        "que haces",
        "cómo funcionas",
        "como funcionas",
        "cmo funcionas",
      ],
      respuesta:
        "Soy el ChatBot de MediTime y puedo proporcionarte información sobre medicamentos, sus usos, efectos, presentaciones e interacciones, y llevo un historial de tus consultas.",
    },
    {
      frases: ["cómo te uso", "como te uso"],
      respuesta: [
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
      respuesta: [
        "Puedes realizar preguntas que tengas sobre un medicamento (por ejemplo: “¿Para qué sirve la aspirina?”, “¿Qué efectos secundarios tiene la warfarina?”).",
        "También puedes desplegar las preguntas predefinidas pulsando la flecha junto al campo de entrada y seleccionando la que necesites. Cada consulta que hagas se guardará automáticamente en tu historial, al que puedes acceder desde el menú (≡) y borrar con el botón ‘Limpiar historial’.",
      ],
    },
  ];

  for (const item of smallTalks) {
    for (const frase of item.frases) {
      if (levenshtein(t, frase) <= 2) {
        return item.respuesta;
      }
    }
  }

  return null;
}

/**
 * Detects user intent related to medication information.
 * @param {string} text User input
 * @returns {string} Intent keyword
 */
function detectIntent(text) {
  const t = text.toLowerCase();
  if (/uso(s)?|para qué|sirve/.test(t)) return "usos";
  if (/efecto(s)? comunes?|qué efectos|efectos/.test(t)) return "efectos";
  if (/adverso(s)?|efecto(s)? secundario(s)?/.test(t)) return "adversos";
  if (/presentaci(o|ó)n/.test(t)) return "presentacion";
  if (/interacci(o|ó)n|mezclar|combinar/.test(t)) return "interacciones";
  return "full";
}

/**
 * Detects general “what to take for X” questions.
 * Si el usuario pregunta “qué tomo para dolor”, “que tomar para fiebre”, etc.
 * @param {string} text
 * @returns {boolean}
 */
function detectSymptomAdvice(text) {
  const t = text.trim().toLowerCase();
  // Quitamos signos de interrogación y acentos para normalizar
  const clean = (s) =>
    s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[¿?¡!]/g, "")
      .trim();

  const c = clean(t);
  // Patrón: (que)? (tomo|tomar) (para|por)? (la|el)? síntoma...
  const regex = 
  /^(?:que\s+)?(?:puedo\s+)?(?:tomo|tomar)\s+(?:para|por)?\s*(?:los|las|el|la)?\s*(.+)$/;
  const m = c.match(regex);
  if (m) {
    const symptom = m[1].trim();
    // opcional: ignorar si symptom coincide con medicamento
    return true;
  }
  return false;
}

/**
 * Detects medication name in text with tolerance for spelling errors.
 * @param {string} text User input
 * @param {object} db MongoDB database instance
 * @returns {Promise<string|null>} Medication name or null if not found
 */
//Brings all medication names from MongoDB.
async function detectMedicamentoName(text, db) {
  const meds = await db
    .collection("medicamentos")
    .find({}, { projection: { nombre: 1 } })
    .toArray();

  const lower = text.toLowerCase();
  const tokens = lower.match(/\b[a-záéíóúüñ]+\b/g) || [];

  // Exact match
  for (const { nombre } of meds) {
    const nLow = nombre.toLowerCase();
    if (tokens.includes(nLow) || lower.includes(nLow)) {
      return nombre;
    }
  }

  // Approximate match (Levenshtein ≤ 2)
  for (const tok of tokens) {
    for (const { nombre } of meds) {
      const nLow = nombre.toLowerCase();
      const dist = levenshtein(tok, nLow);
      if (dist <= 2 && Math.abs(tok.length - nLow.length) <= 2) {
        return nombre;
      }
    }
  }

  return null;
}

// Get predefined questions
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
    console.error("Error loading predefined questions:", err);
    res
      .status(500)
      .json({ message: "No se pudieron cargar las preguntas predefinidas" });
  }
});

// Get last 50 history entries
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

// Delete history
router.delete("/historial", async (_, res) => {
  try {
    const db = await connectDB();
    await db.collection("historials").deleteMany({});
    res.json({ ok: true, message: "Historial borrado correctamente." });
  } catch (err) {
    console.error("Error deleting history:", err);
    res.status(500).json({ ok: false, message: "Error al borrar historial." });
  }
});

// Chat handler
router.post("/chat", async (req, res) => {
  const { message } = req.body;
  let reply =
    "Lo siento, no pude encontrar información sobre eso. ¿Puedes reformular?";
  const db = await connectDB();
  const t = message.trim().toLowerCase();

  // Small talk
  const small = detectSmallTalk(message);
  if (small != null) {
    reply = small;
  } else if (detectSymptomAdvice(message)) {
    reply =
      "Lo siento, no puedo recomendar medicamentos. Consulta con un profesional de la salud.";
  } else {
    // 1) Predefined questions
    const faqs = await db.collection("preguntas").find().toArray();
    const clean = (str) =>
      str.toLowerCase().replace(/[^a-z0-9áéíóúüñ¿? ]/g, "");
    const inputNorm = clean(t);
    let matchedFaq = null;

    for (const faq of faqs) {
      const faqNorm = clean(faq.texto);
      const dist = levenshtein(inputNorm, faqNorm);
      if (dist <= 6) {
        matchedFaq = faq;
        break;
      }
    }

    if (matchedFaq) {
      reply = matchedFaq.respuesta;
    } else {
      // 2) Medication query
      const medName = await detectMedicamentoName(message, db);
      const intent = detectIntent(message);
      if (medName) {
        const med = await db
          .collection("medicamentos")
          .findOne({ nombre: medName });
        reply = med
          ? formatMedicamentoField(med, intent)
          : `No encontré información sobre "${medName}".`;
      }
    }
  }

  // Save to history
  const parts = Array.isArray(reply) ? reply : [reply];
  for (const part of parts) {
    await db.collection("historials").insertOne({
      pregunta: message,
      respuesta: part,
      fecha: new Date(),
    });
  }

  res.json({ respuestas: parts });
});

module.exports = router;
