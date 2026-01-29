module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    // Ensina ao Jest que '@/' é a pasta 'src/'
    '^@/(.*)$': '<rootDir>/src/$1',
    // Ignora arquivos de estilo e imagens que quebram o teste
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '\\.(jpg|jpeg|png|gif|webp|svg)$': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    // Processa arquivos .tsx e .ts
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.app.json' // Se der erro, mude para 'tsconfig.json'
    }],
  },
};