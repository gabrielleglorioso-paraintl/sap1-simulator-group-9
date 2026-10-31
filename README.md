# SAP-1 Simulator

A web-based simulator of Malvino's **SAP-1 (Simple-As-Possible 1)** computer, built for the
CPE 402 Computer Architecture and Organization final project. It runs in the browser and shows the
registers, the W-bus, RAM, the controller-sequencer and an 8-LED output display while a program executes
through the fetch-decode-execute cycle.

## Features

| Requirement | Where it is |
| --- | --- |
| Register panels: PC, MAR, IR, A, B, Output (binary + hex, live) | **Registers & W-Bus** panel |
| RAM viewer, 16 addresses with contents, accessed address highlighted | **Memory** panel (MAR row = amber, RAM-read row = green, PC marker) |
| Visual W-bus showing data movement | Animated central bus; source box glows green (`-> BUS`), destination amber (`<- BUS`); banner shows value and `SOURCE -> DEST` |
| 8 LEDs for the Output Register | **Binary Output** panel (with binary and hex readout) |
| Load program, Step, Run, Reset | **Load Program** and **Controls** panels |
| Fetch-decode-execute cycle | A line under the bus banner names the current T-state, e.g. `T3 (fetch): RAM[0H] = 09H -> W-bus -> IR` |
| Adder/Subtractor with 2's complement | The sigma box shows `A + B (Su=0)` or `A - B (Su=1)` |

### Instruction set

| Instruction | Opcode | Function |
| --- | --- | --- |
| LDA | 0000 | Load accumulator from memory |
| ADD | 0001 | Add memory value to accumulator |
| SUB | 0010 | Subtract memory value from accumulator |
| OUT | 1110 | Output accumulator |
| HLT | 1111 | Halt |

Every instruction takes six T-states: **T1-T3 fetch** (`PC -> MAR`, `PC++`, `RAM -> IR`) and **T4-T6 execute**.

### The three formulas

The user enters the values (hex, 00-FF); nothing is hard-coded in the program. The pre-filled numbers
are the examples from the Unit 2 slides.

| Formula | Source | Data cells | Default inputs | Result |
| --- | --- | --- | --- | --- |
| `A + B - C` | Sample program | 9H, AH, BH | 25H, 05H, 23H | `07H` |
| `A - B + C` | Example 1 | 8H, 9H, AH | 21H, 02H, 0AH | `29H` |
| `A + B + C - D` | Example 2 | 8H-BH | 01H, 02H, 03H, 0AH | `FCH` (= -4 in 2's complement) |

The loader generates the program for the chosen formula (e.g. `LDA 9H / ADD AH / SUB BH / OUT / HLT`),
shows the listing and machine code, and writes it to RAM. After the run it compares the output with the
expected result.

### How to use

1. Choose a formula and type the values, then press **Load Program into RAM**.
2. **Step** runs one whole instruction (T1-T6), animated one T-state at a time.
3. **Run** executes until `HLT`. **Pause** stops it. **Reset** clears all registers and RAM.

## Install and run

Requires **Node.js 18+** and npm.

```bash
npm install
npm run dev        # development server (http://localhost:5173)
```

Other scripts:

```bash
npm run build      # type-check and build to dist/
npm run preview    # serve the production build
npm test           # run the unit tests (Vitest)
```

## Language and framework

**TypeScript + React (with Vite).**

- **TypeScript**: the CPU is described with precise types (`CpuState`, `Signal`, `BusNode`), so mistakes such as a
  wrong register width or a misspelled control signal are caught at compile time. The 4-bit/8-bit data paths are
  easy to reason about when every value has a clear type.
- **React**: the GUI is a direct function of the machine state (`registers -> panels`). Each hardware block is one small
  component, so the screen can never drift out of sync with the simulated CPU, and the work splits cleanly between
  team members (logic vs. panels).
- **Vite**: instant dev server, one-command build, and built-in test integration (Vitest).

## Project structure

```
src/
  sap1/
    cpu.ts          # CPU model: registers, RAM, ALU, controller, tick() per T-state (no UI code)
    programs.ts     # formula -> machine-code generator, input parsing
    cpu.test.ts     # unit tests for the instruction cycle and the three formulas
  hooks/
    useSimulator.ts # clock, Step / Run / Reset
  components/                           # ProgramLoader, Controls
  App.tsx, main.tsx, styles.css
```

The logic (`src/sap1`) is completely separate from the interface (`src/components`). The CPU is an
immutable state plus a pure `tick(state)` function, so it is easy to test and the UI simply renders whatever
the last tick did.

## Design notes

- Subtraction is implemented as `A + (~B + 1)` on 8 bits (2's complement), and all results wrap at 8 bits.
  `01H + 02H + 03H - 0AH` therefore gives `FCH`, which the signed readout shows as -4.
- The unused operand nibble of `OUT` and `HLT` is filled with `1111`, as in the Unit 2 slides.
- T-states follow Malvino's SAP-1 microprogram (T1 `Ep Lm`, T2 `Cp`, T3 `CE Li`, then the execute steps).
- A program without `HLT` is stopped after 256 instructions, and an illegal opcode halts the machine with an error.

## Team

| Member | Role |
| --- | --- |
| _Name_ | _e.g. CPU logic_ |
| _Name_ | _e.g. GUI / bus visualisation_ |
| _Name_ | _e.g. program loader_ |
| _Name_ | _e.g. testing and documentation_ |
| _Name_ | _e.g. demo recording_ |
