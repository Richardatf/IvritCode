# IvritCode Te'amim Control Model

Status: DESIGN DRAFT 0.1

## Principle

IvritCode treats Masoretic cantillation as a structural inspiration for computational control syntax, not as evidence that the Masoretes intended executable semantics.

Traditional and machine meanings MUST remain separately addressable.

The core analogy is:

- canonical LETTER = operation
- NIQQUD = local operation parameter / mode
- ARTICULATION = phonemic or execution qualifier
- TE'AM = structural relationship / control-flow modifier
- SCRIPT = presentation layer
- PROVENANCE = evidence layer
- ALEPH OLAM = meta/system state above the stack

## Why te'amim map naturally to control structure

The accents are not merely melody signs. In the Masoretic reading systems they also divide and join textual units. A computational model can therefore derive an analogous hierarchy from two broad classes:

- DISJUNCTIVE: closes or separates a unit at some strength.
- CONJUNCTIVE: binds a unit forward to what follows.

This is an analogy based on structural function. It is never to be presented as the historical meaning of the accent.

## Machine semantic vocabulary

IvritCode initially uses a small semantic vocabulary instead of assigning arbitrary opcodes to every mark.

### Boundary operations

- `TERMINATE_SEQUENCE` — strongest sequence boundary.
- `CLOSE_MAJOR_GROUP` — close a major nested group.
- `CLOSE_GROUP` — close the current group.
- `CLOSE_MINOR_GROUP` — close a subordinate group.
- `SEPARATE` — weak separation while retaining parent context.

### Binding operations

- `BIND_NEXT` — bind current operation to the following operation.
- `BIND_STRONG_NEXT` — bind tightly to the following operation/group.
- `CHAIN_NEXT` — continue a multi-operation phrase without closing context.

### Flow metadata

Every computational ta'am may carry:

- `class`: `DISJUNCTIVE`, `CONJUNCTIVE`, or `SPECIAL`
- `strength`: integer where larger means a stronger structural boundary
- `scope`: `TOKEN`, `PHRASE`, `GROUP`, `SEQUENCE`
- `machine_action`: one of the vocabulary above
- `historical_note`: traditional structural description
- `mapping_status`: `DRAFT`, `REVIEWED`, `STABLE`

## Initial prose-system mapping

The first implementation focuses on the common prose accent system. Psalms, Proverbs, and Job use a distinct accentual system and MUST receive a separate mapping rather than being forced into this table.

### Strong disjunctives

| Ta'am | Structural role | IvritCode draft action | Strength |
|---|---|---|---:|
| Silluq / Sof Pasuq context | terminal division | `TERMINATE_SEQUENCE` | 100 |
| Etnahta | principal internal division | `CLOSE_MAJOR_GROUP` | 90 |
| Segol | major disjunction | `CLOSE_GROUP` | 80 |
| Shalshelet | major/special disjunction | `CLOSE_GROUP` | 80 |
| Zaqef Qatan | major disjunction | `CLOSE_GROUP` | 75 |
| Zaqef Gadol | major disjunction | `CLOSE_GROUP` | 75 |
| Tipeha | subordinate disjunction | `CLOSE_MINOR_GROUP` | 60 |
| Revia | subordinate disjunction | `CLOSE_MINOR_GROUP` | 55 |
| Zarqa | subordinate disjunction | `CLOSE_MINOR_GROUP` | 50 |
| Pashta | subordinate disjunction | `CLOSE_MINOR_GROUP` | 50 |
| Yetiv | subordinate disjunction | `CLOSE_MINOR_GROUP` | 50 |
| Tevir | subordinate disjunction | `SEPARATE` | 45 |
| Geresh family | lesser disjunction | `SEPARATE` | 40 |
| Pazer / Telisha Gedola / Qarney Para | lesser or special disjunction | `SEPARATE` | 35 |

### Conjunctives

| Ta'am | Structural role | IvritCode draft action |
|---|---|---|
| Munah | conjunctive | `BIND_NEXT` |
| Mahapakh | conjunctive | `BIND_NEXT` |
| Merkha | conjunctive | `BIND_NEXT` |
| Merkha Kefula | conjunctive | `BIND_STRONG_NEXT` |
| Darga | conjunctive | `CHAIN_NEXT` |
| Qadma | conjunctive | `CHAIN_NEXT` |
| Telisha Qetana | conjunctive | `BIND_NEXT` |
| Yerah Ben Yomo | conjunctive | `BIND_NEXT` |

The exact traditional hierarchy is contextual: an accent's behavior depends on its phrase and on the disjunctive it serves. Therefore `strength` is a compiler aid, not a claim that the Masoretic system is a flat numeric precedence table.

## Parser model

A sequence is parsed in layers:

1. Normalize each written letter to its canonical `IVC:LETTER:*` identity.
2. Attach niqqud and articulation modifiers to their host letter.
3. Attach each ta'am to its host token.
4. Classify the ta'am as conjunctive/disjunctive/special in the selected accentual system.
5. Build a phrase tree from the strongest applicable divisions downward.
6. Compile the phrase tree into IvritCode control groups.
7. Only then lower canonical letter operations and modifiers toward QEC/OpenQASM semantics.

This means cantillation can shape control structure without changing the historical text or canonical letter identity.

## Example

Conceptual source:

`A + MUNAH   B + ETNACHTA   C + MERKHA   D + TERMINAL`

Computational interpretation:

`GROUP( BIND(A,B) ) ; GROUP( BIND(C,D) ) ; END`

The marks remain independently renderable as Masoretic overlays while the compiler consumes their structural metadata.

## Scholarly guardrails

1. Never describe an IvritCode machine action as the historical meaning of a ta'am.
2. Preserve original Masoretic terminology and Unicode separately from machine metadata.
3. Preserve alternate traditions and accentual systems rather than collapsing them.
4. Keep the prose system separate from the poetic system of Psalms, Proverbs, and Job.
5. Ancient-script displays using te'amim MUST be labeled analytical/Masoretic overlays unless the source artifact actually contains those marks.
6. Musical realization is tradition-dependent and is not encoded by the machine action.

## Next compiler milestone

Implement a `TaamControlProfile` registry and a phrase-tree parser that consumes a sequence of Letter Stacks. The parser should emit a neutral IvritCode intermediate representation before any QEC or OpenQASM lowering occurs.
