import Parser from "./frontend/parser.ts";
import { createGlobalEnv } from "./runtime/environment.ts";
import { evaluate } from "./runtime/interpreter.ts";

async function run(filename: string) {
	const parser = new Parser();
	const env = createGlobalEnv()
	const input = await Deno.readTextFile(filename);
	const program = parser.produceAST(input);
	const result = evaluate(program, env);
	console.log(result)
}

function repl() {
	const parser = new Parser();
	const env = createGlobalEnv()

	// INTITIALIZE REPL
	console.log("\nRepl v0.1");

	while (true) {
		const input = prompt(">");

		// Check for no user input or exit keyword.
		if (!input || input.includes("exit")) {
			Deno.exit(0);
		}

		const program = parser.produceAST(input);
		const result = evaluate(program, env);

		console.log(result);
	}
}

// repl();
run("./test.txt");