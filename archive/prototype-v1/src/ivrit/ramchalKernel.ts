// src/ivrit/ramchalKernel.ts

// -------------- Core Types (Ramchal language) --------------

export type Stage = "OlamHaZeh" | "YemotHaMashiach" | "OlamHaBa";

export interface Soul {
  id: string;
  freeWillLevel: number;   // 0–1
  clarity: number;         // 0–1
  merit: number;
  debt: number;
}

export interface WorldState {
  light: number;           // revealed good
  concealment: number;     // hiddenness
  stage: Stage;
  tick: number;
}

export interface ChoiceEvent {
  soulId: string;
  action: "mitzvah" | "aveirah" | "neutral";
  clarityAtChoice: number; // what the soul *saw* at the moment
}

export interface JudgmentResult {
  deltaMerit: number;
  deltaDebt: number;
  deltaClarity: number;
  deltaLight: number;
  deltaConcealment: number;
}

// -------------- Ramchal Rules --------------

/**
 * Bechira rule:
 * We only judge if clarity is in the "free will window".
 * Too zero → no responsibility. Too 1 → almost no nisayon.
 */
export function isBechiraZone(clarity: number): boolean {
  return clarity >= 0.25 && clarity <= 0.85;
}

/**
 * Reward / Ones hand-off:
 * Turn a choice into a proposed set of deltas.
 * (Numbers are placeholders – you can tune the model later.)
 */
export function judgeChoice(ev: ChoiceEvent): JudgmentResult {
  if (!isBechiraZone(ev.clarityAtChoice)) {
    // No true bechira → no judgment
    return {
      deltaMerit: 0,
      deltaDebt: 0,
      deltaClarity: 0,
      deltaLight: 0,
      deltaConcealment: 0,
    };
  }

  switch (ev.action) {
    case "mitzvah":
      return {
        deltaMerit: +1,
        deltaDebt: 0,
        deltaClarity: +0.05,
        deltaLight: +0.1,
        deltaConcealment: -0.02,
      };
    case "aveirah":
      return {
        deltaMerit: 0,
        deltaDebt: +1,
        deltaClarity: -0.05,
        deltaLight: -0.05,
        deltaConcealment: +0.1,
      };
    default:
      return {
        deltaMerit: 0,
        deltaDebt: 0,
        deltaClarity: 0,
        deltaLight: 0,
        deltaConcealment: 0,
      };
  }
}

/**
 * Apply judgment to a soul + world.
 * Ramchal: punishment is for tikkun, not revenge – so we work on clarity & concealment.
 */
export function applyJudgment(
  soul: Soul,
  world: WorldState,
  res: JudgmentResult
): { soul: Soul; world: WorldState } {
  const updatedSoul: Soul = {
    ...soul,
    merit: soul.merit + res.deltaMerit,
    debt: soul.debt + res.deltaDebt,
    clarity: clamp01(soul.clarity + res.deltaClarity),
  };

  const updatedWorld: WorldState = {
    ...world,
    light: world.light + res.deltaLight,
    concealment: Math.max(0, world.concealment + res.deltaConcealment),
  };

  return { soul: updatedSoul, world: updatedWorld };
}

/**
 * History tick: hashgacha cycle + stage progression
 */
export function advanceHistory(world: WorldState): WorldState {
  const nextTick = world.tick + 1;
  let nextStage = world.stage;

  if (world.light > 100 && world.stage === "OlamHaZeh") {
    nextStage = "YemotHaMashiach";
  }
  if (world.light > 1000 && world.stage === "YemotHaMashiach") {
    nextStage = "OlamHaBa";
  }

  return {
    ...world,
    tick: nextTick,
    stage: nextStage,
  };
}

// -------------- Helpers --------------

function clamp01(x: number): number {
  if (x < 0) return 0;
  if (x > 1) return 1;
  return x;
}
