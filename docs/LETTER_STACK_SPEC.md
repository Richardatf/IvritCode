# IvritCode Letter Stack Specification

Status: Draft 0.1

## Principle

A Hebrew letter is a canonical computational identity. A glyph is one historically situated representation of that identity. Vocalization and cantillation are independent semantic overlays, not properties of the ancient glyph.

## Stack

An IvritCode letter stack is evaluated as:

1. **LETTER** — canonical identity and base machine operation.
2. **NIQQUD** — vocalization metadata and optional operation parameter.
3. **ARTICULATION** — dagesh, shin/sin distinction, and related phonemic modifiers.
4. **TE'AMIM** — cantillation metadata and optional structural/control modifier.
5. **SCRIPT** — presentation only; it must not silently change machine semantics.
6. **PROVENANCE** — evidence describing the historical representation and any analytical overlays.

`ALEPH_OLAM` remains a meta-state above the stack. It is not a twenty-third historical Hebrew letter.

## Historical integrity

Ancient inscriptions must distinguish the artifact from later analysis.

- `ORIGINAL`: only marks actually attested on the artifact.
- `NORMALIZED`: canonical Hebrew letter identities.
- `VOCALIZED`: an explicitly labeled later/scholarly vocalization overlay.
- `CANTILLATED`: an explicitly labeled later/Masoretic cantillation overlay.
- `COMPUTATIONAL`: IvritCode meanings assigned to letters and modifiers.

Tiberian niqqud or te'amim displayed with Paleo-Hebrew, Phoenician, Proto-Canaanite, Proto-Sinaitic, or other earlier scripts are **overlays**. Their display must never imply that those marks occur on the source inscription.

## Script layer

The registry should prefer real, named historical script traditions and source-aware glyph variants. Broad labels such as `PROTO` are insufficient when a more precise classification is available. The fictional Recovered script from *It Is Not AI* is outside the IvritCode historical registry.

Target script families include:

- Modern/Square Hebrew
- Imperial/related Aramaic traditions where relevant
- Paleo-Hebrew
- Phoenician
- Proto-Canaanite / Early Alphabetic
- Proto-Sinaitic, where scholarly identification is sufficiently supported

A representation may contain multiple attested glyph variants keyed to provenance, for example an Aleph form associated with a specific inscription, site, date range, corpus, or scholarly source.

## Overlay object

A stack may be serialized independently of its rendered glyph:

```json
{
  "letter": "IVC:LETTER:ALEPH",
  "script": "IVC:SCRIPT:PALEO_HEBREW",
  "niqqud": ["IVC:NIQQUD:PATAH"],
  "articulation": [],
  "teamim": ["IVC:TAAM:ETNACHTA"],
  "display": {
    "niqqud_mode": "TIBERIAN_OVERLAY",
    "teamim_mode": "MASORETIC_OVERLAY"
  },
  "provenance": {
    "glyph_source": null,
    "vocalization_source": null,
    "cantillation_source": null
  }
}
```

## Rendering

Renderers must treat overlays as independently positioned graphical layers. Do not depend on Unicode combining-mark placement over non-Hebrew historical-script code points. Web renderers may use layered HTML/SVG; Unity renderers may use separate positioned text/vector objects.

Conceptually:

```text
       TE'AMIM LAYER
       NIQQUD LAYER
    ARTICULATION LAYER
        GLYPH LAYER
      PROVENANCE DATA
```

## Machine semantics

The default semantic model is:

- `LETTER` = base operation
- `NIQQUD` = parameter/modifier
- `ARTICULATION` = phonemic/operation modifier
- `TE'AMIM` = structural, grouping, timing, scope, flow, or control modifier
- `SCRIPT` = representation only
- `PROVENANCE` = evidence only

Specific machine meanings must be defined in separate registries/specifications. Historical linguistic meanings and IvritCode computational meanings must never be conflated.

## Design rule

**Read the past. Learn the language. Build the future.**

The same canonical data should support inscription reading, language education, historical script exploration, Unity visualization, IvritCode compilation, QEC mapping, and OpenQASM generation without rewriting the underlying letter identity.