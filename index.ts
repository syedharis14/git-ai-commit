import chalk from "chalk";
import clipboardy from "clipboardy";
import { Command } from "commander";
import { cosmiconfig } from "cosmiconfig";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import simpleGit from "simple-git";
import updateNotifier from "update-notifier";
import pkg from "./package.json";

async function main() {
    dotenv.config();

    const git = simpleGit();
    const explorer = cosmiconfig("git-ai-commit");
    const configResult = await explorer.search();
    const config = configResult?.config || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const notifier = updateNotifier({ pkg });
    if (notifier.update) {
        console.log(
            chalk.yellow(
                `🚀 A new version (${notifier.update.latest}) of git-ai-commit is available! Update now: npm i -g git-ai-commit`
            )
        );
    }

    const program = new Command();

    program.name("git-ai-commit").description("AI-powered commit message generator").version(pkg.version);

    program
        .command("generate")
        .description("Generate an AI-powered commit message")
        .option("-c, --copy", "Copy the commit message to clipboard instead of applying it", config.copy || false)
        .option("--auto-commit", "Automatically commit without confirmation", config.autoCommit || false)
        .option("--model <model>", "Specify OpenAI model (gpt-4o, gpt-3.5-turbo)", config.model || "gpt-4o")
        .action(async options => {
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

                const commitMessage =
                    response.choices[0]?.message?.content?.trim() || "Generated commit message unavailable.";

                console.log(chalk.green("✅ AI-Generated Commit Message:"));
                console.log(chalk.blue(`"${commitMessage}"`));

                if (options.copy) {
                    clipboardy.writeSync(commitMessage);
                    console.log(chalk.green("📋 Commit message copied to clipboard!"));
                    return;
                }

                if (options.autoCommit) {
                    await git.commit(commitMessage);
                    console.log(chalk.green("✅ Commit applied successfully!"));
                    return;
                }

                // Confirm before committing
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
                console.error(chalk.red("❌ Error fetching AI-generated commit message:"), error);
            }
        });

    program.parse(process.argv);
}

main();
