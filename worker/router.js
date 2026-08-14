// "Ask the data" language router — a tiny Cloudflare Worker.
//
// Its ONLY job: turn a free-text question into a structured query object
//   { metric, direction, country? }
// that the site's deterministic engine (src/lib/ask.ts) then executes.
//
// It never returns figures — the numbers are always computed client-side from
// the local datasets, so the site's "every figure is sourced, none invented"
// guarantee is preserved by construction. The API key lives here as a Worker
// secret (`wrangler secret put OPENAI_API_KEY`) and is never shipped to the
// browser or committed to the repo.

// Must stay in lock-step with the Metric union in src/lib/types.ts.
const METRICS = [
  "leisure", "work", "dailyBirths", "dailyDeaths", "commute",
  "calories", "meat", "vegetables", "happiness", "lifeExpectancy",
  "fertility", "internet",
];
const DIRECTIONS = ["highest", "lowest", "lookup"];

const SYSTEM = `You translate a user's plain-language question about a global "24 hours on Earth" dataset into a structured query for a deterministic engine. You NEVER answer the question and NEVER produce any number, fact, or country — the engine computes every figure from the data.

The engine supports EXACTLY two query shapes:
1. Rank all countries by ONE metric: { metric, direction: "highest" | "lowest" }.
2. Look up ONE specific named country's value for ONE metric: { metric, direction: "lookup", country: "<name>" }.

Rules:
- If the user names a specific country, you MUST use direction "lookup" with that country and the single best-fitting metric. NEVER return a global ranking, and NEVER skip the tool, when a country is named. (So "what does Japan eat most" → the best single food metric for Japan, looked up.)
- Choose the SINGLE best-fitting metric. For generic eating / food / diet / "eats the most" with no specific food named, use "calories". Use "meat" or "vegetables" ONLY when the user explicitly names meat or vegetables.
- With no country named, use direction "highest" or "lowest" to rank all countries by the best-fitting metric.
- Only skip the tool (do not call it) when the question is off-topic, has no matching metric, or asks for a change/trend over time — none of which the engine supports.`;

const TOOL = {
  type: "function",
  function: {
    name: "query_dataset",
    description: "Route a question to the deterministic dataset engine.",
    parameters: {
      type: "object",
      additionalProperties: false,
      properties: {
        metric: { type: "string", enum: METRICS, description: "Which measure the question is about." },
        direction: { type: "string", enum: DIRECTIONS, description: "highest = most/top, lowest = least/bottom, lookup = a single named country." },
        country: { type: "string", description: "Country name, only when direction is lookup." },
      },
      required: ["metric", "direction"],
    },
  },
};

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
    if (request.method !== "POST") return json({ error: "POST only" }, 405);

    let question = "";
    try {
      const body = await request.json();
      question = String(body?.question ?? "").slice(0, 500);
    } catch {
      return json({ error: "bad json" }, 400);
    }
    if (!question.trim()) return json({ hint: null });

    // Bound the upstream call so the box never hangs; the client also falls
    // back to the local engine on any non-hint response.
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          temperature: 0,
          messages: [
            { role: "system", content: SYSTEM },
            { role: "user", content: question },
          ],
          tools: [TOOL],
          tool_choice: "auto",
        }),
      });
      if (!res.ok) return json({ hint: null });

      const data = await res.json();
      const call = data?.choices?.[0]?.message?.tool_calls?.[0];
      if (!call) return json({ hint: null });

      let args;
      try {
        args = JSON.parse(call.function.arguments);
      } catch {
        return json({ hint: null });
      }

      // Validate against our own enums — never trust the model blindly.
      if (!METRICS.includes(args.metric) || !DIRECTIONS.includes(args.direction)) {
        return json({ hint: null });
      }
      const hint = { metric: args.metric, direction: args.direction };
      if (args.direction === "lookup" && typeof args.country === "string") {
        hint.country = args.country.slice(0, 60);
      }
      return json({ hint });
    } catch {
      return json({ hint: null });
    } finally {
      clearTimeout(timer);
    }
  },
};
