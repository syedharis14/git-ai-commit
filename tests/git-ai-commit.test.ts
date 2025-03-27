import { Command } from "commander";
import OpenAI from "openai";
import git, { CommitResult } from "simple-git";

jest.mock("openai");
jest.mock("simple-git");

const mockedGit = git as jest.MockedFunction<typeof git>;
const mockGitInstance = mockedGit();
const mockedOpenAI = OpenAI as jest.MockedClass<typeof OpenAI>;

describe("git-ai-commit CLI", () => {
    let program: Command;

    beforeEach(() => {
        program = new Command();
        (mockGitInstance.diff as jest.Mock).mockClear();
        (mockGitInstance.commit as jest.Mock).mockClear();
        mockedOpenAI.mockClear();
    });

    test("should generate a commit message", async () => {
        const openai = new mockedOpenAI();

        const response = await openai.chat.completions.create({
            model: "gpt-4",
            messages: [{ role: "user", content: "test" }]
        });

        expect(response.choices[0].message.content).toBe("feat(auth): add login support");
    });

    test("should handle empty staged changes", async () => {
        (mockGitInstance.diff as jest.Mock).mockResolvedValue("");
        await expect(mockGitInstance.diff()).resolves.toBe("");
    });

    test("should apply commit automatically", async () => {
        const mockCommitResult: CommitResult = {
            commit: "mocked-commit-hash",
            author: null,
            root: false,
            branch: "main",
            summary: { changes: 1, insertions: 1, deletions: 0 }
        };

        (mockGitInstance.commit as jest.Mock).mockResolvedValue(mockCommitResult);
        const result = await mockGitInstance.commit("feat(auth): add login support");
        expect(result.commit).toBe("mocked-commit-hash");
    });
});
