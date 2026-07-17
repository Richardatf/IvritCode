# IvritCode Constitution

IvritCode is an experimental technical language inspired by the layered structure of Hebrew writing. Its mappings are engineering conventions, not claims about sacred, traditional, or religious meaning.

## Non-negotiable rules

1. Preserve original Unicode code points and source spans for diagnostics; normalize to NFC only for semantic comparison.
2. Version every published mapping. Mapping changes require review and a new version.
3. Given identical source, manifest, inputs, and seed, execution is deterministic and replayable.
4. Never use `eval`, `exec`, textual code substitution, unrestricted imports, shell access, filesystem access, or open network access.
5. Compile only through typed Ivrit IR and an allowlisted Python-AST representation. Hosted execution interprets verified IR; it does not execute emitted Python text.
6. External capabilities are denied by default, explicitly declared, least-privilege, previewed, and auditable.
7. Execution is sandboxed and metered by steps, time, memory, output, and capability budgets.
8. Participation and contribution are opt-in; privacy is the default.
9. Provenance, verification, warnings, and unresolved disagreement remain visible.
10. User actions are reversible where feasible. Humans retain authority over sending, publishing, sharing, deployment, and other external effects.
11. Keyboard, screen-reader, high-contrast, reduced-motion, RTL, and mobile use are release requirements.
12. Aleph Olam is reserved metadata in v0.1: disabled, not user-invocable, and incapable of granting authority or silently changing execution.
