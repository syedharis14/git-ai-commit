module.exports = {
    preset: "ts-jest",
    testEnvironment: "node",
    moduleNameMapper: {
        "simple-git": "<rootDir>/__mocks__/simple-git.ts",
        "openai": "<rootDir>/__mocks__/openai.ts",
    }
};
