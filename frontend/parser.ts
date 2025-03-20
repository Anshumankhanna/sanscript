import { Stmt, Program, Expr, BinaryExpr, NumericLiteral, Identifier, NullLiteral } from "./ast.ts";
import { tokenize, Token, TokenType } from "./lexer.ts";

export default class Parser {
	private tokens: Token[] = [];
	private not_eof(): boolean {
		return this.tokens[0].type !== TokenType.EOF
	}
	private at(): Token {
		return this.tokens[0] as Token;
	}
	private eat() {
		const prev = this.tokens.shift() as Token;
		return prev;
	}
	// Fix this because 'err' can have 'any' type currently but in future we want to make it more specific.
	// deno-lint-ignore no-explicit-any
	private expect(type: TokenType, err: any) {
		const prev = this.tokens.shift() as Token;

		if (!prev || prev.type !== type) {
			console.error("Parser Error:\n", err, prev, "- Expecting: ", type);
			Deno.exit(1);
		}

		return prev;
	}

	// Orders of Prescidence
	// AssignmentExpr
	// MemberExpr
	// FunctionCall
	// LogicalExpr
	// ComparisonExpr
	// AdditiveExpr
	// MultiplicativeExpr
	// UnaryExpr
	// PrimaryExpr
	
	private parse_primary_expr(): Expr {
		const tk = this.at().type;

		switch (tk) {
			case TokenType.Identifier: {
				// 'this.eat()' will return the value of current token and move to the next one at the same time.
				return {
					kind: "Identifier",
					symbol: this.eat().value
				} as Identifier;
			}
			case TokenType.Null: {
				this.eat();    // advance past null keyword.
				return {
					kind: "NullLiteral",
					value: "null"
				} as NullLiteral;
			}
			case TokenType.Number: {
				return {
					kind: "NumericLiteral",
					value: parseFloat(this.eat().value)
				} as NumericLiteral;
			}
			case TokenType.OpenParen: {
				this.eat();    // eat the opening paren
				const value = this.parse_expr();
				this.expect(
					TokenType.CloseParen,
					"Unexpected Token found inside parenthesised expression. Expected closing parenthesis"
				);    // closing paren
				return value;
			}
			// case TokenType.CloseParen:
			// case TokenType.EOF:
			default: {
				console.error("Unexpected token found during parsing!", this.at());
				Deno.exit(1);
			}
		}
	}
	private parse_multiplicative_expr(): Expr {
		let left = this.parse_primary_expr();

		while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
			const operator = this.eat().value;
			const right = this.parse_primary_expr();
			left = {
				kind: "BinaryExpr",
				left,
				right,
				operator
			} as BinaryExpr;
		}

		return left;
	}
	private parse_additive_expr(): Expr {
		let left = this.parse_multiplicative_expr();

		while (this.at().value === "+" || this.at().value === "-") {
			const operator = this.eat().value;
			const right = this.parse_multiplicative_expr();
			left = {
				kind: "BinaryExpr",
				left,
				right,
				operator
			} as BinaryExpr;
		}

		return left;
	}
	private parse_expr(): Expr {
		return this.parse_additive_expr();
	}
	private parse_stmt(): Stmt {
		// skip to parse_expr;
		return this.parse_expr();
	}

	public produceAST(sourceCode: string): Program {
		const program: Program = {
			kind: "Program",
			body: []
		};
		this.tokens = tokenize(sourceCode);

		// parse until end of file.
		while (this.not_eof()) {
			program.body.push(this.parse_stmt());
		}

		return program;
	}
}