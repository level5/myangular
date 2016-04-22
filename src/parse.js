'use strict';

/*
 * 
 * Input String         "a + b"
 * 
 *                Lexer
 * 
 * Tokens               [
 *                        { text: 'a', identifier: true },
 *                        { text: '+' },
 *                        { text: 'b', identifier: true }
 *                      ]
 * 
 *              AST Builder
 * 
 * Abstract             {
 *  Syntax                type: AST.BinaryExpression,
 *   Tree                 operator: '+',
 *                        left: {
 *                          type: AST.Identifier,
 *                          name: 'a'
 *                        },
 *                        right: {
 *                          type: AST.Identifier,
 *                          name: 'b'
 *                        }
 *                      }
 * 
 *              AST Compiler
 * 
 * Expression           function(scope) {
 * Function               return scope.a + scope.b;
 *                      }
 */

var _ = require('lodash');

function Lexer() {

}

Lexer.prototype.lex = function(text) {
  this.text = text;
  this.index = 0;
  this.ch = undefined;
  this.tokens = [];

  while (this.index < this.text.length) {
    this.ch = this.text.charAt(this.index);
    if (this.isNumber(this.ch) ||
      this.ch === '.' && this.isNumber(this.peek())) {
      this.readNumber();
    } else if (this.ch === '\'' || this.ch === '"') {
      this.readString(this.ch);
    } else {
      throw 'Unexpected next character: ' + this.ch;
    }
  }

  return this.tokens;
};

Lexer.prototype.isNumber = function(ch) {
  return '0' <= ch && ch <= '9';
};

Lexer.prototype.isExpOperator = function(ch) {
  return ch === '-' || ch === '+' || this.isNumber(ch);
};

Lexer.prototype.peek = function() {
  return this.index < this.text.length - 1 ?
    this.text.charAt(this.index + 1) :
    false;
};

Lexer.prototype.readNumber = function() {
  var number = '';
  while(this.index < this.text.length) {
    var ch = this.text.charAt(this.index).toLowerCase();
    if (ch === '.' || this.isNumber(ch)) {
      number += ch;
    } else {
      var nextCh = this.peek();
      var prevCh = number.charAt(number.length - 1);
      if (ch === 'e' && this.isExpOperator(nextCh)) {
        number += ch;
      } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                    nextCh && this.isNumber(nextCh)) {
        number += ch;
      } else if (this.isExpOperator(ch) && prevCh === 'e' &&
                    !this.isNumber(nextCh)) {
        // 这里的ch只会是+或者-，因为数字的话，第一个if分支会处理掉的。所以要求
        // nextCh必须是数字
        throw "Invalid exponent";
      } else {
        break;
      }
    }
    this.index++;
  }
  this.tokens.push({
    text: number,
    value: Number(number)
  });
};

var ESCAPES = {
  'n': '\n', 'f': '\f', 'r': '\r', 't': '\t',
  'v': '\v', '\'': '\'', '"': '"'
}

Lexer.prototype.readString = function(quote) {
  this.index++;
  var string = '';
  var escape = false;
  while(this.index < this.text.length) {
    var ch = this.text.charAt(this.index);
    if (escape) {
      var replacement = ESCAPES[ch];
      if (replacement) {
        string += replacement;
      } else {
        string += ch;
      }
      escape = false;
    } else if (ch === quote) {
      this.index++;
      this.tokens.push({
        text: string,
        value: string
      });
      return;
    } else if (ch === '\\') {
      escape = true;
    } else {
      string += ch;
    }
    this.index++;
  }
  throw 'Unmatched quote';
};

function AST(lexer) {
  this.lexer = lexer;
}
AST.Program = 'Program';
AST.Literal = 'Literal';

AST.prototype.ast = function(text) {
  this.tokens = this.lexer.lex(text);
  return this.program();
};

AST.prototype.program = function() {
  return {type: AST.Program, body: this.constant()};
};

AST.prototype.constant = function() {
  return {type: AST.Literal, value: this.tokens[0].value};
};

function ASTCompiler(astBuilder) {
  this.astBuilder = astBuilder;
};

ASTCompiler.prototype.compile = function(text) {
  var ast = this.astBuilder.ast(text);
  this.state = {body: []};
  this.recurse(ast);

  /* jshint -W054 */
  return new Function(this.state.body.join(''));
  /* jshint +W054 */
};

ASTCompiler.prototype.recurse = function(ast) {
  switch (ast.type) {
    case AST.Program:
      this.state.body.push('return ', this.recurse(ast.body), ';');
      break;
    case AST.Literal:
      return this.escape(ast.value);
    default:

  }
};

ASTCompiler.prototype.escape = function (value) {
  if (_.isString(value)) {
    return '\'' + 
        + value.replace(this.stringEscapeRegex, this.stringEscapeFn) + 
        '\'';
  } else {
    return value;
  }
};

ASTCompiler.prototype.stringEscapeRegex = /[^ a-zA-Z0-9]/g;
ASTCompiler.prototype.stringEscapeFn = function(c) {
  return '\\u' + ('0000' + c.charCodeAt(0).toString(16).slice(-4));
}


function Parser(lexer) {
  this.lexer = lexer;
  this.ast = new AST(this.lexer);
  this.astCompiler = new ASTCompiler(this.ast);
}

Parser.prototype.parse = function(text) {
  return this.astCompiler.compile(text);
};

function parse(expr) {
  var lexer = new Lexer();
  var parser = new Parser(lexer);
  return parser.parse(expr);
}


module.exports = parse;