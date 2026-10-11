import type {
  Program,
  FunctionDeclaration,
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

class ReturnSignal {
  value: any;
  constructor(value: any) {
    this.value = value;
  }
}

class BreakSignal {}
class ContinueSignal {}

export interface EvaluatorOptions {
  maxDepth?: number;
  maxSteps?: number;
  entryFunction?: string;
  entryArgs?: any[];
}

export class Evaluator {
  private program: Program;
  private functions: Map<string, FunctionDeclaration> = new Map();
  private globals: Record<string, GlobalVarInfo> = {};
  private staticStorage: Map<string, StaticVarInfo> = new Map();
  private frameConsts: Map<string, Set<string>> = new Map();
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
    this.globalConsts.clear();
    this.treeNodes = [];
    this.frameTreeNodeMap.clear();
    this.recentChange = undefined;

    try {
      // 1. Register top-level items
      for (const decl of this.program.declarations) {
        if (decl.type === "FunctionDeclaration") {
          const existing = this.functions.get(decl.name);
          if (!existing || existing.body.statements.length === 0) {
            this.functions.set(decl.name, decl);
          }
        } else if (decl.type === "VariableDeclaration") {
          let val: any = 0;
          if (decl.init) {
            val = this.evaluateExpression(decl.init);
          } else {
            if (decl.varType === "bool") val = false;
            else if (decl.varType === "char") val = "\0";
            else if (decl.varType === "string") val = "";
            else val = 0;
          }

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
            if (p.paramType === "int") return 4;
            if (p.paramType === "bool") return true;
            if (p.paramType === "char") return "A";
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

  private executeFunction(
    fn: FunctionDeclaration,
    args: any[],
    callerFn?: string,
    callerLine?: number
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
      argsRecord[p.name] = args[i];
      if (p.isConst) {
        constParamSet.add(p.name);
      }
    }

    this.frameConsts.set(frameId, constParamSet);

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
      // If function is void, implicit return null/void
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
            let initVal: any = 0;
            if (stmt.init) {
              initVal = this.evaluateExpression(stmt.init);
            } else {
              if (stmt.varType === "bool") initVal = false;
              else if (stmt.varType === "char") initVal = "\0";
              else if (stmt.varType === "string") initVal = "";
              else initVal = 0;
            }

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
          let initVal: any = 0;
          if (stmt.init) {
            initVal = this.evaluateExpression(stmt.init);
          } else {
            if (stmt.varType === "bool") initVal = false;
            else if (stmt.varType === "char") initVal = "\0";
            else if (stmt.varType === "string") initVal = "";
            else initVal = 0;
          }

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
        this.recordEvent("LINE", stmt.line, undefined, undefined, undefined, {
          explanation: `Executing statement on line ${stmt.line}.`,
        });
        this.evaluateExpression(stmt.expression);
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
              : (Number(left) + Number(right));
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
            // C++ sign rule: sign of left operand
            return (Number(left) % Number(right)) | 0;
          case "&":
            return (Number(left) & Number(right)) | 0;
          case "|":
            return (Number(left) | Number(right)) | 0;
          case "^":
            return (Number(left) ^ Number(right)) | 0;
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
        const cur = this.getVariable(expr.argument.name, expr.line);
        const updated = expr.op === "++" ? cur + 1 : cur - 1;
        this.setVariable(expr.argument.name, updated, expr.line);
        return expr.prefix ? updated : cur;
      }

      case "AssignmentExpression": {
        const rightVal = this.evaluateExpression(expr.right);
        let finalVal = rightVal;
        if (expr.op !== "=") {
          const curVal = this.getVariable(expr.left.name, expr.line);
          switch (expr.op) {
            case "+=": finalVal = curVal + rightVal; break;
            case "-=": finalVal = curVal - rightVal; break;
            case "*=": finalVal = curVal * rightVal; break;
            case "/=":
              if (rightVal === 0) throw new Error(`Division by zero on line ${expr.line}`);
              finalVal = Math.trunc(curVal / rightVal);
              break;
            case "%=":
              if (rightVal === 0) throw new Error(`Modulo by zero on line ${expr.line}`);
              finalVal = (curVal % rightVal) | 0;
              break;
          }
        }
        this.setVariable(expr.left.name, finalVal, expr.line);
        return finalVal;
      }

      case "CallExpression": {
        const fn = this.functions.get(expr.callee);
        if (!fn) {
          throw new Error(`Call to unknown function '${expr.callee}' on line ${expr.line}`);
        }
        const evaluatedArgs = expr.args.map((a) => this.evaluateExpression(a));
        const callerFrame = this.callStack.length > 0 ? this.callStack[this.callStack.length - 1] : null;
        return this.executeFunction(fn, evaluatedArgs, callerFrame?.fn, expr.line);
      }
    }
  }

  private isTruthy(val: any): boolean {
    if (typeof val === "boolean") return val;
    if (typeof val === "number") return val !== 0;
    return Boolean(val);
  }

  private getVariable(name: string, line: number): any {
    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
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
    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
      currentFrame.locals[name] = value;
    } else {
      this.globals[name] = {
        name,
        value,
        varType: typeof value === "number" ? "int" : typeof value === "boolean" ? "bool" : "string",
      };
    }
  }

  private setVariable(name: string, value: any, line: number): void {
    let oldValue: any = undefined;

    if (this.callStack.length > 0) {
      const currentFrame = this.callStack[this.callStack.length - 1];
      if (name in currentFrame.locals) {
        if (this.frameConsts.get(currentFrame.id)?.has(name)) {
          throw new Error(`Cannot modify const variable '${name}' on line ${line}`);
        }
        oldValue = currentFrame.locals[name];
        currentFrame.locals[name] = value;
        this.recentChange = {
          name,
          scope: "local",
          oldValue,
          newValue: value,
          fnName: currentFrame.fn,
        };
        return;
      }

      if (name in currentFrame.args) {
        if (this.frameConsts.get(currentFrame.id)?.has(name)) {
          throw new Error(`Cannot modify const parameter '${name}' on line ${line}`);
        }
        oldValue = currentFrame.args[name];
        currentFrame.args[name] = value;
        this.recentChange = {
          name,
          scope: "arg",
          oldValue,
          newValue: value,
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
        sInfo.value = value;
        this.recentChange = {
          name,
          scope: "static",
          oldValue,
          newValue: value,
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
      sInfo.value = value;
      this.recentChange = {
        name,
        scope: "static",
        oldValue,
        newValue: value,
      };
      return;
    }

    if (name in this.globals) {
      if (this.globals[name].isConst || this.globalConsts.has(name)) {
        throw new Error(`Cannot modify const variable '${name}' on line ${line}`);
      }
      oldValue = this.globals[name].value;
      this.globals[name].value = value;
      this.recentChange = {
        name,
        scope: "global",
        oldValue,
        newValue: value,
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
          fStatics[v.name] = v.value;
        }
      }
      return {
        id: f.id,
        fn: f.fn,
        args: { ...f.args },
        locals: { ...f.locals },
        line: f.line,
        returnValue: f.returnValue,
        callerFn: f.callerFn,
        callerLine: f.callerLine,
        constVars: fConsts,
        staticVars: fStatics,
      };
    });

    // Deep clone tree nodes
    const treeNodesSnapshot: TreeNodeSnapshot[] = this.treeNodes.map((n) => ({
      ...n,
      args: { ...n.args },
    }));

    const staticVarsSnapshot: Record<string, StaticVarInfo> = {};
    for (const [k, v] of this.staticStorage.entries()) {
      staticVarsSnapshot[k] = { ...v };
    }

    const globalsSnapshot: Record<string, GlobalVarInfo> = {};
    for (const [k, v] of Object.entries(this.globals)) {
      globalsSnapshot[k] = { ...v };
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
      recentChange: this.recentChange ? { ...this.recentChange } : undefined,
    };

    this.trace.push(event);
  }
}
