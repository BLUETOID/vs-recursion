export type EventType = "CALL" | "LINE" | "RETURN" | "PRINT" | "ERROR";

export interface Frame {
  id: string;
  fn: string;
  args: Record<string, any>;
  locals: Record<string, any>;
  line: number;
  returnValue?: any;
  callerFn?: string;
  callerLine?: number;
  constVars?: string[];
  staticVars?: Record<string, any>;
}

export interface StaticVarInfo {
  name: string;
  fnName?: string;
  value: any;
  varType: string;
  isConst?: boolean;
}

export interface GlobalVarInfo {
  name: string;
  value: any;
  varType: string;
  isConst?: boolean;
}

export interface VarChange {
  name: string;
  scope: "static" | "global" | "local" | "arg";
  oldValue?: any;
  newValue: any;
  fnName?: string;
}

export interface TreeNodeSnapshot {
  id: string;
  parentId: string | null;
  fn: string;
  args: Record<string, any>;
  returnValue?: any;
  status: "active" | "returned" | "pending";
  callIndex: number;
  returnIndex?: number;
  depth: number;
  callerFn?: string;
  callerLine?: number;
}

export interface TraceEvent {
  index: number;
  type: EventType;
  line: number;
  stack: Frame[];
  output: string;
  returnValue?: any;
  message?: string;
  activeFrameId?: string;
  activeTreeNodeId?: string;
  treeNodes: TreeNodeSnapshot[];
  direction?: "DOWN" | "UP";
  explanation?: string;       // Contextual step explanation
  isBaseCase?: boolean;       // Flags if current step is returning from base case
  callerFn?: string;          // Name of calling function
  callerLine?: number;        // Line where call was made in caller
  staticVars?: Record<string, StaticVarInfo>;
  globals?: Record<string, GlobalVarInfo>;
  recentChange?: VarChange;
}

