import { Lexer } from "./lexer";
import { Parser } from "./parser";
import { Evaluator } from "./evaluator";
import type { EvaluatorOptions } from "./evaluator";
import type { TraceEvent } from "./trace";

export * from "./tokens";
export * from "./ast";
export * from "./lexer";
export * from "./parser";
export * from "./trace";
export * from "./evaluator";

export interface InterpreterResult {
  trace: TraceEvent[];
  error?: string;
}

export function runInterpreter(source: string, options?: EvaluatorOptions): InterpreterResult {
  try {
    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();
    const parser = new Parser(tokens);
    const ast = parser.parse();
    const evaluator = new Evaluator(ast, options);
    const trace = evaluator.run(options);

    const lastEvent = trace[trace.length - 1];
    if (lastEvent && lastEvent.type === "ERROR") {
      return { trace, error: lastEvent.message };
    }

    return { trace };
  } catch (err: any) {
    const errorMessage = err?.message || String(err);
    const errorEvent: TraceEvent = {
      index: 0,
      type: "ERROR",
      line: 1,
      stack: [],
      output: "",
      message: errorMessage,
      treeNodes: [],
    };
    return {
      trace: [errorEvent],
      error: errorMessage,
    };
  }
}
