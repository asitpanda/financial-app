import baseConfig from './vitest.config.mts';

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    include: ['src/**/*.controller.test.ts', 'src/**/*.api.test.ts'],
    coverage: {
      ...(baseConfig.test?.coverage ?? {}),
      include: ['src/**/*.controller.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/*.d.ts'],
      reportsDirectory: './coverage/api',
    },
  },
};