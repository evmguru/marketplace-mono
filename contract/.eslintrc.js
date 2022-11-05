module.exports = {
  env: {
    es2021: true,
    node: true,
  },
  extends: [
    "airbnb-base",
    // 'plugin:jest/recommended',
    "plugin:security/recommended",
  ],
  parserOptions: {
    ecmaVersion: 2020,
    project: ["tsconfig.json"],
    tsconfigRootDir: __dirname,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint"],
  ignorePatterns: [".eslintrc.js"],
  overrides: [
    // only apply TS parser on TS files
    {
      files: ["*.ts"],
      extends: [
        "airbnb-typescript/base",
        "plugin:@typescript-eslint/recommended",
        "plugin:@typescript-eslint/recommended-requiring-type-checking",
      ],
      parserOptions: {
        project: ["./tsconfig.json"], // Specify it only for TypeScript files
      },
      rules: {
        // typescripts
        "@typescript-eslint/semi": [1, "never"],
        "@typescript-eslint/strict-boolean-expressions": 0,
        "@typescript-eslint/explicit-module-boundary-types": 0,
        "@typescript-eslint/no-unsafe-call": "warn",
        "@typescript-eslint/naming-convention": "warn",
        "@typescript-eslint/ban-ts-comment": "warn",
      },
    },
  ],
  rules: {
    // 1 is 'warning', 2 is 'error' (error prevents compiling)
    semi: [1, "never"],
    "comma-dangle": [1, "always-multiline"],
    "consistent-return": "warn",
    "import/first": "off",
    "import/no-extraneous-dependencies": [
      1,
      {
        devDependencies: false,
        optionalDependencies: false,
        peerDependencies: false,
      },
    ],
    "import/prefer-default-export": "off",
    "max-classes-per-file": "off",
    "max-len": [1, { code: 200 }],
    "no-await-in-loop": "warn",
    "no-continue": "off",
    "no-nested-ternary": "off",
    "no-param-reassign": "warn",
    "no-plusplus": "off",
    "no-underscore-dangle": "off",
    "no-unused-vars": "warn",
    "no-multiple-empty-lines": "off",
    "no-restricted-syntax": "warn",
    radix: "off",

    "func-names": "off",
    "prefer-arrow-callback": "off",
    "prefer-destructuring": "off",
    quotes: "double",
  },
};
