// server/src/utils/functions/formatter.js

/**
 * Convert ["A","B","C"] → "A, B y C"
 */
function listToNatural(arr) {
  if (!arr || arr.length === 0) return "";
  if (arr.length === 1) return arr[0];
  const last = arr[arr.length - 1];
  return `${arr.slice(0, -1).join(", ")} y ${last}`;
}

/**
 * Respuestas completas humanizadas
 */
function formatMedicamentoFull(med) {
  const parts = [];

  if (med.presentacion) {
    parts.push(`Se presenta como ${med.presentacion}.`);
  }
  if (med.usos && med.usos.length) {
    parts.push(`Suele utilizarse para ${listToNatural(med.usos)}.`);
  }
  if (med.efectos && med.efectos.length) {
    parts.push(
      `Entre los efectos más frecuentes están ${listToNatural(med.efectos)}.`
    );
  }
  if (med.adversos && med.adversos.length) {
    parts.push(`Atención: puede provocar ${listToNatural(med.adversos)}.`);
  }
  if (med.interacciones && med.interacciones.length) {
    parts.push(`Evita combinarlo con ${listToNatural(med.interacciones)}.`);
  }

  return `¡Hola! Te cuento sobre ${med.nombre}:\n` + parts.join("\n");
}

/**
 * Respuestas por campo concreto
 */
function formatMedicamentoField(med, field) {
  switch (field) {
    case "presentacion":
      return med.presentacion
        ? `El ${med.nombre} se presenta como ${med.presentacion}.`
        : `No tengo datos de presentación para ${med.nombre}.`;

    case "usos":
      return med.usos && med.usos.length
        ? `El ${med.nombre} se usa para ${listToNatural(med.usos)}.`
        : `No dispongo de información sobre los usos de ${med.nombre}.`;

    case "efectos":
      return med.efectos && med.efectos.length
        ? `Entre los efectos comunes de ${med.nombre} están ${listToNatural(
            med.efectos
          )}.`
        : `No tengo datos de efectos para ${med.nombre}.`;

    case "adversos":
      return med.adversos && med.adversos.length
        ? `Atención: ${med.nombre} puede causar ${listToNatural(med.adversos)}.`
        : `No cuento con información sobre efectos adversos de ${med.nombre}.`;

    case "interacciones":
      return med.interacciones && med.interacciones.length
        ? `No mezcles ${med.nombre} con ${listToNatural(med.interacciones)}.`
        : `No hay registros de interacciones para ${med.nombre}.`;
    

    case "full":
    default:
      return formatMedicamentoFull(med);
  }
}

module.exports = { formatMedicamentoField };
