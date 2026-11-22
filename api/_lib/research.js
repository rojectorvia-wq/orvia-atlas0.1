// Búsqueda externa opcional para complementar la biblioteca de ORVIA.
// Requiere TAVILY_API_KEY en el entorno Preview. Los resultados son pistas,
// no hechos verificados: se entregan al modelo como fuentes no confiables.

// Minimiza datos antes de transmitir una consulta a un proveedor externo.
// No sustituye una revisión de privacidad ni garantiza anonimización.
export function sanitizeResearchQuery(value) {
  return String(value || "")
    .normalize("NFKC")
    .replace(/https?:\/\/[^\s]+/gi, " ")
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, " ")
    .replace(/\b(?:bearer|api[_ -]?key|secret|password|contraseña|token)\s*[:=]?\s*[^\s,;]+/gi, " ")
    .replace(/\bsk-[A-Za-z0-9_-]{12,}\b/g, " ")
    .replace(/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, " ")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

export function shouldResearch(message) {
  const q = String(message || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  return /\b(actual|actualizado|actualmente|hoy|este ano|2026|ultima|ultimo|reciente|vigente|normativa|regulacion|ley|resolucion|precio actual|cuanto cuesta|cadena|franquicia|restaurante [a-z]|mcdonald|starbucks|kfc|dominos|subway|tendencia|fuente|investiga|consulta|busca|verifica|cita|referencia)\b/.test(q)
    || /\b(quien|cual|que)\b.*\b(restaurante|cadena|franquicia|proveedor|norma|ley)\b/.test(q);
}

export async function researchWeb(message, decision = null) {
  const apiKey = process.env.TAVILY_API_KEY || "";
  const needsSearch = decision?.needsResearch === true || (!decision && shouldResearch(message));
  if (!apiKey || !needsSearch) {
    return { attempted: false, available: Boolean(apiKey), reason: apiKey ? "No se detectó necesidad clara de información externa." : "Falta configurar TAVILY_API_KEY en Preview.", sources: [] };
  }
  const query = sanitizeResearchQuery(decision?.query || message);
  if (query.length < 3) {
    return { attempted: false, available: true, reason: "La consulta no contiene términos suficientes después de retirar datos sensibles.", sources: [] };
  }
  const query = sanitizeResearchQuery(decision?.query || message);
  if (query.length < 3) {
    return { attempted: false, available: true, reason: "La consulta no contiene términos suficientes después de retirar datos sensibles.", sources: [] };
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: "basic",
        topic: "general",
        max_results: 5,
        include_answer: false,
        include_raw_content: false
      }),
      signal: controller.signal
    });
    if (!response.ok) return { attempted: true, available: true, reason: "El proveedor de búsqueda no respondió correctamente.", sources: [] };
    const payload = await response.json();
    const sources = (Array.isArray(payload.results) ? payload.results : []).slice(0, 5).map((item) => {
      let url = "";
      try { const parsed = new URL(item.url); if (["http:", "https:"].includes(parsed.protocol)) url = parsed.href; } catch {}
      return {
        title: String(item.title || "Fuente consultada").slice(0, 180),
        url,
        content: String(item.content || "").slice(0, 1000),
        publishedDate: item.published_date || null,
        score: Number(item.score) || 0
      };
    }).filter(item => item.url && item.content);
    return { attempted: true, available: true, reason: sources.length ? "Se encontraron fuentes externas para contrastar." : "La búsqueda no devolvió fuentes útiles.", sources };
  } catch {
    return { attempted: true, available: true, reason: "No fue posible completar la búsqueda externa.", sources: [] };
  } finally {
    clearTimeout(timeout);
  }
}
