import { defineConfig, globalIgnores } from 'eslint/config'
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // React Compiler導入時に既存コードを段階的に見直す。従来のlintエラー判定は維持する。
      'react-hooks/immutability': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      // 意図的に使わない変数・引数・catch束縛は _ 始まりにして明示する。
      // 「消し忘れ」と「シグネチャ上必要だが使わない」を区別できるようにするため。
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // <img> を next/image に置き換えるべきという提案。
      // 移行には各所で寸法指定・外部ドメイン許可・レイアウト確認が必要で、
      // 性能改善として別途取り組む案件のため、警告としては出さない。
      // （flat config へ移行する前の .eslintrc.json でも off にしていた方針を引き継ぐ）
      "@next/next/no-img-element": "off",
    },
  },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts']),
])

export default eslintConfig;
