# SAP-1 Simulator

**Live demo:** https://sap1-group9.vercel.app

A web-based simulator of Malvino's **SAP-1 (Simple-As-Possible 1)** computer, built by **Group 9** for the
CPE 402 Computer Architecture and Organization final project. It runs in the browser and shows the
registers, the W-bus, RAM, the T-states and an 8-LED output display while a program executes through the
fetch-decode-execute cycle.

The initial program structure and simulator logic were generated with AI assistance (Claude), then reviewed, tested, and extended by the group (theme, layout, input, features).

## Features

| Requirement | Where it is |
| --- | --- |
| Register panels: PC, MAR, IR, A, B, Output (binary + hex, live) | **Registers & W-Bus** panel |
| RAM viewer, 16 addresses with contents, accessed address highlighted | **Memory** table (columns ADDR, MEANING, BINARY, HEX). MAR row = amber, RAM-read row = teal, `PC` tag marks the next fetch |
| Visual W-bus showing data movement | Central bus with animated flow. The source box is teal (`-> BUS`), the destination amber (`<- BUS`); the banner shows the bus value and `SOURCE -> DEST` |
| 8 LEDs for the Output Register | **Output (8 LEDs)** panel, with binary, hex and decimal readout |
| Load program, Step, Run, Reset | **Load Program** and **Controls** panels |
| Fetch-decode-execute cycle | A line under the bus banner names the current T-state, e.g. `T3 (fetch): RAM[0H] = 09H -> W-bus -> IR` |
| Adder/Subtractor with 2's complement | The sigma box shows `A + B (Su=0)` or `A - B (Su=1)` |
| Step-by-step explanation | **What's happening** panel: current instruction, T1-T6 timeline, a plain-language explanation of the step (with the real values), the active control signals, and a log of every step |
| Adjustable clock speed (optional) | **Clock Speed** slider, 1-10 T-states per second |
| Micro-Step | Advances one T-state at a time so every bus transfer can be inspected |
| Responsive layout | On a desktop or fullscreen window (1100px+ wide) everything fits the screen without page scrolling: Memory and Clock Speed on the left, Registers & W-Bus and LEDs in the middle, the explanation panel in a tall column on the right. On phones the Controls stay pinned to the top with the registers and LEDs right below them |
| Help | **Help** button in the header opens a manual (Esc or Close to dismiss) |

### Instruction set

| Instruction | Opcode | Function |
| --- | --- | --- |
| LDA | 0000 | Load accumulator from memory |
| ADD | 0001 | Add memory value to accumulator |
| SUB | 0010 | Subtract memory value from accumulator |
| OUT | 1110 | Output accumulator |
| HLT | 1111 | Halt |

Every instruction takes six T-states: **T1-T3 fetch** (`PC -> MAR`, `PC++`, `RAM -> IR`) and **T4-T6 execute**.

### Entering a formula

Nothing is hard-coded: the user builds the formula in the **Load Program** panel.

- **2 to 5 values**, each 1-2 hex digits (`00`-`FF`). Characters other than `0-9` and `A-F` are rejected as you type.
  Use **+ Add number** and **x** to change how many values there are.
- A **+ / -** dropdown before every value after the first.
- **Data starts at**: a dropdown that lists only the addresses where the data fits without overlapping the program
  (with n values: `n+2` up to `16-n`, e.g. 5H-DH for three values).
- A live preview such as `25H + 05H - 23H = 07H`.
- **Range check**: if the running total would go below `00H` or above `FFH` at any step, a message explains why and
  **Load Program** stays disabled, so the output is never a wrapped value.

The first value becomes `LDA`, each later value becomes `ADD` or `SUB`, followed by `OUT` and `HLT`. After a run, the
panel compares the output with the expected result.

Example formulas used for the demonstration:

| Formula | Data starts at | Program | Result |
| --- | --- | --- | --- |
| `25H + 05H - 23H` | 9H | `LDA 9H / ADD AH / SUB BH / OUT / HLT` | `07H` (`0000 0111`) |
| `21H - 02H + 0AH` | 8H | `LDA 8H / SUB 9H / ADD AH / OUT / HLT` | `29H` |
| `10H + 20H - 05H + 01H` | CH | `LDA CH / ADD DH / SUB EH / ADD FH / OUT / HLT` | `2CH` |

### How to use

1. Type the values, choose `+` or `-` between them, pick the data address, then press **Load Program**.
2. **Step** runs one whole instruction (T1-T6), animated one T-state at a time.
3. **Micro-Step** advances a single T-state.
4. **Run** executes until `HLT`; **Pause** stops it. Use the **Clock Speed** slider to speed up or slow down.
5. **Reset** clears all registers and RAM. Load a program again to continue.

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
    cpu.ts            # CPU model: registers, RAM, ALU, controller, tick() per T-state (no UI code)
    programs.ts       # expression -> machine code, safe address range, range check, hex input rules
    explain.ts        # plain-language explanation of each T-state (used by the info panel)
    cpu.test.ts       # unit tests: instruction cycle, expressions, input rules
    explain.test.ts   # unit tests for the step explanations
  hooks/
    useSimulator.ts   # clock, Step / Micro-Step / Run / Pause / Reset, clock speed, step history
  components/
    ProgramLoader.tsx # formula builder
    Controls.tsx      # Step, Micro-Step, Run/Pause, Reset, status
    ClockSpeed.tsx    # speed slider
    BlockDiagram.tsx  # registers on both sides of the W-bus
    RegisterBox.tsx   # one register panel
    MemoryTable.tsx   # 16 x 8 RAM viewer
    LedRow.tsx        # 8 output LEDs
    StepInfo.tsx      # "What's happening" panel + step log
    HelpManual.tsx    # help dialog
  App.tsx, main.tsx, styles.css
```

The logic (`src/sap1`) is completely separate from the interface (`src/components`). The CPU is an
immutable state plus a pure `tick(state)` function, so it is easy to test and the UI simply renders whatever
the last tick did.

## Design notes

- Subtraction is implemented as `A + (~B + 1)` on 8 bits (2's complement). The CPU wraps at 8 bits like real
  hardware (`01H + 02H + 03H - 0AH` would give `FCH`, i.e. -4), but the loader refuses such inputs so the
  displayed output is always a clean `00H`-`FFH` value.
- The unused operand nibble of `OUT` and `HLT` is filled with `1111`, as in the Unit 2 slides.
- T-states follow Malvino's SAP-1 microprogram (T1 `Ep Lm`, T2 `Cp`, T3 `CE Li`, then the execute steps).
- A program without `HLT` is stopped after 256 instructions, and an illegal opcode halts the machine with an error.
- `.gitattributes` normalises line endings so teammates on Windows and macOS/Linux get clean diffs.

## Team

| Member | Role |
| --- | --- |
| Glorioso, Gabrielle DC. | Repository setup, integration and Layout & Logic |
| Silvestre, Jan Dillinger DL. | GUI / Visualisation|
| Roxas, Joseph Louis E. | Help Manual |
| Fabian, Gabriel Carlos G. | Testing |
| Alterado, Baron Jordan A. | Demo recording |
