export type NodeType =
	// STATEMENTS
	| "Program"
	| "VarDeclaration"

	// EXPRESSIONS
	| "BinaryExpr"
	| "AssignmentExpr"
	| "MemberExpr"
	| "CallExpr"

	// Literals
	| "Property"
	| "ObjectLiteral"
	| "NumericLiteral"
	| "Identifier";
//   | "UnaryExpr"
//   | "FunctionDeclaration";

export interface Stmt {
	kind: NodeType;
};

export interface Program extends Stmt {
	kind: "Program";
	body: Stmt[];
};

export interface VarDeclaration extends Stmt {
	kind: "VarDeclaration";
	constant: boolean;
	identifier: string;
	value?: Expr;
};

export interface Expr extends Stmt { };

export interface BinaryExpr extends Expr {
	kind: "BinaryExpr";
	left: Expr;
	right: Expr;
	operator: string;
};

export interface Identifier extends Expr {
	kind: "Identifier";
	symbol: string;
};

export interface NumericLiteral extends Expr {
	kind: "NumericLiteral";
	value: number;
};

export interface AssignmentExpr extends Expr {
	kind: "AssignmentExpr";
	// why is 'assigne' not a 'string' and instead a 'Expr'?
	// x = { foo: "Bar" }
	// x.foo = "Baz"
	// The above thing won't be valid if 'assigne' was a 'string' as 'x.foo' isn't an identifier that can be looked up in any environment.
	assigne: Expr;
	value: Expr;
}

export interface Property extends Expr {
	kind: "Property";
	key: string;
	// need to support syntax like this {key} where the variable has the value and varname is 'key' so you don't need to write it like this { key: key },
	// basically allowing shorthand syntax.
	value?: Expr;
}

export interface ObjectLiteral extends Expr {
	kind: "ObjectLiteral";
	properties: Property[];
}