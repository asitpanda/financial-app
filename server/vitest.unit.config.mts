import baseConfig from './vitest.config.mts';

export default {
  ...baseConfig,
  test: {
    ...baseConfig.test,
    exclude: ['src/**/*.controller.test.ts', 'src/**/*.api.test.ts'],
    coverage: {
      ...(baseConfig.test?.coverage ?? {}),
      include: ['src/**/*.ts'],
      exclude: [
        ...(baseConfig.test?.coverage?.exclude ?? []),
        'src/**/*.controller.ts',
      ],
      reportsDirectory: './coverage/unit',
    },
  },
};