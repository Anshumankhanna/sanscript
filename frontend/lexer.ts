export enum TokenType {
	// Literal Types.
	Number,
	Identifier,

	// Keywords.
	Let,
	Const,

	// Grouping * Operators.
	BinaryOperator,
	Equals,
	Comma,
	Dot,
	Colon,
	Semicolon,
	OpenParen,    // (
	CloseParen,    // )
	OpenBrace,    // {
	CloseBrace,    // }
	OpenBracket,    // [
	CloseBracket,    // ]
	EOF // Signifies the end of file.
};

const KEYWORDS: Record<string, TokenType> = {
	let: TokenType.Let,
	const: TokenType.Const
}

export interface Token {
	value: string;
	type: TokenType;
};

// must handle 'value' here better'.
function token(value = "", type: TokenType): Token {
	return { type, value };
}

function isaplha(src: string): boolean {
	return src.toUpperCase() !== src.toLowerCase();
}

function isint(str: string): boolean {
	const c = str.charCodeAt(0);
	const bounds = ["0".charCodeAt(0), "9".charCodeAt(0)];

	return c >= bounds[0] && c <= bounds[1];
}

// there are more cases to handle here.
function isskippable(str: string): boolean {
	return str === " " || str === "\n" || str === "\t" || str === "\r";
}

export function tokenize(sourceCode: string): Token[] {
	const tokens = new Array<Token>();
	const src = sourceCode.split("");

	// build each token until end of file
	// this isn't the best way to parse to create tokens, find a better way
	while (src.length > 0) {
		switch (src[0]) {
			case "(": {
				tokens.push(token(src.shift(), TokenType.OpenParen));
				break;
			}
			case ")": {
				tokens.push(token(src.shift(), TokenType.CloseParen));
				break;
			}
			case "{": {
				tokens.push(token(src.shift(), TokenType.OpenBrace));
				break;
			}
			case "}": {
				tokens.push(token(src.shift(), TokenType.CloseBrace));
				break;
			}
			case "[": {
				tokens.push(token(src.shift(), TokenType.OpenBracket));
				break;
			}
			case "]": {
				tokens.push(token(src.shift(), TokenType.CloseBracket));
				break;
			}
			case "+":
			case "-":
			case "*":
			case "/":
			case "%": {
				tokens.push(token(src.shift(), TokenType.BinaryOperator));
				break;
			}
			case "=": {
				tokens.push(token(src.shift(), TokenType.Equals));
				break;
			}
			case ",": {
				tokens.push(token(src.shift(), TokenType.Comma));
				break;
			}
			case ".": {
				tokens.push(token(src.shift(), TokenType.Dot));
				break;
			}
			case ":": {
				tokens.push(token(src.shift(), TokenType.Colon));
				break;
			}
			case ";": {
				tokens.push(token(src.shift(), TokenType.Semicolon));
				break;
			}
			default: {
				// handle multicharacter tokens
				
				// build number token
				if (isint(src[0])) {
					let num = "";

					while (src.length > 0 && isint(src[0])) {
						num += src.shift();
					}

					tokens.push(token(num, TokenType.Number));
				} else if (isaplha(src[0])) {
					let identifier = "";

					while (src.length > 0 && isaplha(src[0])) {
						identifier += src.shift();
					}

					/* // check for reserved keywords,
					// if the identifier is a keyword then 'KEYWORDS[identifier]' returns some 'TokenType' otherwise it will return 'undefined',
					// however, we handling 'undefined' by using 'nullish operator' which would just give 'TokenType.Identifier' as the argument to the function in this case.
					tokens.push(token(identifier, KEYWORDS[identifier] ?? TokenType.Identifier)); */

					const reserved = KEYWORDS[identifier];

					
					if (typeof reserved === "number") {
						tokens.push(token(identifier, reserved));
					} else {
						tokens.push(token(identifier, TokenType.Identifier));
					}
				} else if (isskippable(src[0])) {
					src.shift();    // SKIP THE CURRENT CHARACTER
				} else {
					console.log(`Unrecognized character found in source: ${src[0]}`);
					Deno.exit(1);
				}
			}
		}
	}

	tokens.push({ value: "EndOfFile" , type: TokenType.EOF });

	return tokens;
}