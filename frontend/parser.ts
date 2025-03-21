import { Stmt, Program, Expr, BinaryExpr, NumericLiteral, Identifier, VarDeclaration, AssignmentExpr, Property, ObjectLiteral, CallExpr, MemberExpr } from "./ast.ts";
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
	// AdditiveExpr
	// MultiplicativeExpr
	// Call
	// Member
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
	private parse_member_expr(): Expr {
		let object = this.parse_primary_expr();

		while (this.at().type === TokenType.Dot || this.at().type === TokenType.OpenBracket) {
			const operator = this.eat();
			let property: Expr;
			let computed: boolean;

			// non-computed values aka obj.expr.
			if (operator.type === TokenType.Dot) {
				computed = false;
				// get identifier.
				property = this.parse_primary_expr();

				if (property.kind !== "Identifier") {
					throw `Cannot use dot operator without right hand side being an identifier.`;
				}
			} else {    // this allows obj[computedValue]
				computed = true;
				property = this.parse_expr();

				this.expect(TokenType.CloseBracket, "Missing closing bracket in computed value.");
			}

			object = {
				kind: "MemberExpr",
				object,
				property,
				computed
			} as MemberExpr;
 		}

		return object;
	}
	private parse_call_member_expr(): Expr {
		const member = this.parse_member_expr();

		if (this.at().type === TokenType.OpenParen) {
			return this.parse_call_expr(member);
		}

		return member;
	}
	private parse_call_expr(caller: Expr): Expr {
		let call_expr: Expr = {
			kind: "CallExpr",
			args: this.parse_args(),
			caller
		} as CallExpr;

		if (this.at().type === TokenType.OpenParen) {
			call_expr = this.parse_call_expr(call_expr);
		}

		return call_expr;
	}
	private parse_args(): Expr[] {
		this.expect(TokenType.OpenParen, "Expected open parenthesis.");

		// If we are at ')' then there are no arguments, otherwise there are arguments.
		const args: Expr[] = this.at().type === TokenType.CloseParen
			? []
			: this.parse_arguments_list();
		
		this.expect(TokenType.CloseParen, "Missing close parenthesis inside arguments list.");

		return args;
	}
	private parse_arguments_list(): Expr[] {
		const args = [this.parse_expr()];

		while (this.at().type === TokenType.Comma && this.eat()) {
			args.push(this.parse_expr());
		}

		return args;
	}
	private parse_multiplicative_expr(): Expr {
		let left = this.parse_call_member_expr();

		while (this.at().value === "*" || this.at().value === "/" || this.at().value === "%") {
			const operator = this.eat().value;
			const right = this.parse_call_member_expr();
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