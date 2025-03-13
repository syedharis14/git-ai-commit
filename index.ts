import chalk from "chalk";
import { Command } from "commander";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import simpleGit from "simple-git";

dotenv.config();

const git = simpleGit();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

            console.log(chalk.green("📡 Sending git diff to OpenAI..."));

            const response = await openai.chat.completions.create({
                model: "gpt-4o",
                messages: [
                    {
                        role: "system",
                        content:
                            "You are an AI that writes concise and meaningful Git commit messages based on provided diffs."
                    },
                    {
                        role: "user",
                        content: `Here is the Git diff:\n\n${diff}\n\nGenerate a short, useful commit message:`
                    }
                ]
            });

            const commitMessage = response.choices[0]?.message?.content || "Generated commit message unavailable.";

            console.log(chalk.green("✅ AI-Generated Commit Message:"));
            console.log(chalk.blue(`"${commitMessage}"`));
        } catch (error) {
            console.error(chalk.red("❌ Error fetching AI-generated commit message:"), error);
        }
    });

program.parse(process.argv);
