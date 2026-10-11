import { describe, it, expect } from "vitest";
import { PRESET_EXAMPLES } from "../src/examples/presets";
import { Lexer } from "../src/interpreter/lexer";
import { Parser } from "../src/interpreter/parser";
import { Evaluator } from "../src/interpreter/evaluator";

describe("Preset Examples Suite", () => {
  it("has a rich library of at least 30 recursion presets", () => {
    expect(PRESET_EXAMPLES.length).toBeGreaterThanOrEqual(30);
  });

  for (const preset of PRESET_EXAMPLES) {
    it(`evaluates preset '${preset.name}' without throwing errors`, () => {
      const lexer = new Lexer(preset.code);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const program = parser.parse();
      const evaluator = new Evaluator(program, { maxSteps: 10000 });
      const trace = evaluator.run({ input: preset.defaultInput });
      expect(trace.length).toBeGreaterThan(0);
      const errorEvent = trace.find((e) => e.type === "ERROR");
      if (errorEvent) {
        throw new Error(`Preset '${preset.name}' produced error: ${errorEvent.message}`);
      }
      expect(errorEvent).toBeUndefined();
    });
  }
});
