import simpleGit, { CommitResult, Response, SimpleGit } from "simple-git";

const mockInstance: Partial<SimpleGit> = {
    diff: jest.fn(() => Promise.resolve("mocked git diff") as unknown as Response<string>),
    commit: jest.fn(
        () =>
            Promise.resolve({
                commit: "mocked-commit-hash",
                author: null,
                root: false,
                branch: "main",
                summary: { changes: 1, insertions: 1, deletions: 0 }
            } as CommitResult) as unknown as Response<CommitResult>
    )
};

const mockedGit = jest.fn(() => mockInstance as SimpleGit);

export default mockedGit as unknown as typeof simpleGit;
