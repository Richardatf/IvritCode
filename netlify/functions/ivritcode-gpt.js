// netlify/functions/ivritcode-gpt.js
//
// Proxy endpoint for IvritCodeGPT.
// Expects JSON body:
// {
//   initialState: number[],
//   finalState: number[],
//   trace: { index, letter, before, after }[],
//   instructions: string[],
//   program: string,
//   question: string
// }
//
// Returns JSON:
// { answer: string }
//
// IMPORTANT: Set OPENAI_API_KEY in Netlify environment variables.

const fetch = (...args) =>
  import("node-fetch").then(({ default: f }) => f(...args));

exports.handler = async (event, context) => {
  try {
    if (event.httpMethod !== "POST") {
      return {
        statusCode: 405,
        body: "Method Not Allowed"
      };
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        body: "Missing OPENAI_API_KEY environment variable"
      };
    }

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        body: "Invalid JSON body"
      };
    }

    const {
      initialState,
      finalState,
      trace,
      instructions,
      program,
      question
    } = body;

    // Minimal sanity checks (non-fatal if missing; we just say so to the model)
    const safeInitial = Array.isArray(initialState) ? initialState : [];
    const safeFinal = Array.isArray(finalState) ? finalState : [];
    const safeTrace = Array.isArray(trace) ? trace.slice(0, 200) : []; // cap length
    const safeInstructions = Array.isArray(instructions) ? instructions : [];
    const safeProgram = typeof program === "string" ? program : "";
    const safeQuestion = typeof question === "string" ? question : "";

    const systemPrompt = `
You are IvritCodeGPT, an explanatory assistant for the IvritCode engine.

IvritCode is a deterministic, purely numeric symbolic system:
- 23 registers: 22 letter-registers (א..ת) and A (Aleph-Olam).
- All arithmetic is in Z_22 (0..21).
- Hebrew letters (א..ת) act as operators over the registers.
- The machine state is just numbers; there is no mystical "oracle" here.

Your job:
- Explain in clear, gentle language what the run did, numerically and symbolically.
- Use Kabbalistic and Hebrew imagery if helpful, but always label it as symbolic.
- Focus on patterns: strong letters, motion of A, shifts between initial and final state.
- You may mention gematria, roots, and letter symbolism at a high level.

You MUST NOT:
- Claim you can predict the user's future, health, relationships, or specific events.
- Treat the numeric state as a divination or prophecy.
- Give halachic rulings or medical advice. If asked, say they must ask a rav or professional.
- Tell the user what to do in life based on the numeric output.

Tone:
- Warm, respectful, contemplative.
- 1–3 paragraphs plus a short bullet list is ideal.
- Always make it clear that this is a symbolic reflection on a numeric experiment, not a spiritual verdict.
`;

    const userPrompt = `
Here is the IvritCode run you are explaining.

Program text (raw, as typed by user):
${safeProgram || "(empty)"}

Executed letters (א–ת only, after filtering):
${safeInstructions.join("") || "(none)"}

Initial state R(23) (23 registers: 0..21 = א..ת, 22 = A):
${JSON.stringify(safeInitial)}

Final state R(23):
${JSON.stringify(safeFinal)}

Trace (capped to first 200 steps):
${JSON.stringify(safeTrace)}

User question (if provided):
${safeQuestion || "(no specific question; give a general reflection)"}

Please:
1. Describe what stands out about this run (letters used, motion of A, global changes).
2. Offer a symbolic reading that a spiritually curious but non-expert person could understand.
3. Emphasize that this is a reflection on patterns, not a prophecy or instruction.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.5,
        max_tokens: 700
      })
    });

    if (!response.ok) {
      const txt = await response.text();
      console.error("OpenAI error:", response.status, txt);
      return {
        statusCode: 500,
        body: "OpenAI error: " + txt
      };
    }

    const data = await response.json();
    const answer =
      data.choices &&
      data.choices[0] &&
      data.choices[0].message &&
      data.choices[0].message.content;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answer: answer || "" })
    };
  } catch (err) {
    console.error("ivritcode-gpt handler error:", err);
    return {
      statusCode: 500,
      body: "Server error"
    };
  }
};
