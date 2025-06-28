import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: ['dist'],
  },
  tseslint.configs.recommended,
  prettierConfig,
);
