#!/usr/bin/env node

import chalk from "chalk";
import clipboardy from "clipboardy";
import { Command } from "commander";
import { cosmiconfig } from "cosmiconfig";
import dotenv from "dotenv";
import fs from "fs";
import { OpenAI } from "openai";
import path from "path";
import simpleGit from "simple-git";
import updateNotifier from "update-notifier";
import winston from "winston";
import pkg from "./package.json";

type UsageData = {
    [date: string]: {
        [command: string]: number;
    };
};

// Initialize logging
const logger = winston.createLogger({
    level: "info",
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)
    ),
    transports: [new winston.transports.Console(), new winston.transports.File({ filename: "git-ai-commit.log" })]
});

// Tracking usage
const usageFile = path.resolve(process.cwd(), ".git-ai-commit-usage.json");

function logUsage(command: string) {
    try {
        const data: UsageData = fs.existsSync(usageFile) ? JSON.parse(fs.readFileSync(usageFile, "utf8")) : {};

        const today = new Date().toISOString().slice(0, 10);
        if (!data[today]) {
            data[today] = {};
        }
        if (!data[today][command]) {
            data[today][command] = 0;
        }
        data[today][command]++;

        fs.writeFileSync(usageFile, JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Failed to log usage:", e);
    }
}

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
        .option("--max-lines <number>", "Limit number of git diff lines sent to OpenAI", config.maxLines || 100)
        .option("-v, --verbose", "Enable detailed logging", false)
        .option(
            "--lang <language>",
            "Generate commit message in a specific language (e.g., en, es, fr, ur, ar)",
            config.lang || "en"
        )
        .action(async options => {
            const analyticsEnabled = config.analytics !== false;
            if (analyticsEnabled) logUsage("generate");

            try {
                if (options.verbose) logger.info("Verbose mode enabled.");

                logger.info("Checking for staged changes...");
                let diff = await git.diff(["--staged"]);

                if (!diff) {
                    logger.warn("No staged changes found.");
                    console.log(
                        chalk.yellow("⚠️ No staged changes found. Please stage changes before running this command.")
                    );
                    return;
                }

                // Limit number of lines sent to OpenAI
                const maxLines = parseInt(options.maxLines, 10) || 100;
                const diffLines = diff.split("\n");
                if (diffLines.length > maxLines) {
                    logger.warn(`Git diff too large (${diffLines.length} lines). Limiting to ${maxLines} lines.`);
                    diff = diffLines.slice(0, maxLines).join("\n") + "\n[...truncated]";
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
                            content: `Generate a conventional commit message in ${options.lang} language based on the following Git diff:\n\n${diff}`
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

    program
        .command("stats")
        .description("Show CLI usage statistics")
        .action(() => {
            try {
                const data: UsageData = JSON.parse(fs.readFileSync(usageFile, "utf8"));
                console.log("📊 Usage Statistics:\n");
                for (const [date, commands] of Object.entries(data)) {
                    console.log(`${date}:`);
                    for (const [cmd, count] of Object.entries(commands)) {
                        console.log(`  ${cmd}: ${count} time(s)`);
                    }
                }
            } catch {
                console.log("No usage data available yet.");
            }
        });

    program.parse(process.argv);
}

main();
