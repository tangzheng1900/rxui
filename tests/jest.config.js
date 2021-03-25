module.exports = {
  globals: {
    // 'ts-jest': {
    //   diagnostics: false,
    //   isolatedModules: false,
    //   forceConsistentCasingInFileNames: false
    // }
    "ts-jest": {
      //"tsconfig": require('path').resolve(__dirname, '../tsconfig.json'),
      "allowJs": true,
      "isolatedModules": true,
    }
  },
  roots: [
    '<rootDir>'
  ],
  testRegex: '(.+)\\.test\\.(tsx?)$',
  transform: {
    '^.+\\.tsx?$': 'ts-jest',
    // '^.+\\.jsx?$': 'ts-jest',
    // "^.+\\.(css|less)$": "./styleMock.js"
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  moduleNameMapper: {
    '@type': require('path').resolve(__dirname, './index.d.ts'),
    '@mybricks/rxui': require('path').resolve(__dirname, '../src/index.ts')
  },
  // transformIgnorePatterns: [
  //   // "node_modules/(?!dom\.*api)"
  // ]
};
