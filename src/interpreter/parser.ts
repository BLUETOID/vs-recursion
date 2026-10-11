import type {
  Program,
  FunctionDeclaration,
  VariableDeclaration,
  Parameter,
  Statement,
  BlockStatement,
  IfStatement,
  WhileStatement,
  ForStatement,
  ReturnStatement,
  CoutStatement,
  ExpressionStatement,
  Expression,
  Identifier,
} from "./ast";
import type { Token } from "./tokens";
import { TokenType } from "./tokens";

export class Parser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  parse(): Program {
    const declarations: (FunctionDeclaration | VariableDeclaration)[] = [];
    const startLine = this.peek().line;

    while (!this.isAtEnd()) {
      const decls = this.parseTopLevelDeclarations();
      declarations.push(...decls);
    }

    return {
      type: "Program",
      declarations,
      line: startLine,
    };
  }

  private isTypeToken(token: Token): boolean {
    return (
      token.type === TokenType.INT ||
      token.type === TokenType.BOOL ||
      token.type === TokenType.VOID ||
      token.type === TokenType.CHAR ||
      token.type === TokenType.DOUBLE ||
      token.type === TokenType.FLOAT ||
      token.type === TokenType.LONG ||
      token.type === TokenType.UNSIGNED ||
      token.type === TokenType.STRING_TYPE ||
      token.type === TokenType.AUTO
    );
  }

  private isModifierToken(token: Token): boolean {
    return (
      token.type === TokenType.STATIC ||
      token.type === TokenType.CONST ||
      token.type === TokenType.INLINE
    );
  }

  private parseTopLevelDeclarations(): (FunctionDeclaration | VariableDeclaration)[] {
    let isStatic = false;
    let isConst = false;
    let isInline = false;

    while (this.isModifierToken(this.peek())) {
      const mod = this.advance();
      if (mod.type === TokenType.STATIC) isStatic = true;
      if (mod.type === TokenType.CONST) isConst = true;
      if (mod.type === TokenType.INLINE) isInline = true;
    }

    if (!this.isTypeToken(this.peek())) {
      throw new Error(`Expected type declaration at line ${this.peek().line}, found '${this.peek().value}'`);
    }

    let typeToken = this.advance();
    if (typeToken.type === TokenType.UNSIGNED && this.isTypeToken(this.peek())) {
      typeToken = this.advance();
    }

    // Optional reference token
    if (this.match(TokenType.AMP)) {
      // Ignored or tracked
    }

    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected identifier after type");

    // If followed by '(', it's a function declaration
    if (this.match(TokenType.LPAREN)) {
      return [this.finishFunctionDeclaration(typeToken.value, nameToken.value, typeToken.line, isStatic, isInline)];
    }

    // Otherwise it's a global variable declaration (or comma-separated list)
    return this.finishTopLevelVariableDeclarations(typeToken.value, nameToken.value, typeToken.line, isStatic, isConst);
  }

  private finishFunctionDeclaration(
    returnType: string,
    name: string,
    line: number,
    isStatic = false,
    isInline = false
  ): FunctionDeclaration {
    const params: Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.check(TokenType.VOID) && params.length === 0) {
          this.advance();
          break;
        }

        let isConst = false;
        if (this.match(TokenType.CONST)) {
          isConst = true;
        }

        if (!this.isTypeToken(this.peek())) {
          throw new Error(`Expected parameter type at line ${this.peek().line}, found '${this.peek().value}'`);
        }
        let pType = this.advance().value;
        if (pType === "unsigned" && this.isTypeToken(this.peek())) {
          pType = this.advance().value;
        }

        let isRef = false;
        if (this.match(TokenType.AMP)) {
          isRef = true;
        }

        const pName = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
        params.push({
          type: "Parameter",
          paramType: pType,
          name: pName,
          isConst,
          isRef,
          line: this.previous().line,
        });
      } while (this.match(TokenType.COMMA));
    }

    this.consume(TokenType.RPAREN, "Expected ')' after parameters");

    if (this.match(TokenType.SEMICOLON)) {
      // Function prototype / forward declaration
      return {
        type: "FunctionDeclaration",
        returnType,
        name,
        params,
        body: { type: "BlockStatement", statements: [], line },
        isStatic,
        isInline,
        line,
      };
    }

    const body = this.parseBlockStatement();

    return {
      type: "FunctionDeclaration",
      returnType,
      name,
      params,
      body,
      isStatic,
      isInline,
      line,
    };
  }

  private finishTopLevelVariableDeclarations(
    varType: string,
    name: string,
    line: number,
    isStatic = false,
    isConst = false
  ): VariableDeclaration[] {
    const decls: VariableDeclaration[] = [];
    let init: Expression | undefined;

    if (this.match(TokenType.EQUAL)) {
      init = this.parseExpression();
    }

    decls.push({
      type: "VariableDeclaration",
      varType,
      name,
      init,
      isStatic,
      isConst,
      line,
    });

    while (this.match(TokenType.COMMA)) {
      const nextName = this.consume(TokenType.IDENTIFIER, "Expected variable name after ','").value;
      let nextInit: Expression | undefined;
      if (this.match(TokenType.EQUAL)) {
        nextInit = this.parseExpression();
      }
      decls.push({
        type: "VariableDeclaration",
        varType,
        name: nextName,
        init: nextInit,
        isStatic,
        isConst,
        line,
      });
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");
    return decls;
  }

  private finishStatementVariableDeclarations(
    varType: string,
    name: string,
    line: number,
    isStatic = false,
    isConst = false
  ): Statement {
    const decls: VariableDeclaration[] = [];
    let init: Expression | undefined;

    if (this.match(TokenType.EQUAL)) {
      init = this.parseExpression();
    }

    decls.push({
      type: "VariableDeclaration",
      varType,
      name,
      init,
      isStatic,
      isConst,
      line,
    });

    while (this.match(TokenType.COMMA)) {
      const nextName = this.consume(TokenType.IDENTIFIER, "Expected variable name after ','").value;
      let nextInit: Expression | undefined;
      if (this.match(TokenType.EQUAL)) {
        nextInit = this.parseExpression();
      }
      decls.push({
        type: "VariableDeclaration",
        varType,
        name: nextName,
        init: nextInit,
        isStatic,
        isConst,
        line,
      });
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    if (decls.length === 1) {
      return decls[0];
    }

    return {
      type: "BlockStatement",
      statements: decls,
      line,
    };
  }

  private parseStatement(): Statement {
    const token = this.peek();

    if (token.type === TokenType.LBRACE) {
      return this.parseBlockStatement();
    }

    if (token.type === TokenType.IF) {
      return this.parseIfStatement();
    }

    if (token.type === TokenType.WHILE) {
      return this.parseWhileStatement();
    }

    if (token.type === TokenType.FOR) {
      return this.parseForStatement();
    }

    if (token.type === TokenType.RETURN) {
      return this.parseReturnStatement();
    }

    if (token.type === TokenType.BREAK) {
      this.advance();
      this.consume(TokenType.SEMICOLON, "Expected ';' after 'break'");
      return { type: "BreakStatement", line: token.line };
    }

    if (token.type === TokenType.CONTINUE) {
      this.advance();
      this.consume(TokenType.SEMICOLON, "Expected ';' after 'continue'");
      return { type: "ContinueStatement", line: token.line };
    }

    if (token.type === TokenType.COUT) {
      return this.parseCoutStatement();
    }

    if (this.isModifierToken(token) || this.isTypeToken(token)) {
      let isStatic = false;
      let isConst = false;
      while (this.isModifierToken(this.peek())) {
        const m = this.advance();
        if (m.type === TokenType.STATIC) isStatic = true;
        if (m.type === TokenType.CONST) isConst = true;
      }

      if (!this.isTypeToken(this.peek())) {
        throw new Error(`Expected type at line ${this.peek().line}, found '${this.peek().value}'`);
      }

      let typeToken = this.advance();
      if (typeToken.type === TokenType.UNSIGNED && this.isTypeToken(this.peek())) {
        typeToken = this.advance();
      }

      if (this.match(TokenType.AMP)) {
        // reference
      }

      const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name");
      return this.finishStatementVariableDeclarations(typeToken.value, nameToken.value, typeToken.line, isStatic, isConst);
    }

    if (this.match(TokenType.SEMICOLON)) {
      return { type: "EmptyStatement", line: token.line };
    }

    return this.parseExpressionStatement();
  }

  private parseBlockStatement(): BlockStatement {
    const line = this.peek().line;
    this.consume(TokenType.LBRACE, "Expected '{'");
    const statements: Statement[] = [];

    while (!this.check(TokenType.RBRACE) && !this.isAtEnd()) {
      statements.push(this.parseStatement());
    }

    this.consume(TokenType.RBRACE, "Expected '}'");
    return {
      type: "BlockStatement",
      statements,
      line,
    };
  }

  private parseIfStatement(): IfStatement {
    const line = this.advance().line; // consume 'if'
    this.consume(TokenType.LPAREN, "Expected '(' after 'if'");
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, "Expected ')' after if condition");

    const thenBranch = this.parseStatement();
    let elseBranch: Statement | undefined;

    if (this.match(TokenType.ELSE)) {
      elseBranch = this.parseStatement();
    }

    return {
      type: "IfStatement",
      condition,
      thenBranch,
      elseBranch,
      line,
    };
  }

  private parseWhileStatement(): WhileStatement {
    const line = this.advance().line; // consume 'while'
    this.consume(TokenType.LPAREN, "Expected '(' after 'while'");
    const condition = this.parseExpression();
    this.consume(TokenType.RPAREN, "Expected ')' after while condition");

    const body = this.parseStatement();
    return {
      type: "WhileStatement",
      condition,
      body,
      line,
    };
  }

  private parseForStatement(): ForStatement {
    const line = this.advance().line; // consume 'for'
    this.consume(TokenType.LPAREN, "Expected '(' after 'for'");

    let init: VariableDeclaration | ExpressionStatement | Statement | null = null;
    if (this.match(TokenType.SEMICOLON)) {
      init = null;
    } else if (this.isModifierToken(this.peek()) || this.isTypeToken(this.peek())) {
      let isStatic = false;
      let isConst = false;
      while (this.isModifierToken(this.peek())) {
        const m = this.advance();
        if (m.type === TokenType.STATIC) isStatic = true;
        if (m.type === TokenType.CONST) isConst = true;
      }
      let typeToken = this.advance();
      if (typeToken.type === TokenType.UNSIGNED && this.isTypeToken(this.peek())) {
        typeToken = this.advance();
      }
      const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name in for init");
      init = this.finishStatementVariableDeclarations(typeToken.value, nameToken.value, typeToken.line, isStatic, isConst);
    } else {
      init = this.parseExpressionStatement();
    }

    let condition: Expression | null = null;
    if (!this.check(TokenType.SEMICOLON)) {
      condition = this.parseExpression();
    }
    this.consume(TokenType.SEMICOLON, "Expected ';' after for loop condition");

    let update: Expression | null = null;
    if (!this.check(TokenType.RPAREN)) {
      update = this.parseExpression();
    }
    this.consume(TokenType.RPAREN, "Expected ')' after for clauses");

    const body = this.parseStatement();

    return {
      type: "ForStatement",
      init,
      condition,
      update,
      body,
      line,
    };
  }

  private parseReturnStatement(): ReturnStatement {
    const line = this.advance().line; // consume 'return'
    let value: Expression | undefined;

    if (!this.check(TokenType.SEMICOLON)) {
      value = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after return");
    return {
      type: "ReturnStatement",
      value,
      line,
    };
  }

  private parseCoutStatement(): CoutStatement {
    const line = this.advance().line; // consume 'cout'
    const values: Expression[] = [];

    if (!this.match(TokenType.SHL)) {
      throw new Error(`Expected '<<' after 'cout' on line ${line}`);
    }

    values.push(this.parseExpression());

    while (this.match(TokenType.SHL)) {
      values.push(this.parseExpression());
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after cout statement");

    return {
      type: "CoutStatement",
      values,
      line,
    };
  }

  private parseExpressionStatement(): ExpressionStatement {
    const expr = this.parseExpression();
    this.consume(TokenType.SEMICOLON, "Expected ';' after expression");
    return {
      type: "ExpressionStatement",
      expression: expr,
      line: expr.line,
    };
  }

  // --- Expressions ---

  private parseExpression(): Expression {
    return this.parseAssignment();
  }

  private parseAssignment(): Expression {
    const expr = this.parseConditional();

    if (
      this.match(TokenType.EQUAL) ||
      this.match(TokenType.PLUS_EQUAL) ||
      this.match(TokenType.MINUS_EQUAL) ||
      this.match(TokenType.STAR_EQUAL) ||
      this.match(TokenType.SLASH_EQUAL) ||
      this.match(TokenType.PERCENT_EQUAL)
    ) {
      const op = this.previous().value;
      const right = this.parseAssignment();

      if (expr.type === "Identifier") {
        return {
          type: "AssignmentExpression",
          op,
          left: expr,
          right,
          line: expr.line,
        };
      }

      throw new Error(`Invalid assignment target on line ${expr.line}`);
    }

    return expr;
  }

  private parseConditional(): Expression {
    let expr = this.parseLogicalOr();

    if (this.match(TokenType.QUESTION)) {
      const qLine = this.previous().line;
      const consequent = this.parseExpression();
      this.consume(TokenType.COLON, "Expected ':' in conditional ternary expression");
      const alternate = this.parseConditional();
      return {
        type: "ConditionalExpression",
        condition: expr,
        consequent,
        alternate,
        line: qLine,
      };
    }

    return expr;
  }

  private parseLogicalOr(): Expression {
    let expr = this.parseLogicalAnd();

    while (this.match(TokenType.PIPE_PIPE)) {
      const op = this.previous().value;
      const right = this.parseLogicalAnd();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseLogicalAnd(): Expression {
    let expr = this.parseEquality();

    while (this.match(TokenType.AMP_AMP)) {
      const op = this.previous().value;
      const right = this.parseEquality();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseEquality(): Expression {
    let expr = this.parseRelational();

    while (this.match(TokenType.EQ_EQ) || this.match(TokenType.BANG_EQ)) {
      const op = this.previous().value;
      const right = this.parseRelational();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseRelational(): Expression {
    let expr = this.parseAdditive();

    while (
      this.match(TokenType.LESS) ||
      this.match(TokenType.GREATER) ||
      this.match(TokenType.LESS_EQ) ||
      this.match(TokenType.GREATER_EQ)
    ) {
      const op = this.previous().value;
      const right = this.parseAdditive();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseAdditive(): Expression {
    let expr = this.parseMultiplicative();

    while (this.match(TokenType.PLUS) || this.match(TokenType.MINUS)) {
      const op = this.previous().value;
      const right = this.parseMultiplicative();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseMultiplicative(): Expression {
    let expr = this.parseUnary();

    while (this.match(TokenType.STAR) || this.match(TokenType.SLASH) || this.match(TokenType.PERCENT)) {
      const op = this.previous().value;
      const right = this.parseUnary();
      expr = {
        type: "BinaryExpression",
        op,
        left: expr,
        right,
        line: expr.line,
      };
    }

    return expr;
  }

  private parseUnary(): Expression {
    if (this.match(TokenType.BANG) || this.match(TokenType.MINUS) || this.match(TokenType.PLUS)) {
      const op = this.previous().value;
      const argument = this.parseUnary();
      return {
        type: "UnaryExpression",
        op,
        argument,
        prefix: true,
        line: this.previous().line,
      };
    }

    if (this.match(TokenType.PLUS_PLUS) || this.match(TokenType.MINUS_MINUS)) {
      const op = this.previous().value as "++" | "--";
      const token = this.consume(TokenType.IDENTIFIER, "Expected identifier after prefix increment/decrement");
      const argument: Identifier = {
        type: "Identifier",
        name: token.value,
        line: token.line,
      };
      return {
        type: "UpdateExpression",
        op,
        argument,
        prefix: true,
        line: this.previous().line,
      };
    }

    return this.parsePostfix();
  }

  private parsePostfix(): Expression {
    const expr = this.parsePrimary();

    if (this.match(TokenType.PLUS_PLUS) || this.match(TokenType.MINUS_MINUS)) {
      const op = this.previous().value as "++" | "--";
      if (expr.type !== "Identifier") {
        throw new Error(`Invalid postfix operand on line ${expr.line}`);
      }
      return {
        type: "UpdateExpression",
        op,
        argument: expr,
        prefix: false,
        line: expr.line,
      };
    }

    return expr;
  }

  private parsePrimary(): Expression {
    const token = this.peek();

    if (this.match(TokenType.NUMBER)) {
      return {
        type: "NumberLiteral",
        value: parseInt(token.value, 10),
        line: token.line,
      };
    }

    if (this.match(TokenType.CHAR_LITERAL)) {
      return {
        type: "CharLiteral",
        value: token.value,
        line: token.line,
      };
    }

    if (this.match(TokenType.STRING)) {
      return {
        type: "StringLiteral",
        value: token.value,
        line: token.line,
      };
    }

    if (this.match(TokenType.TRUE)) {
      return {
        type: "BoolLiteral",
        value: true,
        line: token.line,
      };
    }

    if (this.match(TokenType.FALSE)) {
      return {
        type: "BoolLiteral",
        value: false,
        line: token.line,
      };
    }

    if (this.match(TokenType.ENDL)) {
      return {
        type: "EndlExpression",
        line: token.line,
      };
    }

    if (this.match(TokenType.IDENTIFIER)) {
      const name = token.value;

      // Check if it's a function call
      if (this.match(TokenType.LPAREN)) {
        const args: Expression[] = [];
        if (!this.check(TokenType.RPAREN)) {
          do {
            args.push(this.parseExpression());
          } while (this.match(TokenType.COMMA));
        }
        this.consume(TokenType.RPAREN, "Expected ')' after arguments");
        return {
          type: "CallExpression",
          callee: name,
          args,
          line: token.line,
        };
      }

      return {
        type: "Identifier",
        name,
        line: token.line,
      };
    }

    if (this.match(TokenType.LPAREN)) {
      const expr = this.parseExpression();
      this.consume(TokenType.RPAREN, "Expected ')' after expression");
      return expr;
    }

    throw new Error(`Unexpected token '${token.value || token.type}' on line ${token.line}`);
  }

  // --- Helper Methods ---

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        this.advance();
        return true;
      }
    }
    return false;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.peek().type === type;
  }

  private advance(): Token {
    if (!this.isAtEnd()) this.current++;
    return this.previous();
  }

  private isAtEnd(): boolean {
    return this.peek().type === TokenType.EOF;
  }

  private peek(): Token {
    return this.tokens[this.current];
  }

  private previous(): Token {
    return this.tokens[this.current - 1];
  }

  private consume(type: TokenType, message: string): Token {
    if (this.check(type)) return this.advance();
    throw new Error(`${message} on line ${this.peek().line}, found '${this.peek().value || this.peek().type}'`);
  }
}
