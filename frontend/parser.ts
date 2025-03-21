import { Stmt, Program, Expr, BinaryExpr, NumericLiteral, Identifier, VarDeclaration, AssignmentExpr, Property, ObjectLiteral } from "./ast.ts";
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
	// ObjectExpr
	// MemberExpr
	// FunctionCall
	// LogicalExpr
	// ComparisonExpr
	// AdditiveExpr
	// MultiplicativeExpr
	// UnaryExpr
	// PrimaryExpr

	private parse_var_declaration(): Stmt {
		const isConstant = this.eat().type === TokenType.Const;
		const identifier = this.expect(TokenType.Identifier, "Expected identifier name following let | const keywords.").value;

		if (this.at().type === TokenType.Semicolon) {
			this.eat();    // expect semicolon.
			if (isConstant) {
				throw `Must assign value to constant expression. No value provided.`;
			}

			return {
				kind: "VarDeclaration",
				constant: false,
				identifier
			} as VarDeclaration;
		}

		this.expect(TokenType.Equals, "Expected equals token following identifier in var declaration.");

		const declaration = {
			kind: "VarDeclaration",
			constant: isConstant,
			identifier,
			value: this.parse_expr(),
		} as VarDeclaration;

		this.expect(TokenType.Semicolon, "Variable declaration statements must end with semicolon.");
		return declaration;
	}
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
	private parse_object_expr(): Expr {
		if (this.at().type !== TokenType.OpenBrace) {
			return this.parse_additive_expr();
		}

		this.eat();    // advance past open brace.
		
		const properties = new Array<Property>();

		while (this.not_eof() && this.at().type !== TokenType.CloseBrace) {
			const key = this.expect(TokenType.Identifier, "Object literal key expected.").value;
			
			// Allows shorthand key: pair -> { key, }
			if (this.at().type === TokenType.Comma) {
				this.eat();    // advance past comma
				properties.push({ kind: "Property", key });
				continue;
			} // Allows shorthand key: pair -> { key }
			else if (this.at().type === TokenType.CloseBrace) {
				properties.push({ kind: "Property", key });
				continue;
			}

			// { key: val }

			this.expect(TokenType.Colon, "Missing colon following identifier in ObjectExpr.");

			// We want to allow any expression as a value.
			const value = this.parse_expr();

			properties.push({ kind: "Property", key, value });

			if (this.at().type !== TokenType.CloseBrace) {
				this.expect(TokenType.Comma, "Expected comma or closing bracket following property.");
			}
		}

		this.expect(TokenType.CloseBrace, "Object literal missing closing brace.");

		return {
			kind: "ObjectLiteral",
			properties
		} as ObjectLiteral;
	}
	private parse_assignment_expr(): Expr {
		const left = this.parse_object_expr();

		if (this.at().type === TokenType.Equals) {
			this.eat();    // advance past equals sign.
			const value = this.parse_assignment_expr();
			return {
				kind: "AssignmentExpr",
				assigne: left,
				value
			} as AssignmentExpr;
		}

		// if 'left' is another expression.
		return left;
	}
	private parse_expr(): Expr {
		return this.parse_assignment_expr();
	}
	private parse_stmt(): Stmt {
		switch (this.at().type) {
			case TokenType.Let:
			case TokenType.Const: {
				return this.parse_var_declaration();
			}
			default: {
				return this.parse_expr();
			}
		}
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