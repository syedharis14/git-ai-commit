# git-ai-commit

![npm](https://img.shields.io/npm/v/@syedharis14/git-ai-commit?color=blue)

AI-powered Git commit message generator using OpenAI.

## Features

-   🚀 Generates AI-powered commit messages based on staged changes
-   📋 Optionally copies commit messages to clipboard
-   🔄 Auto-commit support
-   🌍 Supports multiple languages (`--lang` option)
-   📊 Usage statistics tracking
-   🔄 Update notifications

## Installation

```sh
npm install -g @syedharis14/git-ai-commit
```

## Usage

### Generate a Commit Message

```sh
git-ai-commit generate
```

### Auto Commit

```sh
git-ai-commit generate --auto-commit
```

### Copy Commit Message

```sh
git-ai-commit generate --copy
```

### Generate Message in Specific Language

```sh
git-ai-commit generate --lang fr
```

### View Usage Stats

```sh
git-ai-commit stats
```

## Configuration

Create a `.git-ai-commitrc` in your project root:

```json
{
    "model": "gpt-4o",
    "maxLines": 100,
    "autoCommit": false,
    "copy": false,
    "lang": "en",
    "analytics": true
}
```

## Environment Variables

Set `OPENAI_API_KEY` in your `.env` file:

```sh
OPENAI_API_KEY=your_api_key_here
```

## CI/CD Release Workflow

This package uses GitHub Actions for automatic releases and NPM publishing:

-   Runs tests and builds TypeScript
-   Pushes tags and releases to GitHub
-   Publishes to NPM and GitHub Packages

## Links

-   📦 [NPM Package](https://www.npmjs.com/package/@syedharis14/git-ai-commit)
-   📂 [GitHub Repository](https://github.com/syedharis14/git-ai-commit)
-   🐛 [Report Issues](https://github.com/syedharis14/git-ai-commit/issues)

## License

This project is licensed under the ISC License.
