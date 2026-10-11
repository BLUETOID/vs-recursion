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
      declarations.push(this.parseTopLevelDeclaration());
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
      token.type === TokenType.CHAR
    );
  }

  private parseTopLevelDeclaration(): FunctionDeclaration | VariableDeclaration {
    if (!this.isTypeToken(this.peek())) {
      throw new Error(`Expected type declaration at line ${this.peek().line}, found '${this.peek().value}'`);
    }

    const typeToken = this.advance();
    const nameToken = this.consume(TokenType.IDENTIFIER, "Expected identifier after type");

    // If followed by '(', it's a function declaration
    if (this.match(TokenType.LPAREN)) {
      return this.finishFunctionDeclaration(typeToken.value, nameToken.value, typeToken.line);
    }

    // Otherwise it's a global variable declaration
    return this.finishVariableDeclaration(typeToken.value, nameToken.value, typeToken.line);
  }

  private finishFunctionDeclaration(
    returnType: string,
    name: string,
    line: number
  ): FunctionDeclaration {
    const params: Parameter[] = [];

    if (!this.check(TokenType.RPAREN)) {
      do {
        if (this.check(TokenType.VOID) && params.length === 0) {
          this.advance();
          break;
        }

        if (!this.isTypeToken(this.peek())) {
          throw new Error(`Expected parameter type at line ${this.peek().line}, found '${this.peek().value}'`);
        }
        const pType = this.advance().value;
        const pName = this.consume(TokenType.IDENTIFIER, "Expected parameter name").value;
        params.push({
          type: "Parameter",
          paramType: pType,
          name: pName,
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
      line,
    };
  }

  private finishVariableDeclaration(
    varType: string,
    name: string,
    line: number
  ): VariableDeclaration {
    let init: Expression | undefined;

    if (this.match(TokenType.EQUAL)) {
      init = this.parseExpression();
    }

    this.consume(TokenType.SEMICOLON, "Expected ';' after variable declaration");

    return {
      type: "VariableDeclaration",
      varType,
      name,
      init,
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

    if (token.type === TokenType.COUT) {
      return this.parseCoutStatement();
    }

    if (this.isTypeToken(token)) {
      const typeToken = this.advance();
      const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name");
      return this.finishVariableDeclaration(typeToken.value, nameToken.value, typeToken.line);
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

    let init: VariableDeclaration | ExpressionStatement | null = null;
    if (this.match(TokenType.SEMICOLON)) {
      init = null;
    } else if (this.isTypeToken(this.peek())) {
      const typeToken = this.advance();
      const nameToken = this.consume(TokenType.IDENTIFIER, "Expected variable name in for init");
      init = this.finishVariableDeclaration(typeToken.value, nameToken.value, typeToken.line);
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
    const expr = this.parseLogicalOr();

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
