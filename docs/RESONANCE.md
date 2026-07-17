# IvritCode Resonance

IvritCode Resonance is a deterministic symbolic interpretation layer. It translates base-22 register values back into Hebrew letters and describes the resulting relationships using a project-defined archetype vocabulary. It is an invitation to reflection, not prophecy, theology, or religious authority.

## Alphabet State

The beginner experience starts with visible registers `R[i] = i` for `i = 0..21`. Aleph Olam, the Hidden Key, starts at the sum of the program letters' one-based alphabet positions modulo 22. Zero State and explicit seeded states remain available in Advanced Settings.

## Pattern thresholds

Shapes are selected deterministically in this order:

1. `STILL_POINT`: at most 3 registers differ from their source letters.
2. `SPIRAL`: at least 75% of registers match one non-zero circular rotation.
3. `FULL_SPECTRUM`: all 22 target letters appear exactly once.
4. `MIRROR`: at least 5 of 11 opposite pairs match or complement to 21.
5. `RETURN`: at least 8 registers return to their source letters.
6. `CHORUS`: one target occurs at least 4 times, or at most 7 distinct targets remain.
7. `FLAME`: mean circular movement is at least 7 and dispersion is at least 65%.
8. `OPEN_FIELD`: no stronger condition applies.

Summaries are assembled only from computed dominant targets, returns, gates, symmetry, rotation, and dispersion.
