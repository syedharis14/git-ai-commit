import chalk from "chalk";
import { Command } from "commander";

const program = new Command();

program.name("git-ai-commit").description("AI-powered commit message generator").version("0.1.0");

program
    .command("generate")
    .description("Generate an AI-powered commit message")
    .action(() => {
        console.log(chalk.green("🚀 AI-generated commit message:"));
        console.log(chalk.blue('"Refactored authentication logic for better security and maintainability."'));
    });

program.parse(process.argv);
