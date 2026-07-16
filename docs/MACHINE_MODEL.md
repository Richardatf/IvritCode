# Machine model

IvritCode is a deterministic register machine with exactly 23 immutable numeric registers. Registers 0–21 map to `א–ת`; register 22 is Aleph Olam. Values normalize into Z₂₂ after every operation. Execution context metadata is separate from the numeric vector. The engine has no host-operation instructions.
