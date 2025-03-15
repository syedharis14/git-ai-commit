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
    .description("Generate and apply an AI-powered commit message")
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
                            "You are an expert at writing Conventional Commits messages. Follow these rules:\n" +
                            "1. Format: <type>(<scope>): <subject>\n" +
                            "2. Types: feat, fix, chore, docs, style, refactor, perf, test\n" +
                            "3. Scope: Optional technical context (e.g., component, module)\n" +
                            "4. Subject: Imperative tense, <= 50 chars, no period\n\n" +
                            "Examples:\n" +
                            "- feat(auth): add OAuth2 login endpoint\n" +
                            "- fix(server): resolve memory leak in request handler\n" +
                            "- chore(deps): update lodash to 4.17.21\n" +
                            "- refactor(ui): simplify dashboard component structure\n\n" +
                            "Requirements:\n" +
                            "- Analyze the git diff carefully\n" +
                            "- Identify primary change type and scope\n" +
                            "- Use technical terms but avoid jargon\n" +
                            "- For breaking changes, append ! after type and include BREAKING CHANGE in body\n\n" +
                            "Respond ONLY with the formatted commit message. No explanations or markdown."
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

            const shouldCommit = await new Promise(resolve => {
                process.stdout.write(chalk.yellow("💡 Do you want to apply this commit? (y/n): "));
                process.stdin.once("data", data => {
                    resolve(data.toString().trim().toLowerCase() === "y");
                });
            });

            if (shouldCommit) {
                await git.commit(commitMessage);
                console.log(chalk.green("✅ Commit applied successfully!"));
            } else {
                console.log(chalk.yellow("❌ Commit canceled by the user."));
            }
        } catch (error) {
            console.error(chalk.red("❌ Error applying AI-generated commit message:"), error);
        }
    });

program.parse(process.argv);
