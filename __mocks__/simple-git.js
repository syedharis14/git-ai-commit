"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockInstance = {
    diff: jest.fn(() => Promise.resolve("mocked git diff")),
    commit: jest.fn(() => Promise.resolve({
        commit: "mocked-commit-hash",
        author: null,
        root: false,
        branch: "main",
        summary: { changes: 1, insertions: 1, deletions: 0 }
    }))
};
const mockedGit = jest.fn(() => mockInstance);
exports.default = mockedGit;
