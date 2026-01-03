import antfu from '@antfu/eslint-config'

export default antfu({
  typescript: true,
  ignores: ['**/*.md'],
  rules: {
    'no-console': 'off',
  },
})
