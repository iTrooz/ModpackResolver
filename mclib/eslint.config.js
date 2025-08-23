import tseslint from "typescript-eslint";
import { defineConfig } from "eslint/config";


export default defineConfig([
  tseslint.configs.recommended,
  { 
    ignores: ['**/*.js'],
  },{
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // https://johnnyreilly.com/typescript-eslint-no-unused-vars
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          "args": "all",
          "argsIgnorePattern": "^_",
          "caughtErrors": "all",
          "caughtErrorsIgnorePattern": "^_",
          "destructuredArrayIgnorePattern": "^_",
          "varsIgnorePattern": "^_",
          "ignoreRestSiblings": true
        }
      ],
      "@typescript-eslint/no-namespace": "off"
    }
  }

]);
