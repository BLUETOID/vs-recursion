import type { Token } from "./tokens";
import { TokenType } from "./tokens";

export class Lexer {
  private source: string;
  private pos = 0;
  private line = 1;
  private col = 1;

  private static KEYWORDS: Record<string, TokenType> = {
    int: TokenType.INT,
    bool: TokenType.BOOL,
    void: TokenType.VOID,
    char: TokenType.CHAR,
    if: TokenType.IF,
    else: TokenType.ELSE,
    for: TokenType.FOR,
    while: TokenType.WHILE,
    return: TokenType.RETURN,
    cout: TokenType.COUT,
    endl: TokenType.ENDL,
    true: TokenType.TRUE,
    false: TokenType.FALSE,
  };

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (!this.isAtEnd()) {
      this.skipWhitespaceAndComments();
      if (this.isAtEnd()) break;

      const ch = this.peek();

      // Preprocessor directives like #include <iostream>
      if (ch === "#") {
        this.skipPreprocessor();
        continue;
      }

      const startLine = this.line;
      const startCol = this.col;

      // Handle numbers
      if (this.isDigit(ch)) {
        tokens.push(this.readNumber(startLine, startCol));
        continue;
      }

      // Handle identifiers and keywords
      if (this.isAlpha(ch) || ch === "_") {
        const idToken = this.readIdentifierOrKeyword(startLine, startCol);
        // Handle "using namespace std;" statement by skipping it
        if (idToken.value === "using") {
          this.skipUsingNamespace();
          continue;
        }
        tokens.push(idToken);
        continue;
      }

      // Handle strings
      if (ch === '"') {
        tokens.push(this.readString(startLine, startCol));
        continue;
      }

      // Handle char literals
      if (ch === "'") {
        tokens.push(this.readChar(startLine, startCol));
        continue;
      }

      // Handle operators and punctuation
      this.advance();

      switch (ch) {
        case "+":
          if (this.match("+")) {
            tokens.push({ type: TokenType.PLUS_PLUS, value: "++", line: startLine, col: startCol });
          } else if (this.match("=")) {
            tokens.push({ type: TokenType.PLUS_EQUAL, value: "+=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.PLUS, value: "+", line: startLine, col: startCol });
          }
          break;

        case "-":
          if (this.match("-")) {
            tokens.push({ type: TokenType.MINUS_MINUS, value: "--", line: startLine, col: startCol });
          } else if (this.match("=")) {
            tokens.push({ type: TokenType.MINUS_EQUAL, value: "-=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.MINUS, value: "-", line: startLine, col: startCol });
          }
          break;

        case "*":
          if (this.match("=")) {
            tokens.push({ type: TokenType.STAR_EQUAL, value: "*=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.STAR, value: "*", line: startLine, col: startCol });
          }
          break;

        case "/":
          if (this.match("=")) {
            tokens.push({ type: TokenType.SLASH_EQUAL, value: "/=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.SLASH, value: "/", line: startLine, col: startCol });
          }
          break;

        case "%":
          if (this.match("=")) {
            tokens.push({ type: TokenType.PERCENT_EQUAL, value: "%=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.PERCENT, value: "%", line: startLine, col: startCol });
          }
          break;

        case "<":
          if (this.match("<")) {
            tokens.push({ type: TokenType.SHL, value: "<<", line: startLine, col: startCol });
          } else if (this.match("=")) {
            tokens.push({ type: TokenType.LESS_EQ, value: "<=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.LESS, value: "<", line: startLine, col: startCol });
          }
          break;

        case ">":
          if (this.match("=")) {
            tokens.push({ type: TokenType.GREATER_EQ, value: ">=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.GREATER, value: ">", line: startLine, col: startCol });
          }
          break;

        case "=":
          if (this.match("=")) {
            tokens.push({ type: TokenType.EQ_EQ, value: "==", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.EQUAL, value: "=", line: startLine, col: startCol });
          }
          break;

        case "!":
          if (this.match("=")) {
            tokens.push({ type: TokenType.BANG_EQ, value: "!=", line: startLine, col: startCol });
          } else {
            tokens.push({ type: TokenType.BANG, value: "!", line: startLine, col: startCol });
          }
          break;

        case "&":
          if (this.match("&")) {
            tokens.push({ type: TokenType.AMP_AMP, value: "&&", line: startLine, col: startCol });
          } else {
            throw new Error(`Unexpected character '&' on line ${startLine}, col ${startCol}. Single '&' reference is planned for later.`);
          }
          break;

        case "|":
          if (this.match("|")) {
            tokens.push({ type: TokenType.PIPE_PIPE, value: "||", line: startLine, col: startCol });
          } else {
            throw new Error(`Unexpected character '|' on line ${startLine}, col ${startCol}.`);
          }
          break;

        case ";":
          tokens.push({ type: TokenType.SEMICOLON, value: ";", line: startLine, col: startCol });
          break;
        case ",":
          tokens.push({ type: TokenType.COMMA, value: ",", line: startLine, col: startCol });
          break;
        case "(":
          tokens.push({ type: TokenType.LPAREN, value: "(", line: startLine, col: startCol });
          break;
        case ")":
          tokens.push({ type: TokenType.RPAREN, value: ")", line: startLine, col: startCol });
          break;
        case "{":
          tokens.push({ type: TokenType.LBRACE, value: "{", line: startLine, col: startCol });
          break;
        case "}":
          tokens.push({ type: TokenType.RBRACE, value: "}", line: startLine, col: startCol });
          break;
        case "[":
          tokens.push({ type: TokenType.LBRACKET, value: "[", line: startLine, col: startCol });
          break;
        case "]":
          tokens.push({ type: TokenType.RBRACKET, value: "]", line: startLine, col: startCol });
          break;

        default:
          throw new Error(`Unexpected character '${ch}' on line ${startLine}, col ${startCol}`);
      }
    }

    tokens.push({ type: TokenType.EOF, value: "", line: this.line, col: this.col });
    return tokens;
  }

  private peek(): string {
    return this.source[this.pos] || "\0";
  }

  private peekNext(): string {
    return this.source[this.pos + 1] || "\0";
  }

  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") {
      this.line++;
      this.col = 1;
    } else {
      this.col++;
    }
    return ch;
  }

  private match(expected: string): boolean {
    if (this.isAtEnd()) return false;
    if (this.source[this.pos] !== expected) return false;
    this.advance();
    return true;
  }

  private isAtEnd(): boolean {
    return this.pos >= this.source.length;
  }

  private isDigit(ch: string): boolean {
    return ch >= "0" && ch <= "9";
  }

  private isAlpha(ch: string): boolean {
    return (ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z");
  }

  private skipWhitespaceAndComments(): void {
    while (!this.isAtEnd()) {
      const ch = this.peek();

      if (ch === " " || ch === "\r" || ch === "\t" || ch === "\n") {
        this.advance();
      } else if (ch === "/" && this.peekNext() === "/") {
        // Single line comment
        while (!this.isAtEnd() && this.peek() !== "\n") {
          this.advance();
        }
      } else if (ch === "/" && this.peekNext() === "*") {
        // Multi-line comment
        this.advance(); // consume '/'
        this.advance(); // consume '*'
        while (!this.isAtEnd() && !(this.peek() === "*" && this.peekNext() === "/")) {
          this.advance();
        }
        if (!this.isAtEnd()) {
          this.advance(); // consume '*'
          this.advance(); // consume '/'
        }
      } else {
        break;
      }
    }
  }

  private skipPreprocessor(): void {
    // Skip everything until newline
    while (!this.isAtEnd() && this.peek() !== "\n") {
      this.advance();
    }
  }

  private skipUsingNamespace(): void {
    // Consumes "using" has been read. Now skip until ';'
    while (!this.isAtEnd() && this.peek() !== ";") {
      this.advance();
    }
    if (this.match(";")) {
      // done
    }
  }

  private readNumber(line: number, col: number): Token {
    let numStr = "";
    while (!this.isAtEnd() && this.isDigit(this.peek())) {
      numStr += this.advance();
    }
    return {
      type: TokenType.NUMBER,
      value: numStr,
      line,
      col,
    };
  }

  private readIdentifierOrKeyword(line: number, col: number): Token {
    let text = "";
    while (!this.isAtEnd() && (this.isAlpha(this.peek()) || this.isDigit(this.peek()) || this.peek() === "_")) {
      text += this.advance();
    }

    const keywordType = Lexer.KEYWORDS[text];
    if (keywordType) {
      return {
        type: keywordType,
        value: text,
        line,
        col,
      };
    }

    // Check for unsupported keywords
    const unsupported = ["struct", "class", "template", "switch", "case", "goto", "new", "delete", "pointer", "float", "double"];
    if (unsupported.includes(text)) {
      throw new Error(`unsupported: '${text}' on line ${line}`);
    }

    return {
      type: TokenType.IDENTIFIER,
      value: text,
      line,
      col,
    };
  }

  private readString(line: number, col: number): Token {
    this.advance(); // consume opening quote
    let str = "";

    while (!this.isAtEnd() && this.peek() !== '"') {
      if (this.peek() === "\n") {
        throw new Error(`Unterminated string on line ${line}`);
      }
      if (this.peek() === "\\") {
        this.advance();
        const esc = this.advance();
        if (esc === "n") str += "\n";
        else if (esc === "t") str += "\t";
        else if (esc === '"') str += '"';
        else if (esc === "\\") str += "\\";
        else str += esc;
      } else {
        str += this.advance();
      }
    }

    if (this.isAtEnd()) {
      throw new Error(`Unterminated string on line ${line}`);
    }

    this.advance(); // consume closing quote
    return {
      type: TokenType.STRING,
      value: str,
      line,
      col,
    };
  }

  private readChar(line: number, col: number): Token {
    this.advance(); // consume opening quote
    let charVal = "";

    if (this.isAtEnd() || this.peek() === "'") {
      throw new Error(`Empty character literal on line ${line}`);
    }

    if (this.peek() === "\\") {
      this.advance();
      const esc = this.advance();
      if (esc === "n") charVal = "\n";
      else if (esc === "t") charVal = "\t";
      else if (esc === "'") charVal = "'";
      else if (esc === "\\") charVal = "\\";
      else charVal = esc;
    } else {
      charVal = this.advance();
    }

    if (this.peek() !== "'") {
      throw new Error(`Unterminated character literal on line ${line}`);
    }
    this.advance(); // consume closing quote

    return {
      type: TokenType.CHAR_LITERAL,
      value: charVal,
      line,
      col,
    };
  }
}
