import type {
  Program,
  FunctionDeclaration,
  VariableDeclaration,
  Statement,
  Expression,
} from "./ast";
import type {
  Frame,
  TraceEvent,
  TreeNodeSnapshot,
  StaticVarInfo,
  GlobalVarInfo,
  VarChange,
} from "./trace";

export function cloneValue<T>(val: T): T {
  if (val === null || val === undefined) return val;
  if (typeof val === "number" || typeof val === "string" || typeof val === "boolean") return val;
  if (Array.isArray(val)) {
    return val.map((item) => cloneValue(item)) as unknown as T;
  }
  if (typeof val === "object") {
    if ((val as any).__iter) return { ...val };
    const res: Record<string, any> = {};
    for (const [k, v] of Object.entries(val)) {
      res[k] = cloneValue(v);
    }
    return res as T;
  }
  return val;
}

class ReturnSignal {
  value: any;
  constructor(value: any) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

interface RefBinding {
  targetFrame: Frame | null;
  name: string;
}

export interface EvaluatorOptions {
  maxDepth?: number;
  maxSteps?: number;
  entryFunction?: string;
  entryArgs?: any[];
  input?: string;
}

export class Evaluator {
  private program: Program;
  private functions: Map<string, FunctionDeclaration> = new Map();
  private globals: Record<string, GlobalVarInfo> = {};
  private staticStorage: Map<string, StaticVarInfo> = new Map();
  private frameConsts: Map<string, Set<string>> = new Map();
  private frameRefBindings: Map<string, Map<string, RefBinding>> = new Map();
  private globalConsts: Set<string> = new Set();
  private callStack: Frame[] = [];
  private trace: TraceEvent[] = [];
  private output = "";
  private stepCount = 0;
  private callCounter = 0;
  private maxDepth: number;
  private maxSteps: number;
  private treeNodes: TreeNodeSnapshot[] = [];
  private frameTreeNodeMap: Map<string, string> = new Map();
  private recentChange?: VarChange;
  private inputTokens: string[] = [];

  constructor(program: Program, options: EvaluatorOptions = {}) {
    this.program = program;
    this.maxDepth = options.maxDepth ?? 1000;
    this.maxSteps = options.maxSteps ?? 25000;
  }

  run(options: EvaluatorOptions = {}): TraceEvent[] {
    this.trace = [];
    this.output = "";
    this.stepCount = 0;
    this.callCounter = 0;
    this.callStack = [];
    this.globals = {};
    this.staticStorage.clear();
    this.frameConsts.clear();
    this.frameRefBindings.clear();
    this.globalConsts.clear();
    this.treeNodes = [];
    this.frameTreeNodeMap.clear();
    this.recentChange = undefined;

    if (options.input) {
      this.inputTokens = options.input.trim().split(/\s+/).filter(Boolean);
    } else {
      this.inputTokens = [];
    }

    try {
      // 1. Register top-level items
      for (const decl of this.program.declarations) {
        if (decl.type === "FunctionDeclaration") {
          const existing = this.functions.get(decl.name);
          if (!existing || existing.body.statements.length === 0) {
            this.functions.set(decl.name, decl);
          }
        } else if (decl.type === "VariableDeclaration") {
          const val = this.getDefaultOrInitValue(decl);

          if (decl.isStatic) {
            this.staticStorage.set(decl.name, {
              name: decl.name,
              value: val,
              varType: decl.varType,
              isConst: decl.isConst,
            });
          }

          this.globals[decl.name] = {
            name: decl.name,
            value: val,
            varType: decl.varType,
            isConst: decl.isConst,
          };

          if (decl.isConst) {
            this.globalConsts.add(decl.name);
          }
        }
      }

      // 2. Identify entry point
      const entryFnName = options.entryFunction || (this.functions.has("main") ? "main" : null);

      if (entryFnName && this.functions.has(entryFnName)) {
        const fn = this.functions.get(entryFnName)!;
        const args = options.entryArgs || [];
        this.executeFunction(fn, args);
      } else if (!entryFnName && this.functions.size > 0) {
        // Pick the first declared function
        const firstFn = Array.from(this.functions.values())[0];
        if (firstFn.params.length === 0) {
          this.executeFunction(firstFn, []);
        } else {
          // Provide sensible default arguments based on parameter types
          const defaultArgs = firstFn.params.map((p) => {
            if (p.paramType === "int" || p.paramType === "long long") return 4;
            if (p.paramType === "bool") return true;
            if (p.paramType === "char") return "A";
            if (p.paramType.startsWith("vector")) return [1, 2, 3];
            if (p.paramType === "string") return "abc";
            return 0;
          });
          this.executeFunction(firstFn, defaultArgs);
        }
      } else {
        throw new Error("No functions found to execute. Please define 'int main()' or a recursive function.");
      }
    } catch (err: any) {
      if (!(err instanceof ReturnSignal)) {
        const line = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1].line : (this.program.line || 1);
        this.recordEvent("ERROR", line, undefined, err.message);
      }
    }

    return this.trace;
  }

