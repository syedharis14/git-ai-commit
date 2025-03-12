import chalk from "chalk";
import { Command } from "commander";
import simpleGit from "simple-git";

const git = simpleGit();
const program = new Command();

program.name("git-ai-commit").description("AI-powered commit message generator").version("0.1.0");

program
    .command("generate")
    .description("Generate an AI-powered commit message")
    .action(async () => {
        try {
            const diff = await git.diff(["--staged"]);

            if (!diff) {
                console.log(
                    chalk.yellow("⚠️ No staged changes found. Please stage changes before running this command.")
                );
                return;
            }

            console.log(chalk.green("📝 Git Diff Extracted:"));
            console.log(chalk.blue(diff));
        } catch (error) {
            console.error(chalk.red("❌ Error extracting git diff:"), error);
        }
    });

program.parse(process.argv);
