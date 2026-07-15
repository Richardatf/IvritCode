// src/field.ts
// Simple finite-field helpers for IvritCode proto.
// NOTE: this is a toy 31-bit prime field, NOT production crypto.

export const P = 2147483647; // 2^31 - 1, fits in safe JS number range.

export function mod(x: number): number {
  let r = x % P;
  if (r < 0) r += P;
  return r;
}

export function add(a: number, b: number): number {
  return mod(a + b);
}

export function sub(a: number, b: number): number {
  return mod(a - b);
}

export function mul(a: number, b: number): number {
  return mod(a * b);
}

export function powMod(base: number, exp: number): number {
  let result = 1;
  let b = mod(base);
  let e = exp >>> 0; // ensure non-negative 32-bit
  while (e > 0) {
    if (e & 1) result = mul(result, b);
    b = mul(b, b);
    e >>>= 1;
  }
  return result;
}

// S-box exponent x^5 (Poseidon-style)
export function sbox5(x: number): number {
  return powMod(x, 5);
}
