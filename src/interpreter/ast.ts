export interface BaseNode {
  line: number;
}

export interface Program extends BaseNode {
  type: "Program";
  declarations: (FunctionDeclaration | VariableDeclaration)[];
}

export interface Parameter extends BaseNode {
  type: "Parameter";
  paramType: string;
  name: string;
  isConst?: boolean;
  isRef?: boolean;
}

export interface FunctionDeclaration extends BaseNode {
  type: "FunctionDeclaration";
  returnType: string;
  name: string;
  params: Parameter[];
  body: BlockStatement;
  isStatic?: boolean;
  isInline?: boolean;
}

export interface VariableDeclaration extends BaseNode {
  type: "VariableDeclaration";
  varType: string;
  name: string;
  init?: Expression;
  isStatic?: boolean;
  isConst?: boolean;
}

export type Statement =
  | BlockStatement
  | VariableDeclaration
  | IfStatement
  | WhileStatement
  | ForStatement
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | CoutStatement
  | ExpressionStatement
  | EmptyStatement;

export interface BreakStatement extends BaseNode {
  type: "BreakStatement";
}

export interface ContinueStatement extends BaseNode {
  type: "ContinueStatement";
}

export interface BlockStatement extends BaseNode {
  type: "BlockStatement";
  statements: Statement[];
}

export interface IfStatement extends BaseNode {
  type: "IfStatement";
  condition: Expression;
  thenBranch: Statement;
  elseBranch?: Statement;
}

export interface WhileStatement extends BaseNode {
  type: "WhileStatement";
  condition: Expression;
  body: Statement;
}

export interface ForStatement extends BaseNode {
  type: "ForStatement";
  init?: VariableDeclaration | ExpressionStatement | Statement | null;
  condition?: Expression | null;
  update?: Expression | null;
  body: Statement;
}

export interface ReturnStatement extends BaseNode {
  type: "ReturnStatement";
  value?: Expression;
}

export interface CoutStatement extends BaseNode {
  type: "CoutStatement";
  values: Expression[];
}

export interface ExpressionStatement extends BaseNode {
  type: "ExpressionStatement";
  expression: Expression;
}

export interface EmptyStatement extends BaseNode {
  type: "EmptyStatement";
}

export type Expression =
  | NumberLiteral
  | BoolLiteral
  | CharLiteral
  | StringLiteral
  | Identifier
  | BinaryExpression
  | UnaryExpression
  | UpdateExpression
  | AssignmentExpression
  | ConditionalExpression
  | CallExpression
  | EndlExpression;

export interface ConditionalExpression extends BaseNode {
  type: "ConditionalExpression";
  condition: Expression;
  consequent: Expression;
  alternate: Expression;
}

export interface NumberLiteral extends BaseNode {
  type: "NumberLiteral";
  value: number;
}

export interface BoolLiteral extends BaseNode {
  type: "BoolLiteral";
  value: boolean;
}

export interface CharLiteral extends BaseNode {
  type: "CharLiteral";
  value: string;
}

export interface StringLiteral extends BaseNode {
  type: "StringLiteral";
  value: string;
}

export interface Identifier extends BaseNode {
  type: "Identifier";
  name: string;
}

export interface BinaryExpression extends BaseNode {
  type: "BinaryExpression";
  op: string;
  left: Expression;
  right: Expression;
}

export interface UnaryExpression extends BaseNode {
  type: "UnaryExpression";
  op: string;
  argument: Expression;
  prefix: boolean;
}

export interface UpdateExpression extends BaseNode {
  type: "UpdateExpression";
  op: "++" | "--";
  argument: Identifier;
  prefix: boolean;
}

export interface AssignmentExpression extends BaseNode {
  type: "AssignmentExpression";
  op: string;
  left: Identifier;
  right: Expression;
}

export interface CallExpression extends BaseNode {
  type: "CallExpression";
  callee: string;
  args: Expression[];
}

export interface EndlExpression extends BaseNode {
  type: "EndlExpression";
}
