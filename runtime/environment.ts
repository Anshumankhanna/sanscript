import { MK_BOOL, MK_NULL, RuntimeVal } from "./values.ts";

export function createGlobalEnv() {
	const env = new Environment();

	// Create Default Global Environment
	env.declareVar("true", MK_BOOL(true), true);
	env.declareVar("false", MK_BOOL(false), true);
	env.declareVar("null", MK_NULL(), true);

	return env;
}

export default class Environment {
	private parent?: Environment;
	private variables: Map<string, RuntimeVal>;
	private constants: Set<string>;

	constructor (parentENV?: Environment) {
		this.parent = parentENV;
		this.variables = new Map();
		this.constants = new Set();
	}

	public declareVar(varname: string, value: RuntimeVal, constant: boolean): RuntimeVal {
		// If the variable is already in this scope then we can't redeclare it.
		if (this.variables.has(varname)) {
			throw `Cannot declare variable ${varname}. As it already is defined.`;
		}

		// Otherwise, we can put the variable in the 'variables' map with its 'value'.
		this.variables.set(varname, value);

		if (constant) {
			this.constants.add(varname);
		}

		return value;
	}
	public resolve(varname: string): Environment {
		// Check if the current scope has the variable.
		if (this.variables.has(varname)) {
			return this;
		}

		// If the current scope doesn't have the variable, does the current scope have a parent?
		// If no, then we can't find the variable.
		if (this.parent === undefined) {
			throw `Cannot resolve '${varname}' as it does not exist.`;
		}

		// If the current scope has a parent, and doesn't have the variable, we'll just check the parent to have the variable.
		return this.parent.resolve(varname);
	}
	public assignVar(varname: string, value: RuntimeVal): RuntimeVal {
		// Find the environment of the variable.
		// This tells us which 'variables' map is 'varname' a part of so we can correctly change its value there.
		const env = this.resolve(varname);

		// Cannot assign to constant
		if (env.constants.has(varname)) {
			throw `Cannot reassign to variable ${varname} as it was declared constant.`;
		}
		
		// Set the value for the variable.
		env.variables.set(varname, value);
		return value;
	}
	public lookupVar(varname: string): RuntimeVal {
		const env = this.resolve(varname);
		// here typescript throws an error if we don't put 'as RuntimeVal' because it thinks that 'get' can return 'undefined',
		// however, this isn't possible because we know that if 'env.variables' doesn't have 'varname' then we would be throwing an error,
		// TODO: Check if there's a better way to handle this.
		return env.variables.get(varname) as RuntimeVal;
	}
}