  private getDefaultOrInitValue(decl: VariableDeclaration): any {
    if (decl.init) {
      return this.evaluateExpression(decl.init);
    }
    if (decl.isArray) {
      if (decl.arraySize) {
        const size = Number(this.evaluateExpression(decl.arraySize));
        const defaultElem = decl.varType === "bool" ? false : decl.varType === "string" ? "" : decl.varType === "char" ? "\0" : 0;
        return new Array(Math.max(0, size)).fill(defaultElem);
      }
      return [];
    }
    if (decl.varType.startsWith("vector")) {
      return [];
    }
    if (decl.varType.startsWith("pair")) {
      return { first: 0, second: 0 };
    }
    if (decl.varType === "bool") return false;
    if (decl.varType === "char") return "\0";
    if (decl.varType === "string") return "";
    return 0;
  }

  private executeFunction(
    fn: FunctionDeclaration,
    args: any[],
    callerFn?: string,
    callerLine?: number,
    refBindings?: Map<string, RefBinding>
  ): any {
    if (this.callStack.length >= this.maxDepth) {
      throw new Error(`Infinite recursion detected: maximum call depth limit (${this.maxDepth}) exceeded in function '${fn.name}'`);
    }

    this.checkStepLimit(fn.line);

    this.callCounter++;
    const frameId = `frame_${this.callCounter}`;
    const treeNodeId = `node_${this.callCounter}`;
    const parentFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;
    const parentTreeNodeId = parentFrame ? this.frameTreeNodeMap.get(parentFrame.id) || null : null;

    if (args.length !== fn.params.length) {
      throw new Error(`Function '${fn.name}' expects ${fn.params.length} arguments but received ${args.length} on line ${fn.line}`);
    }

    const argsRecord: Record<string, any> = {};
    const constParamSet = new Set<string>();

    for (let i = 0; i < fn.params.length; i++) {
      const p = fn.params[i];
      let val = args[i];
      // If passed by value and is array or object, clone it to mirror C++ pass-by-value semantics
      if (!p.isRef) {
        val = cloneValue(val);
      }
      argsRecord[p.name] = val;
      if (p.isConst) {
        constParamSet.add(p.name);
      }
    }

    this.frameConsts.set(frameId, constParamSet);
    if (refBindings) {
      this.frameRefBindings.set(frameId, refBindings);
    }

    // Collect any static variables known for this function
    const fnStatics: Record<string, any> = {};
    for (const [k, v] of this.staticStorage.entries()) {
      if (v.fnName === fn.name || k.startsWith(`${fn.name}::`)) {
        fnStatics[v.name] = v.value;
      }
    }

    const frame: Frame = {
      id: frameId,
      fn: fn.name,
      args: { ...argsRecord },
      locals: {},
      line: fn.line,
      callerFn,
      callerLine,
      constVars: Array.from(constParamSet),
      staticVars: fnStatics,
    };

    const treeNode: TreeNodeSnapshot = {
      id: treeNodeId,
      parentId: parentTreeNodeId,
      fn: fn.name,
      args: { ...argsRecord },
      status: "active",
      callIndex: this.stepCount,
      depth: this.callStack.length,
      callerFn,
      callerLine,
    };

    this.callStack.push(frame);
    this.treeNodes.push(treeNode);
    this.frameTreeNodeMap.set(frameId, treeNodeId);

    const argsStr = Object.entries(argsRecord)
      .map(([k, v]) => `${k}=${JSON.stringify(v)}`)
      .join(", ");
    const callExplanation = callerFn
      ? `Invoking ${fn.name}(${argsStr}) from ${callerFn} at line ${callerLine}. Pushing frame to stack (depth ${this.callStack.length}).`
      : `Invoking ${fn.name}(${argsStr}) as program entrypoint.`;

    // Emit CALL event
    this.recordEvent("CALL", fn.line, undefined, undefined, "DOWN", {
      explanation: callExplanation,
      callerFn,
      callerLine,
    });

    let returnValue: any = null;
    try {
      this.executeStatement(fn.body);
      // If function is non-void and not main, expect a return
      if (fn.returnType !== "void" && fn.name !== "main") {
        throw new Error(`Missing return statement in non-void function '${fn.name}' (line ${fn.line})`);
      }
    } catch (e) {
      if (e instanceof ReturnSignal) {
        returnValue = e.value;
      } else {
        throw e;
      }
    }

    // Prepare return
    frame.returnValue = returnValue;
    treeNode.returnValue = returnValue;
    treeNode.status = "returned";
    treeNode.returnIndex = this.stepCount + 1;

    const childCallCount = this.treeNodes.filter((t) => t.parentId === treeNodeId).length;
    const isBaseCase = childCallCount === 0 && fn.name !== "main";
    const retStr = returnValue !== undefined ? JSON.stringify(returnValue) : "void";
    const returnExplanation = isBaseCase
      ? `Base case reached in ${fn.name}(${argsStr}): returning ${retStr} directly without recursing.`
      : `${fn.name}(${argsStr}) returned ${retStr} to ${callerFn || "caller"} (at line ${callerLine || frame.line}). Stack unwinds.`;

    // Emit RETURN event
    this.recordEvent("RETURN", frame.line, returnValue, undefined, "UP", {
      explanation: returnExplanation,
      isBaseCase,
      callerFn,
      callerLine,
    });

    this.callStack.pop();
    this.frameTreeNodeMap.delete(frameId);
    this.frameConsts.delete(frameId);
    this.frameRefBindings.delete(frameId);

    return returnValue;
  }

