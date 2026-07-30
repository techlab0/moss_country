import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
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
];

export default eslintConfig;
