import React, { useMemo, useState } from "react";
import { runIvrit } from "../ivrit/ivritRunner";

const DEFAULT = "א ו א ח ב כ ל"; // PUSH 5, PUSH 7, ADD, PRINT, HALT

export default function IvritCodeRunner() {
  const [source, setSource] = useState(DEFAULT);
  const [trace, setTrace] = useState(false);
  const [maxSteps, setMaxSteps] = useState(20000);
  const [output, setOutput] = useState<string>("");
  const [error, setError] = useState<string>("");

  const help = useMemo(() => {
    return [
      "v0 opcodes:",
      "א PUSH <digit> | ב ADD | ג SUB | ד MUL | ה DIV",
      "ו DUP | ז SWAP | ח DROP | ט JMP <digit> | י JZ <digit>",
      "כ PRINT | ל HALT",
      "",
      "Example:",
      "א ו א ח ב כ ל  => 12"
    ].join("\n");
  }, []);

  function onRun() {
    setError("");
    setOutput("");
    try {
      const out = runIvrit(source, { trace, maxSteps });
      setOutput(out);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    }
  }

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: 16 }}>
      <h2 style={{ marginBottom: 8 }}>IvritCode (v0)</h2>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <input type="checkbox" checked={trace} onChange={(e) => setTrace(e.target.checked)} />
          trace
        </label>

        <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
          maxSteps
          <input
            type="number"
            min={100}
            step={100}
            value={maxSteps}
            onChange={(e) => setMaxSteps(Number(e.target.value || 0))}
            style={{ width: 120 }}
          />
        </label>

        <button onClick={onRun} style={{ padding: "8px 14px", cursor: "pointer" }}>
          Run
        </button>
      </div>

      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        spellCheck={false}
        rows={6}
        style={{
          width: "100%",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
          fontSize: 16,
          padding: 12
        }}
      />

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12, marginTop: 12 }}>
        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Output</div>
          <pre style={{ padding: 12, background: "#111", color: "#eee", borderRadius: 8, minHeight: 72 }}>
            {output || "(no output)"}
          </pre>
        </div>

        {error ? (
          <div>
            <div style={{ fontWeight: 700, marginBottom: 6 }}>Error</div>
            <pre style={{ padding: 12, background: "#2a0f0f", color: "#ffd7d7", borderRadius: 8 }}>
              {error}
            </pre>
          </div>
        ) : null}

        <div>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Help</div>
          <pre style={{ padding: 12, background: "#f6f6f6", borderRadius: 8, whiteSpace: "pre-wrap" }}>
            {help}
          </pre>
        </div>
      </div>
    </div>
  );
}