  private executeStatement(stmt: Statement): void {
    this.checkStepLimit(stmt.line);
    this.updateCurrentFrameLine(stmt.line);

    switch (stmt.type) {
      case "BlockStatement":
        for (const s of stmt.statements) {
          this.executeStatement(s);
        }
        break;

      case "VariableDeclaration": {
        const currentFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;

        if (stmt.isStatic) {
          const key = currentFrame ? `${currentFrame.fn}::${stmt.name}` : stmt.name;
          if (!this.staticStorage.has(key)) {
            const initVal = this.getDefaultOrInitValue(stmt);

            this.staticStorage.set(key, {
              name: stmt.name,
              fnName: currentFrame?.fn,
              value: initVal,
              varType: stmt.varType,
              isConst: stmt.isConst,
            });

            this.recentChange = {
              name: stmt.name,
              scope: "static",
              newValue: initVal,
              fnName: currentFrame?.fn,
            };

            this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
              explanation: `Initialized static variable ${stmt.name} = ${JSON.stringify(initVal)} (shared in memory across all recursive calls of ${currentFrame?.fn || "function"}).`,
            });
          } else {
            // Already initialized in earlier invocation
            const existingVal = this.staticStorage.get(key)!.value;
            this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
              explanation: `Static variable ${stmt.name} is already initialized (persisting value ${JSON.stringify(existingVal)} across recursion). Skipped re-declaration.`,
            });
          }
        } else {
          // Standard local or global declaration
          const initVal = this.getDefaultOrInitValue(stmt);

          if (currentFrame && stmt.isConst) {
            const cSet = this.frameConsts.get(currentFrame.id) || new Set();
            cSet.add(stmt.name);
            this.frameConsts.set(currentFrame.id, cSet);
          }

          this.setLocalVariable(stmt.name, initVal);
          this.recentChange = {
            name: stmt.name,
            scope: currentFrame ? "local" : "global",
            newValue: initVal,
            fnName: currentFrame?.fn,
          };

          this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
            explanation: `Declared ${stmt.isConst ? "const " : ""}variable ${stmt.name} = ${JSON.stringify(initVal)}.`,
          });
        }
        break;
      }

      case "CinStatement": {
        for (const target of stmt.targets) {
          let val: any = 0;
          if (this.inputTokens.length > 0) {
            const raw = this.inputTokens.shift()!;
            val = !isNaN(Number(raw)) ? Number(raw) : raw;
          } else {
            // Default input fallback for competitive programming demos
            val = 4;
          }
          this.assignToTarget(target, val, stmt.line);
          const targetName = target.type === "Identifier" ? target.name : "target";
          this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
            explanation: `cin >> ${targetName} received ${JSON.stringify(val)}.`,
          });
        }
        break;
      }

      case "IfStatement": {
        const cond = this.evaluateExpression(stmt.condition);
        const condBool = this.isTruthy(cond);
        const explanation = condBool
          ? `Condition evaluated to TRUE on line ${stmt.line}: entering branch.`
          : `Condition evaluated to FALSE on line ${stmt.line}: skipping branch.`;
        this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, { explanation });
        if (condBool) {
          this.executeStatement(stmt.thenBranch);
        } else if (stmt.elseBranch) {
          this.executeStatement(stmt.elseBranch);
        }
        break;
      }

      case "WhileStatement": {
        while (true) {
          this.checkStepLimit(stmt.line);
          const wCond = this.evaluateExpression(stmt.condition);
          const wBool = this.isTruthy(wCond);
          this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
            explanation: `While condition is ${wBool ? "TRUE" : "FALSE"} on line ${stmt.line}.`,
          });
          if (!wBool) break;

          try {
            this.executeStatement(stmt.body);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) continue;
            throw e;
          }
        }
        break;
      }

      case "ForStatement": {
        if (stmt.init) {
          this.executeStatement(stmt.init as Statement);
        }
        while (true) {
          this.checkStepLimit(stmt.line);
          if (stmt.condition) {
            const fCond = this.evaluateExpression(stmt.condition);
            const fBool = this.isTruthy(fCond);
            this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
              explanation: `For-loop condition is ${fBool ? "TRUE" : "FALSE"} on line ${stmt.line}.`,
            });
            if (!fBool) break;
          } else {
            this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
              explanation: `For-loop step on line ${stmt.line}.`,
            });
          }

          try {
            this.executeStatement(stmt.body);
          } catch (e) {
            if (e instanceof BreakSignal) break;
            if (e instanceof ContinueSignal) {
              if (stmt.update) this.evaluateExpression(stmt.update);
              continue;
            }
            throw e;
          }

          if (stmt.update) {
            this.evaluateExpression(stmt.update);
          }
        }
        break;
      }

      case "BreakStatement":
        this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
          explanation: `Break statement executed on line ${stmt.line}: terminating loop.`,
        });
        throw new BreakSignal();

      case "ContinueStatement":
        this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
          explanation: `Continue statement executed on line ${stmt.line}: jumping to next loop iteration.`,
        });
        throw new ContinueSignal();

      case "ReturnStatement": {
        this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
          explanation: `Executing return on line ${stmt.line}.`,
        });
        let retVal: any = null;
        if (stmt.value) {
          retVal = this.evaluateExpression(stmt.value);
        }
        throw new ReturnSignal(retVal);
      }

      case "CoutStatement": {
        const prevOutLen = this.output.length;
        for (const expr of stmt.values) {
          if (expr.type === "EndlExpression") {
            this.output += "\n";
          } else {
            const val = this.evaluateExpression(expr);
            this.output += String(val);
          }
        }
        const delta = this.output.slice(prevOutLen);
        this.recordEvent("PRINT", stmt.line, undefined, undefined, undefined, {
          explanation: `cout output: "${delta}"`,
        });
        break;
      }

      case "ExpressionStatement": {
        if (stmt.expression.type === "CallExpression") {
          this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
            explanation: `Calling ${stmt.expression.callee}() on line ${stmt.line}.`,
          });
          this.evaluateExpression(stmt.expression);
        } else {
          this.evaluateExpression(stmt.expression);
          const change = this.recentChange;
          const explanation = change
            ? `Updated ${change.name} on line ${stmt.line}.`
            : `Executing statement on line ${stmt.line}.`;
          this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
            explanation,
          });
        }
        break;
      }

      case "EmptyStatement":
        break;
    }
  }

  private evaluateExpression(expr: Expression): any {
    switch (expr.type) {
      case "NumberLiteral":
        return expr.value;

      case "BoolLiteral":
        return expr.value;

      case "CharLiteral":
        return expr.value;

      case "StringLiteral":
        return expr.value;

      case "EndlExpression":
        return "\n";

      case "Identifier":
        return this.getVariable(expr.name, expr.line);

      case "ArrayLiteral":
        return expr.elements.map((el) => this.evaluateExpression(el));

      case "IndexExpression": {
        const obj = this.evaluateExpression(expr.object);
        const idx = this.evaluateExpression(expr.index);
        if (obj === undefined || obj === null) {
          throw new Error(`Cannot index into undefined or null on line ${expr.line}`);
        }
        if (typeof obj === "string") {
          const i = Number(idx);
          if (i < 0 || i >= obj.length) return "";
          return obj[i];
        }
        if (Array.isArray(obj)) {
          const i = Number(idx);
          return obj[i];
        }
        if (typeof obj === "object") {
          return obj[idx];
        }
        throw new Error(`Invalid index target on line ${expr.line}`);
      }

      case "MemberExpression": {
        const obj = this.evaluateExpression(expr.object);
        if (obj === null || obj === undefined) {
          throw new Error(`Cannot access property '${expr.property}' on undefined/null on line ${expr.line}`);
        }
        return obj[expr.property];
      }

      case "MethodCallExpression": {
        const obj = this.evaluateExpression(expr.object);
        const methodName = expr.method;
        const args = expr.args.map((a) => this.evaluateExpression(a));

        if (Array.isArray(obj)) {
          if (methodName === "size" || methodName === "length") {
            return obj.length;
          }
          if (methodName === "empty") {
            return obj.length === 0;
          }
          if (methodName === "push_back" || methodName === "emplace_back") {
            obj.push(cloneValue(args[0]));
            this.recordObjectMutation(expr.object);
            return;
          }
          if (methodName === "pop_back") {
            const popped = obj.pop();
            this.recordObjectMutation(expr.object);
            return popped;
          }
          if (methodName === "back") {
            return obj[obj.length - 1];
          }
          if (methodName === "front") {
            return obj[0];
          }
          if (methodName === "clear") {
            obj.length = 0;
            this.recordObjectMutation(expr.object);
            return;
          }
          if (methodName === "begin") {
            return { __iter: true, obj, idx: 0, expr: expr.object };
          }
          if (methodName === "end") {
            return { __iter: true, obj, idx: obj.length, expr: expr.object };
          }
        }

        if (typeof obj === "string") {
          if (methodName === "size" || methodName === "length") {
            return obj.length;
          }
          if (methodName === "empty") {
            return obj.length === 0;
          }
          if (methodName === "substr") {
            const start = Number(args[0]);
            const len = args[1] !== undefined ? Number(args[1]) : undefined;
            return len !== undefined ? obj.substring(start, start + len) : obj.substring(start);
          }
          if (methodName === "push_back") {
            const newStr = obj + String(args[0]);
            this.assignToTarget(expr.object, newStr, expr.line);
            return;
          }
          if (methodName === "pop_back") {
            const newStr = obj.slice(0, -1);
            this.assignToTarget(expr.object, newStr, expr.line);
            return;
          }
          if (methodName === "back") {
            return obj[obj.length - 1];
          }
          if (methodName === "front") {
            return obj[0];
          }
          if (methodName === "begin") {
            return { __iter: true, obj, idx: 0, isStr: true, expr: expr.object };
          }
          if (methodName === "end") {
            return { __iter: true, obj, idx: obj.length, isStr: true, expr: expr.object };
          }
        }

        throw new Error(`Unsupported method '${methodName}' on line ${expr.line}`);
      }

      case "ConditionalExpression": {
        const cond = this.evaluateExpression(expr.condition);
        return this.isTruthy(cond)
          ? this.evaluateExpression(expr.consequent)
          : this.evaluateExpression(expr.alternate);
      }

      case "BinaryExpression": {
        // Handle logical short-circuit
        if (expr.op === "&&") {
          const left = this.evaluateExpression(expr.left);
          if (!this.isTruthy(left)) return false;
          return this.isTruthy(this.evaluateExpression(expr.right));
        }
        if (expr.op === "||") {
          const left = this.evaluateExpression(expr.left);
          if (this.isTruthy(left)) return true;
          return this.isTruthy(this.evaluateExpression(expr.right));
        }

        const left = this.evaluateExpression(expr.left);
        const right = this.evaluateExpression(expr.right);

        switch (expr.op) {
          case "+":
            return typeof left === "string" || typeof right === "string"
              ? left + right
              : Number(left) + Number(right);
          case "-":
            return Number(left) - Number(right);
          case "*":
            return Number(left) * Number(right);
          case "/":
            if (right === 0) {
              throw new Error(`Division by zero on line ${expr.line}`);
            }
            return Math.trunc(Number(left) / Number(right));
          case "%":
            if (right === 0) {
              throw new Error(`Modulo by zero on line ${expr.line}`);
            }
            return (Number(left) % Number(right)) | 0;
          case "&":
            return (Number(left) & Number(right)) | 0;
          case "|":
            return (Number(left) | Number(right)) | 0;
          case "^":
            return (Number(left) ^ Number(right)) | 0;
          case "<<":
            return (Number(left) << Number(right)) | 0;
          case ">>":
            return (Number(left) >> Number(right)) | 0;
          case "==":
            return left === right;
          case "!=":
            return left !== right;
          case "<":
            return left < right;
          case ">":
            return left > right;
          case "<=":
            return left <= right;
          case ">=":
            return left >= right;
          default:
            throw new Error(`Unsupported binary operator '${expr.op}' on line ${expr.line}`);
        }
      }

      case "UnaryExpression": {
        const val = this.evaluateExpression(expr.argument);
        switch (expr.op) {
          case "!":
            return !this.isTruthy(val);
          case "-":
            return -Number(val);
          case "+":
            return +Number(val);
          case "~":
            return ~Number(val);
          default:
            throw new Error(`Unsupported unary operator '${expr.op}' on line ${expr.line}`);
        }
      }

      case "UpdateExpression": {
        const cur = Number(this.evaluateExpression(expr.argument));
        const updated = expr.op === "++" ? cur + 1 : cur - 1;
        this.assignToTarget(expr.argument, updated, expr.line);
        return expr.prefix ? updated : cur;
      }

      case "AssignmentExpression": {
        const rightVal = this.evaluateExpression(expr.right);
        let finalVal = rightVal;
        if (expr.op !== "=") {
          const curVal = this.evaluateExpression(expr.left);
          switch (expr.op) {
            case "+=":
              finalVal = typeof curVal === "string" || typeof rightVal === "string"
                ? curVal + rightVal
                : Number(curVal) + Number(rightVal);
              break;
            case "-=":
              finalVal = Number(curVal) - Number(rightVal);
              break;
            case "*=":
              finalVal = Number(curVal) * Number(rightVal);
              break;
            case "/=":
              if (rightVal === 0) throw new Error(`Division by zero on line ${expr.line}`);
              finalVal = Math.trunc(Number(curVal) / Number(rightVal));
              break;
            case "%=":
              if (rightVal === 0) throw new Error(`Modulo by zero on line ${expr.line}`);
              finalVal = (Number(curVal) % Number(rightVal)) | 0;
              break;
          }
        }
        this.assignToTarget(expr.left, finalVal, expr.line);
        return finalVal;
      }

      case "CallExpression": {
        const callee = expr.callee;

        // Built-in standard functions
        if (callee === "swap" || callee === "std::swap") {
          if (expr.args.length !== 2) throw new Error(`swap requires 2 arguments on line ${expr.line}`);
          const arg0 = expr.args[0];
          const arg1 = expr.args[1];
          const val0 = this.evaluateExpression(arg0);
          const val1 = this.evaluateExpression(arg1);
          this.assignToTarget(arg0, val1, expr.line);
          this.assignToTarget(arg1, val0, expr.line);
          return;
        }

        if (callee === "max" || callee === "std::max") {
          const a = this.evaluateExpression(expr.args[0]);
          const b = this.evaluateExpression(expr.args[1]);
          return Math.max(a, b);
        }

        if (callee === "min" || callee === "std::min") {
          const a = this.evaluateExpression(expr.args[0]);
          const b = this.evaluateExpression(expr.args[1]);
          return Math.min(a, b);
        }

        if (callee === "abs" || callee === "std::abs") {
          return Math.abs(this.evaluateExpression(expr.args[0]));
        }

        if (callee === "pow" || callee === "std::pow") {
          return Math.pow(this.evaluateExpression(expr.args[0]), this.evaluateExpression(expr.args[1]));
        }

        if (callee === "sqrt" || callee === "std::sqrt") {
          return Math.sqrt(this.evaluateExpression(expr.args[0]));
        }

        if (callee === "floor" || callee === "std::floor") {
          return Math.floor(this.evaluateExpression(expr.args[0]));
        }

        if (callee === "ceil" || callee === "std::ceil") {
          return Math.ceil(this.evaluateExpression(expr.args[0]));
        }

        if (callee === "make_pair" || callee === "std::make_pair") {
          return {
            first: this.evaluateExpression(expr.args[0]),
            second: this.evaluateExpression(expr.args[1]),
          };
        }

        if (callee === "reverse" || callee === "std::reverse") {
          this.executeReverse(expr.args, expr.line);
          return;
        }

        if (callee === "sort" || callee === "std::sort") {
          this.executeSort(expr.args, expr.line);
          return;
        }

        if (callee.startsWith("vector")) {
          const evalArgs = expr.args.map((a) => this.evaluateExpression(a));
          if (evalArgs.length === 0) return [];
          if (evalArgs.length === 1) return new Array(Math.max(0, Number(evalArgs[0]))).fill(0);
          const sz = Math.max(0, Number(evalArgs[0]));
          const fillVal = evalArgs[1];
          return Array.isArray(fillVal)
            ? Array.from({ length: sz }, () => JSON.parse(JSON.stringify(fillVal)))
            : new Array(sz).fill(fillVal);
        }

        if (callee === "string") {
          const evalArgs = expr.args.map((a) => this.evaluateExpression(a));
          if (evalArgs.length === 0) return "";
          if (evalArgs.length === 1) return String(evalArgs[0]);
          return String(evalArgs[1]).repeat(Math.max(0, Number(evalArgs[0])));
        }

        const fn = this.functions.get(expr.callee);
        if (!fn) {
          throw new Error(`Call to unknown function '${expr.callee}' on line ${expr.line}`);
        }

        const callerFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;
        const evaluatedArgs: any[] = [];
        const bindings = new Map<string, RefBinding>();

        for (let i = 0; i < fn.params.length; i++) {
          const param = fn.params[i];
          const argExpr = expr.args[i];
          if (!argExpr) {
            evaluatedArgs.push(0);
            continue;
          }
          const val = this.evaluateExpression(argExpr);
          evaluatedArgs.push(val);

          if (param.isRef && argExpr.type === "Identifier") {
            let targetFrame = callerFrame;
            let targetName = argExpr.name;
            while (targetFrame) {
              const callerBindings = this.frameRefBindings.get(targetFrame.id);
              if (callerBindings && callerBindings.has(targetName)) {
                const parentBinding = callerBindings.get(targetName)!;
                targetFrame = parentBinding.targetFrame;
                targetName = parentBinding.name;
              } else {
                break;
              }
            }
            bindings.set(param.name, {
              targetFrame,
              name: targetName,
            });
          }
        }

        return this.executeFunction(fn, evaluatedArgs, callerFrame?.fn, expr.line, bindings);
      }
    }
  }

  private assignToTarget(target: Expression, value: any, line: number): void {
    const cloned = cloneValue(value);
    if (target.type === "Identifier") {
      this.setVariable(target.name, cloned, line);
    } else if (target.type === "IndexExpression") {
      const obj = this.evaluateExpression(target.object);
      const idx = this.evaluateExpression(target.index);
      const numIdx = Number(idx);

      if (typeof obj === "string") {
        const char = String(cloned).charAt(0) || "";
        const updated = obj.substring(0, numIdx) + char + obj.substring(numIdx + 1);
        this.assignToTarget(target.object, updated, line);
      } else if (Array.isArray(obj)) {
        obj[numIdx] = cloned;
        this.recordObjectMutation(target.object);
      } else if (typeof obj === "object" && obj !== null) {
        obj[idx] = cloned;
        this.recordObjectMutation(target.object);
      } else {
        throw new Error(`Cannot assign to index on line ${line}`);
      }
    } else if (target.type === "MemberExpression") {
      const obj = this.evaluateExpression(target.object);
      if (typeof obj === "object" && obj !== null) {
        obj[target.property] = cloned;
        this.recordObjectMutation(target.object);
      } else {
        throw new Error(`Cannot assign to property '${target.property}' on line ${line}`);
      }
    } else {
      throw new Error(`Invalid assignment target on line ${line}`);
    }
  }

  private recordObjectMutation(target: Expression): void {
    let root = target;
    while (root.type === "IndexExpression" || root.type === "MemberExpression") {
      root = root.object;
    }
    if (root.type === "Identifier") {
      const name = root.name;
      const currentFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;
      let val: any;
      let scope: "local" | "arg" | "static" | "global" = "local";

      if (currentFrame && name in currentFrame.locals) {
        val = currentFrame.locals[name];
        scope = "local";
      } else if (currentFrame && name in currentFrame.args) {
        val = currentFrame.args[name];
        scope = "arg";
      } else if (name in this.globals) {
        val = this.globals[name].value;
        scope = "global";
      }

      this.recentChange = {
        name,
        scope,
        newValue: cloneValue(val),
        fnName: currentFrame?.fn,
      };
    }
  }

  private executeReverse(args: Expression[], line: number): void {
    if (args.length !== 2) throw new Error(`reverse expects 2 arguments on line ${line}`);
    const first = this.evaluateExpression(args[0]);
    const last = this.evaluateExpression(args[1]);

    if (first && first.__iter && last && last.__iter && first.obj === last.obj) {
      const arr = first.obj;
      const start = first.idx;
      const end = last.idx;
      if (Array.isArray(arr)) {
        const slice = arr.slice(start, end).reverse();
        for (let i = 0; i < slice.length; i++) {
          arr[start + i] = slice[i];
        }
        this.recordObjectMutation(first.expr);
      } else if (typeof arr === "string") {
        const reversedSlice = arr.substring(start, end).split("").reverse().join("");
        const newStr = arr.substring(0, start) + reversedSlice + arr.substring(end);
        this.assignToTarget(first.expr, newStr, line);
      }
    }
  }

  private executeSort(args: Expression[], line: number): void {
    if (args.length < 2) throw new Error(`sort expects at least 2 arguments on line ${line}`);
    const first = this.evaluateExpression(args[0]);
    const last = this.evaluateExpression(args[1]);

    if (first && first.__iter && last && last.__iter && first.obj === last.obj) {
      const arr = first.obj;
      const start = first.idx;
      const end = last.idx;
      if (Array.isArray(arr)) {
        const slice = arr.slice(start, end).sort((a: any, b: any) => (a > b ? 1 : a < b ? -1 : 0));
        for (let i = 0; i < slice.length; i++) {
          arr[start + i] = slice[i];
        }
        this.recordObjectMutation(first.expr);
      }
    }
  }

  private isTruthy(val: any): boolean {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    return Boolean(val);
  }

  private getVariable(name: string, line: number): any {
    if (name === "INT_MAX") return 2147483647;
    if (name === "INT_MIN") return -2147483648;
    if (name === "LLONG_MAX") return 9223372036854775807;
    if (name === "LLONG_MIN") return -9223372036854775807;
    if (name === "NULL" || name === "nullptr") return null;
    if (name === "true") return true;
    if (name === "false") return false;

    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
      const bindings = this.frameRefBindings.get(currentFrame.id);
      if (bindings && bindings.has(name)) {
        const b = bindings.get(name)!;
        if (b.targetFrame) {
          if (b.name in b.targetFrame.locals) return b.targetFrame.locals[b.name];
          if (b.name in b.targetFrame.args) return b.targetFrame.args[b.name];
        } else if (b.name in this.globals) {
          return this.globals[b.name].value;
        }
      }

      if (name in currentFrame.locals) {
        return currentFrame.locals[name];
      }
      if (name in currentFrame.args) {
        return currentFrame.args[name];
      }
      const staticKey = `${currentFrame.fn}::${name}`;
      if (this.staticStorage.has(staticKey)) {
        return this.staticStorage.get(staticKey)!.value;
      }
    }

    if (this.staticStorage.has(name)) {
      return this.staticStorage.get(name)!.value;
    }

    if (name in this.globals) {
      return this.globals[name].value;
    }

    throw new Error(`Undefined variable '${name}' on line ${line}`);
  }

  private setLocalVariable(name: string, value: any): void {
    const cloned = cloneValue(value);
    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
      currentFrame.locals[name] = cloned;
    } else {
      this.globals[name] = {
        name,
        value: cloned,
        varType: typeof value === "number" ? "int" : typeof value === "boolean" ? "bool" : "string",
      };
    }
  }

  private setVariable(name: string, value: any, line: number): void {
    let oldValue: any = undefined;
    const cloned = cloneValue(value);

    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
      const bindings = this.frameRefBindings.get(currentFrame.id);
      if (bindings && bindings.has(name)) {
        const b = bindings.get(name)!;
        // Keep current frame args reflection up to date
        if (name in currentFrame.args) {
          currentFrame.args[name] = cloned;
        }
        if (b.targetFrame) {
          if (b.name in b.targetFrame.locals) {
            oldValue = b.targetFrame.locals[b.name];
            b.targetFrame.locals[b.name] = cloned;
            this.recentChange = {
              name: b.name,
              scope: "local",
              oldValue,
              newValue: cloned,
              fnName: b.targetFrame.fn,
            };
            return;
          }
          if (b.name in b.targetFrame.args) {
            oldValue = b.targetFrame.args[b.name];
            b.targetFrame.args[b.name] = cloned;
            this.recentChange = {
              name: b.name,
              scope: "arg",
              oldValue,
              newValue: cloned,
              fnName: b.targetFrame.fn,
            };
            return;
          }
        } else if (b.name in this.globals) {
          oldValue = this.globals[b.name].value;
          this.globals[b.name].value = cloned;
          this.recentChange = {
            name: b.name,
            scope: "global",
            oldValue,
            newValue: cloned,
          };
          return;
        }
      }

      if (name in currentFrame.locals) {
        if (this.frameConsts.get(currentFrame.id)?.has(name)) {
          throw new Error(`Cannot modify const variable '${name}' on line ${line}`);
        }
        oldValue = currentFrame.locals[name];
        currentFrame.locals[name] = cloned;
        this.recentChange = {
          name,
          scope: "local",
          oldValue,
          newValue: cloned,
          fnName: currentFrame.fn,
        };
        return;
      }

      if (name in currentFrame.args) {
        if (this.frameConsts.get(currentFrame.id)?.has(name)) {
          throw new Error(`Cannot modify const parameter '${name}' on line ${line}`);
        }
        oldValue = currentFrame.args[name];
        currentFrame.args[name] = cloned;
        this.recentChange = {
          name,
          scope: "arg",
          oldValue,
          newValue: cloned,
          fnName: currentFrame.fn,
        };
        return;
      }

      const staticKey = `${currentFrame.fn}::${name}`;
      if (this.staticStorage.has(staticKey)) {
        const sInfo = this.staticStorage.get(staticKey)!;
        if (sInfo.isConst) {
          throw new Error(`Cannot modify const static variable '${name}' on line ${line}`);
        }
        oldValue = sInfo.value;
        sInfo.value = cloned;
        this.recentChange = {
          name,
          scope: "static",
          oldValue,
          newValue: cloned,
          fnName: currentFrame.fn,
        };
        return;
      }
    }

    if (this.staticStorage.has(name)) {
      const sInfo = this.staticStorage.get(name)!;
      if (sInfo.isConst) {
        throw new Error(`Cannot modify const static variable '${name}' on line ${line}`);
      }
      oldValue = sInfo.value;
      sInfo.value = cloned;
      this.recentChange = {
        name,
        scope: "static",
        oldValue,
        newValue: cloned,
      };
      return;
    }

    if (name in this.globals) {
      if (this.globals[name].isConst || this.globalConsts.has(name)) {
        throw new Error(`Cannot modify const variable '${name}' on line ${line}`);
      }
      oldValue = this.globals[name].value;
      this.globals[name].value = cloned;
      this.recentChange = {
        name,
        scope: "global",
        oldValue,
        newValue: cloned,
      };
      return;
    }

    throw new Error(`Undefined variable '${name}' on line ${line}`);
  }

  private updateCurrentFrameLine(line: number): void {
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].line = line;
    }
  }

  private checkStepLimit(line: number): void {
    if (this.stepCount >= this.maxSteps) {
      throw new Error(`Execution step limit (${this.maxSteps}) exceeded on line ${line}. Possible infinite loop or deep recursion.`);
    }
  }

  private recordEvent(
    type: "CALL" | "LINE" | "RETURN" | "PRINT" | "ERROR",
    line: number,
    returnValue?: any,
    message?: string,
    direction?: "DOWN" | "UP",
    extra?: {
      explanation?: string;
      isBaseCase?: boolean;
      callerFn?: string;
      callerLine?: number;
    }
  ): void {
    const currentFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;
    const currentFrameId = currentFrame ? currentFrame.id : undefined;
    const currentTreeNodeId = currentFrame ? this.frameTreeNodeMap.get(currentFrame.id) : undefined;

    // Deep clone stack frames
    const stackSnapshot: Frame[] = this.callStack.map((f) => {
      const fConsts = Array.from(this.frameConsts.get(f.id) || []);
      const fStatics: Record<string, any> = {};
      for (const [k, v] of this.staticStorage.entries()) {
        if (v.fnName === f.fn || k.startsWith(`${f.fn}::`)) {
          fStatics[v.name] = cloneValue(v.value);
        }
      }
      return {
        id: f.id,
        fn: f.fn,
        args: cloneValue(f.args),
        locals: cloneValue(f.locals),
        line: f.line,
        returnValue: cloneValue(f.returnValue),
        callerFn: f.callerFn,
        callerLine: f.callerLine,
        constVars: fConsts,
        staticVars: fStatics,
      };
    });

    // Deep clone tree nodes
    const treeNodesSnapshot: TreeNodeSnapshot[] = this.treeNodes.map((n) => ({
      ...n,
      args: cloneValue(n.args),
      returnValue: cloneValue(n.returnValue),
    }));

    const staticVarsSnapshot: Record<string, StaticVarInfo> = {};
    for (const [k, v] of this.staticStorage.entries()) {
      staticVarsSnapshot[k] = { ...v, value: cloneValue(v.value) };
    }

    const globalsSnapshot: Record<string, GlobalVarInfo> = {};
    for (const [k, v] of Object.entries(this.globals)) {
      globalsSnapshot[k] = { ...v, value: cloneValue(v.value) };
    }

    const event: TraceEvent = {
      index: this.stepCount++,
      type,
      line,
      stack: stackSnapshot,
      output: this.output,
      returnValue,
      message,
      activeFrameId: currentFrameId,
      activeTreeNodeId: currentTreeNodeId,
      treeNodes: treeNodesSnapshot,
      direction,
      explanation: extra?.explanation,
      isBaseCase: extra?.isBaseCase,
      callerFn: extra?.callerFn || currentFrame?.callerFn,
      callerLine: extra?.callerLine || currentFrame?.callerLine,
      staticVars: staticVarsSnapshot,
      globals: globalsSnapshot,
      recentChange: this.recentChange ? cloneValue(this.recentChange) : undefined,
    };

    this.trace.push(event);
    this.recentChange = undefined;
  }
}
