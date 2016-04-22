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

function parse(expr) {
  
}

module.exports = parse;

