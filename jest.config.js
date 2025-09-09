// Exclure les tests E2E Playwright du scope Jest
export default {
    testMatch: [
        "**/tests/unit/**/*.js",
        "**/tests/unit/**/*.cjs"
    ]
};
