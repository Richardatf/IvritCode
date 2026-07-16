// src/round.ts
// Toy Poseidon-ish rounds for IvritCode prototype.

import { add, mul, sbox5, mod } from "./field";

// ---- 3-word mini-round: used for Aleph hidden update ----
// State: [C, H, Z]
// "inputWord" lets us inject PC + programCommit, etc.

export type MiniState3 = [number, number, number];

export function miniRound3(state: MiniState3, inputWord: number): MiniState3 {
  const [c, h, z] = state;

  // Round constants (toy; hard-coded)
  const k0 = 17;
  const k1 = 101;
  const k2 = 313;

  // 1) add constants + input
  const u0 = add(c, add(k0, inputWord));
  const u1 = add(h, k1);
  const u2 = add(z, k2);

  // 2) nonlinearity x^5 on all three
  const v0 = sbox5(u0);
  const v1 = sbox5(u1);
  const v2 = sbox5(u2);

  // 3) 3x3 "MDS-like" linear mix (toy)
  // M = [[1,1,1],[1,2,3],[1,3,5]]
  const y0 = mod(v0 + v1 + v2);
  const y1 = mod(v0 + 2 * v1 + 3 * v2);
  const y2 = mod(v0 + 3 * v1 + 5 * v2);

  return [y0, y1, y2];
}

// ---- 5-word round: used as סבב (full round) ----
// State: [R0, R1, R2, R3, C]

export type State5 = [number, number, number, number, number];

export function round5(state: State5, roundIndex: number): State5 {
  const [r0, r1, r2, r3, c] = state;

  // Simple per-round constants derived from roundIndex (toy)
  const k0 = roundIndex + 11;
  const k1 = roundIndex * 3 + 7;
  const k2 = roundIndex * 5 + 13;
  const k3 = roundIndex * 7 + 19;
  const k4 = roundIndex * 11 + 23;

  // 1) add constants
  const u0 = add(r0, k0);
  const u1 = add(r1, k1);
  const u2 = add(r2, k2);
  const u3 = add(r3, k3);
  const u4 = add(c,  k4);

  // 2) nonlinearity: apply on a subset, e.g. r0, r1, C
  const v0 = sbox5(u0);
  const v1 = sbox5(u1);
  const v2 = u2;
  const v3 = u3;
  const v4 = sbox5(u4);

  // 3) 5x5 "MDS-like" linear mix.
  // Toy matrix, just to get diffusion; not real MDS, but structurally similar.
  //
  // M =
  // [1,1,1,1,1]
  // [1,2,3,4,5]
  // [1,3,5,7,9]
  // [1,4,7,10,13]
  // [1,5,9,13,17]

  const y0 = mod(v0 + v1 + v2 + v3 + v4);
  const y1 = mod(
    v0 +
    2 * v1 +
    3 * v2 +
    4 * v3 +
    5 * v4
  );
  const y2 = mod(
    v0 +
    3 * v1 +
    5 * v2 +
    7 * v3 +
    9 * v4
  );
  const y3 = mod(
    v0 +
    4 * v1 +
    7 * v2 +
    10 * v3 +
    13 * v4
  );
  const y4 = mod(
    v0 +
    5 * v1 +
    9 * v2 +
    13 * v3 +
    17 * v4
  );

  return [y0, y1, y2, y3, y4];
}
