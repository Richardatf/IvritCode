// src/ivrit/ramchalDemo.ts
import { assemble } from "../assembler.js";
import { runRamchal, type Soul } from "../vm.js";

const DEMO_SRC = `
; soul 1 does a mitzvah at clarity 0.6
PUSH 1
PUSH 0.6
MITZVAH
TICK

; same soul does an aveirah at clarity 0.6
PUSH 1
PUSH 0.6
AVEIRAH
TICK

HALT
`;

export function runRamchalDemo() {
  const program = assemble(DEMO_SRC);

  const initialSouls: Soul[] = [
    { id: "1", freeWillLevel: 0.8, clarity: 0.5, merit: 0, debt: 0 },
  ];

  const result = runRamchal(program, {
    trace: true,
    initialSouls,
  });

  console.log("WORLD:", result.world);
  console.log("SOUL 1:", result.souls["1"]);
  console.log("OUT:", result.out);

  return result;
}
