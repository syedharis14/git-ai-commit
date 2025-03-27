#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chalk_1 = __importDefault(require("chalk"));
const clipboardy_1 = __importDefault(require("clipboardy"));
const commander_1 = require("commander");
const cosmiconfig_1 = require("cosmiconfig");
const dotenv_1 = __importDefault(require("dotenv"));
const fs_1 = __importDefault(require("fs"));
const openai_1 = require("openai");
const path_1 = __importDefault(require("path"));
const simple_git_1 = __importDefault(require("simple-git"));
const update_notifier_1 = __importDefault(require("update-notifier"));
const winston_1 = __importDefault(require("winston"));
const package_json_1 = __importDefault(require("./package.json"));
// Initialize logging
const logger = winston_1.default.createLogger({
    level: "info",
    format: winston_1.default.format.combine(winston_1.default.format.timestamp(), winston_1.default.format.printf(({ timestamp, level, message }) => `${timestamp} [${level.toUpperCase()}]: ${message}`)),
    transports: [new winston_1.default.transports.Console(), new winston_1.default.transports.File({ filename: "git-ai-commit.log" })]
});
// Tracking usage
const usageFile = path_1.default.resolve(process.cwd(), ".git-ai-commit-usage.json");
function logUsage(command) {
    try {
        const data = fs_1.default.existsSync(usageFile) ? JSON.parse(fs_1.default.readFileSync(usageFile, "utf8")) : {};
        const today = new Date().toISOString().slice(0, 10);
        if (!data[today]) {
            data[today] = {};
        }
        if (!data[today][command]) {
            data[today][command] = 0;
        }
        data[today][command]++;
        fs_1.default.writeFileSync(usageFile, JSON.stringify(data, null, 2));
    }
    catch (e) {
        console.error("Failed to log usage:", e);
    }
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        dotenv_1.default.config();
        const git = (0, simple_git_1.default)();
        const explorer = (0, cosmiconfig_1.cosmiconfig)("git-ai-commit");
        const configResult = yield explorer.search();
        const config = (configResult === null || configResult === void 0 ? void 0 : configResult.config) || {};
        const openai = new openai_1.OpenAI({ apiKey: process.env.OPENAI_API_KEY });
        // Check for package updates
        const notifier = (0, update_notifier_1.default)({ pkg: package_json_1.default });
        if (notifier.update) {
            console.log(chalk_1.default.yellow(`🚀 A new version (${notifier.update.latest}) of git-ai-commit is available! Update now: npm i -g git-ai-commit`));
        }
        const program = new commander_1.Command();
        program.name("git-ai-commit").description("AI-powered commit message generator").version(package_json_1.default.version);
        program
            .command("generate")
            .description("Generate an AI-powered commit message")
            .option("-c, --copy", "Copy the commit message to clipboard instead of applying it", config.copy || false)
            .option("--auto-commit", "Automatically commit without confirmation", config.autoCommit || false)
            .option("--model <model>", "Specify OpenAI model (gpt-4o, gpt-3.5-turbo)", config.model || "gpt-4o")
            .option("--max-lines <number>", "Limit number of git diff lines sent to OpenAI", config.maxLines || 100)
            .option("-v, --verbose", "Enable detailed logging", false)
            .action((options) => __awaiter(this, void 0, void 0, function* () {
            var _a, _b, _c;
            const analyticsEnabled = config.analytics !== false;
            if (analyticsEnabled)
                logUsage("generate");
            try {
                if (options.verbose)
                    logger.info("Verbose mode enabled.");
                logger.info("Checking for staged changes...");
                let diff = yield git.diff(["--staged"]);
                if (!diff) {
                    logger.warn("No staged changes found.");
                    console.log(chalk_1.default.yellow("⚠️ No staged changes found. Please stage changes before running this command."));
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
                const response = yield openai.chat.completions.create({
                    model: options.model,
                    messages: [
                        {
                            role: "system",
                            content: "You are an expert at writing Conventional Commits messages. Follow these rules:\n" +
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
                const commitMessage = ((_c = (_b = (_a = response.choices[0]) === null || _a === void 0 ? void 0 : _a.message) === null || _b === void 0 ? void 0 : _b.content) === null || _c === void 0 ? void 0 : _c.trim()) || "Generated commit message unavailable.";
                logger.info(`AI-Generated Commit Message: "${commitMessage}"`);
                console.log(chalk_1.default.green("✅ AI-Generated Commit Message:"));
                console.log(chalk_1.default.blue(`"${commitMessage}"`));
                if (options.copy) {
                    clipboardy_1.default.writeSync(commitMessage);
                    logger.info("Commit message copied to clipboard.");
                    console.log(chalk_1.default.green("📋 Commit message copied to clipboard!"));
                    return;
                }
                if (options.autoCommit) {
                    yield git.commit(commitMessage);
                    logger.info("Commit applied automatically.");
                    console.log(chalk_1.default.green("✅ Commit applied successfully!"));
                    return;
                }
                // Confirm before committing
                const shouldCommit = yield new Promise(resolve => {
                    process.stdout.write(chalk_1.default.yellow("💡 Do you want to apply this commit? (y/n): "));
                    process.stdin.once("data", data => {
                        resolve(data.toString().trim().toLowerCase() === "y");
                    });
                });
                if (shouldCommit) {
                    yield git.commit(commitMessage);
                    logger.info("Commit applied after user confirmation.");
                    console.log(chalk_1.default.green("✅ Commit applied successfully!"));
                }
                else {
                    logger.info("Commit canceled by user.");
                    console.log(chalk_1.default.yellow("❌ Commit canceled by the user."));
                }
            }
            catch (error) {
                logger.error(`Error fetching AI-generated commit message: ${error}`);
                console.error(chalk_1.default.red("❌ Error fetching AI-generated commit message:"), error);
            }
        }));
        program
            .command("stats")
            .description("Show CLI usage statistics")
            .action(() => {
            try {
                const data = JSON.parse(fs_1.default.readFileSync(usageFile, "utf8"));
                console.log("📊 Usage Statistics:\n");
                for (const [date, commands] of Object.entries(data)) {
                    console.log(`${date}:`);
                    for (const [cmd, count] of Object.entries(commands)) {
                        console.log(`  ${cmd}: ${count} time(s)`);
                    }
                }
            }
            catch (_a) {
                console.log("No usage data available yet.");
            }
        });
        program.parse(process.argv);
    });
}
main();
