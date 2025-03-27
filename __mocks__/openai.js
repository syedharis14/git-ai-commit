"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockCompletions = {
    create: jest.fn(() => Promise.resolve({
        id: "chatcmpl-123",
        object: "chat.completion",
        created: Date.now(),
        model: "gpt-4",
        choices: [
            {
                index: 0,
                message: {
                    role: "assistant",
                    content: "feat(auth): add login support",
                    function_call: undefined,
                    tool_calls: undefined,
                    refusal: null
                },
                finish_reason: "stop",
                logprobs: null
            }
        ],
        usage: {
            prompt_tokens: 9,
            completion_tokens: 12,
            total_tokens: 21
        }
    }))
};
const mockChat = {
    completions: mockCompletions
};
// Properly mimic the OpenAI SDK structure
const MockOpenAI = jest.fn().mockImplementation(() => ({
    chat: mockChat
    // Add other OpenAI API methods if needed
}));
exports.default = MockOpenAI;
