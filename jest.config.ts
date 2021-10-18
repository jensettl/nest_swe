/*
 * Copyright (C) 2020 - present Juergen Zimmermann, Hochschule Karlsruhe
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

// https://jestjs.io/docs/configuration
import type { Config } from '@jest/types';

const jestConfig: Config.InitialOptions = {
    // preset: 'ts-jest/presets/default-esm',
    preset: 'ts-jest',

    // globals: { 'ts-jest': { useESM: true } },

    bail: true,
    testMatch: ['<rootDir>/**/*.test.ts'],
    collectCoverageFrom: ['**/*.ts'],
    // default: ["/node_modules/"]
    coveragePathIgnorePatterns: [
        '<rootDir>/src/main.ts',
        '<rootDir>/src/health/',
        '<rootDir>/.scannerwork/',
        '<rootDir>/coverage/',
        '<rootDir>/dist/',
        '<rootDir>/node_modules/',
        '<rootDir>/scripts/',
        '<rootDir>/temp/',
        '<rootDir>/test/',
        '<rootDir>/jest.config.ts',
    ],
    coverageReporters: ['text-summary', 'html'],
    errorOnDeprecated: true,
    testTimeout: 10_000,
    verbose: true,
};

// export default jestConfig;
export default jestConfig;
