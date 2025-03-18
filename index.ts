#!/usr/bin/env node

import chalk from "chalk";
import clipboardy from "clipboardy";
import { Command } from "commander";
import { cosmiconfig } from "cosmiconfig";
import dotenv from "dotenv";
import { OpenAI } from "openai";
import simpleGit from "simple-git";
import updateNotifier from "update-notifier";
import winston from "winston";
import pkg from "./package.json";

// Initialize logging
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: "git-ai-commit.log" })]
});

async function main() {
    dotenv.config();

    const git = simpleGit();
    const explorer = cosmiconfig("git-ai-commit");
    const configResult = await explorer.search();
    const config = configResult?.config || {};
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    // Check for package updates
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
        .option("-v, --verbose", "Enable detailed logging", false)
        .action(async options => {
            try {
                if (options.verbose) logger.info("Verbose mode enabled.");

                logger.info("Checking for staged changes...");
                const diff = await git.diff(["--staged"]);

                if (!diff) {
                    logger.warn("No staged changes found.");
                    console.log(
                        chalk.yellow("⚠️ No staged changes found. Please stage changes before running this command.")
                    );
                    return;
                }

                logger.info("Sending git diff to OpenAI...");

                const response = await openai.chat.completions.create({
                    model: options.model,
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

                logger.info(`AI-Generated Commit Message: "${commitMessage}"`);

                console.log(chalk.green("✅ AI-Generated Commit Message:"));
                console.log(chalk.blue(`"${commitMessage}"`));

                if (options.copy) {
                    clipboardy.writeSync(commitMessage);
                    logger.info("Commit message copied to clipboard.");
                    console.log(chalk.green("📋 Commit message copied to clipboard!"));
                    return;
                }

                if (options.autoCommit) {
                    await git.commit(commitMessage);
                    logger.info("Commit applied automatically.");
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
                    logger.info("Commit applied after user confirmation.");
                    console.log(chalk.green("✅ Commit applied successfully!"));
                } else {
                    logger.info("Commit canceled by user.");
                    console.log(chalk.yellow("❌ Commit canceled by the user."));
                }
            } catch (error) {
                logger.error(`Error fetching AI-generated commit message: ${error}`);
                console.error(chalk.red("❌ Error fetching AI-generated commit message:"), error);
            }
        });

    program.parse(process.argv);
}

main();
