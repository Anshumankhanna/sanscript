import { Identifier, BinaryExpr, AssignmentExpr, ObjectLiteral } from "../../frontend/ast.ts";
import Environment from "../environment.ts";
import { evaluate } from "../interpreter.ts";
import { NumberVal, RuntimeVal, MK_NULL, ObjectVal } from "../values.ts";

function eval_numeric_binary_expr(lhs: NumberVal, rhs: NumberVal, operator: string): NumberVal {
	let result = lhs.value;

	switch (operator) {
		case "+": {
			result += rhs.value;
			break;
		}
		case "-": {
			result -= rhs.value;
			break;
		}
		case "*": {
			result *= rhs.value;
			break;
		}
		case "/": {
			// TODO: Division by zero checks.
			result /= rhs.value;
			break;
		}
		case "%": {
			result %= rhs.value;
			break;
		}
		default: {
			console.error("Invalid operator!!", operator);
			break;
		}
	}

	return {
		type: "number",
		value: result
	};
}
export function eval_identifier(ident: Identifier, env: Environment): RuntimeVal {
	const val = env.lookupVar(ident.symbol);
	return val;
}
export function eval_binary_expr(binop: BinaryExpr, env: Environment): RuntimeVal {
	const lhs = evaluate(binop.left, env);
	const rhs = evaluate(binop.right, env);

	if (lhs.type === "number" && rhs.type === "number") {
		return eval_numeric_binary_expr(lhs as NumberVal, rhs as NumberVal, binop.operator);
	}

	return MK_NULL();
}
export function eval_assignment(node: AssignmentExpr, env: Environment): RuntimeVal {
	if (node.assigne.kind !== "Identifier") {
		throw `Invalid LHS inside assignment expr ${JSON.stringify(node.assigne)}`;
	}

	const varname = (node.assigne as Identifier).symbol;

	return env.assignVar(varname, evaluate(node.value, env));
};
export function eval_object_expr(obj: ObjectLiteral, env: Environment): RuntimeVal {
	const object: ObjectVal = { type: "object", properties: new Map() };

	for (const { key, value } of obj.properties) {
		const runtimeVal = value === undefined
			? env.lookupVar(key)
			: evaluate(value, env);

		object.properties.set(key, runtimeVal);
	}

	return object;
}