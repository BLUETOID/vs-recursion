export const TokenType = {
  // Keywords
  INT: "INT",
  BOOL: "BOOL",
  VOID: "VOID",
  CHAR: "CHAR",
  DOUBLE: "DOUBLE",
  FLOAT: "FLOAT",
  LONG: "LONG",
  UNSIGNED: "UNSIGNED",
  STRING_TYPE: "STRING_TYPE",
  AUTO: "AUTO",
  STATIC: "STATIC",
  CONST: "CONST",
  INLINE: "INLINE",
  BREAK: "BREAK",
  CONTINUE: "CONTINUE",
  IF: "IF",
  ELSE: "ELSE",
  FOR: "FOR",
  WHILE: "WHILE",
  RETURN: "RETURN",
  COUT: "COUT",
  CIN: "CIN",
  ENDL: "ENDL",
  TRUE: "TRUE",
  FALSE: "FALSE",
  VECTOR: "VECTOR",
  PAIR: "PAIR",
  TYPEDEF: "TYPEDEF",

  // Identifiers and Literals
  IDENTIFIER: "IDENTIFIER",
  NUMBER: "NUMBER",
  CHAR_LITERAL: "CHAR_LITERAL",
  STRING: "STRING",

  // Operators
  PLUS: "PLUS",               // +
  MINUS: "MINUS",             // -
  STAR: "STAR",               // *
  SLASH: "SLASH",             // /
  PERCENT: "PERCENT",         // %
  PLUS_PLUS: "PLUS_PLUS",     // ++
  MINUS_MINUS: "MINUS_MINUS", // --
  AMP: "AMP",                 // &
  PIPE: "PIPE",               // |
  CARET: "CARET",             // ^
  TILDE: "TILDE",             // ~
  QUESTION: "QUESTION",       // ?
  COLON: "COLON",             // :
  COLON_COLON: "COLON_COLON", // ::
  DOT: "DOT",                 // .
  ARROW: "ARROW",             // ->

  // Comparison
  EQ_EQ: "EQ_EQ",             // ==
  BANG_EQ: "BANG_EQ",         // !=
  LESS: "LESS",               // <
  GREATER: "GREATER",         // >
  LESS_EQ: "LESS_EQ",         // <=
  GREATER_EQ: "GREATER_EQ",   // >=

  // Logical
  AMP_AMP: "AMP_AMP",         // &&
  PIPE_PIPE: "PIPE_PIPE",     // ||
  BANG: "BANG",               // !

  // Assignment
  EQUAL: "EQUAL",             // =
  PLUS_EQUAL: "PLUS_EQUAL",   // +=
  MINUS_EQUAL: "MINUS_EQUAL", // -=
  STAR_EQUAL: "STAR_EQUAL",   // *=
  SLASH_EQUAL: "SLASH_EQUAL", // /=
  PERCENT_EQUAL: "PERCENT_EQUAL", // %=

  // Stream
  SHL: "SHL",                 // <<
  SHR: "SHR",                 // >>

  // Punctuation
  SEMICOLON: "SEMICOLON",     // ;
  COMMA: "COMMA",             // ,
  LPAREN: "LPAREN",           // (
  RPAREN: "RPAREN",           // )
  LBRACE: "LBRACE",           // {
  RBRACE: "RBRACE",           // }
  LBRACKET: "LBRACKET",       // [
  RBRACKET: "RBRACKET",       // ]

  EOF: "EOF",
} as const;

export type TokenType = (typeof TokenType)[keyof typeof TokenType];

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  col: number;
}
