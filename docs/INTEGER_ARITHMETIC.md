# QEC integer arithmetic

The experimental `ivritcode-0.1` compiler supports these existing constitutional
opcode mappings with the hiriq integer modifier:

| Source       | IR             | Effect              |
| ------------ | -------------- | ------------------- |
| `יִ $r1, 5`  | `add_int`      | `r1 = int(r1) + 5`  |
| `כִ $r1, 3`  | `subtract_int` | `r1 = int(r1) - 3`  |
| `לִ $r1, -2` | `multiply_int` | `r1 = int(r1) * -2` |

Registers range from `$r1` through `$r22`. Final Kaf (`ך`) normalizes to Kaf
(`כ`). Uninitialized registers start at zero; finite numeric inputs are truncated
toward zero before each operation. Literals, truncated inputs, and results must be
safe integers in the range `-(2^53 - 1)` through `2^53 - 1`. Invalid operands fail
compiler verification; unsafe inputs and arithmetic overflow raise
`ArithmeticError` in the sandbox. No partial result is returned after failure.

For example:

```ivritcode
יִ $r10, 8
כִ $r10, 3
לִ $r10, -2
```

With `r10` initially zero, the result is `-10` in three metered steps. Run this
source through the existing QEC playground or the `runQEC` API. The original
letter-only Observatory VM and its CLI use their own existing semantics.

Both the TypeScript Python representation and the Python AST bridge emit the
matching `Add`, `Sub`, or `Mult` node. Generated Python is inspectable output and
is never executed by the playground. Python itself has arbitrary precision
integers, so separately executing generated source does not enforce the sandbox's
safe-integer result limit.

Other opcode/modifier combinations remain serialized legacy instructions and
produce sandbox warnings rather than executing. Division, control flow, and
additional typed modes remain future work. Manifest verification, capability
denial, step budgets, and provenance tracing still apply to arithmetic programs.
