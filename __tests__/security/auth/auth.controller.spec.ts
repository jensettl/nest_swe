/*
 * Copyright (C) 2016 - present Juergen Zimmermann, Hochschule Karlsruhe
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

import type { AxiosInstance, AxiosResponse } from 'axios';
import { afterAll, beforeAll, describe, test } from '@jest/globals';
import {
    createTestserver,
    host,
    httpsAgent,
    loginPath,
    port,
    shutdownTestserver,
} from '../../testserver';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import dotenv from 'dotenv';
import each from 'jest-each';

dotenv.config();
const { env } = process;
const { USER_PASSWORD, USER_PASSWORD_FALSCH } = env;

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const username = 'admin';
const password = USER_PASSWORD;
const passwordFalsch = [USER_PASSWORD_FALSCH, USER_PASSWORD_FALSCH];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('REST-Schnittstelle /api/login', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();
        const baseURL = `https://${host}:${port}/${loginPath}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    test('Login mit korrektem Passwort', async () => {
        // given
        const body = `username=${username}&password=${password}`;

        // when
        const response: AxiosResponse<{ token: string }> = await client.post(
            '',
            body,
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.OK);

        const tokenStr: string = data.token;
        const tokenParts = tokenStr.split('.');

        expect(tokenParts).toHaveLength(3); // eslint-disable-line @typescript-eslint/no-magic-numbers
    });

    each(passwordFalsch).test(
        'Login mit falschem Passwort',
        async (pwd: string) => {
            // given
            const body = `username=${username}&password=${pwd}`;

            // when
            const response: AxiosResponse<Record<string, any>> =
                await client.post('', body);

            // then
            const { status, data } = response;

            expect(status).toBe(HttpStatus.UNAUTHORIZED);
            expect(data.statusCode).toBe(HttpStatus.UNAUTHORIZED);
            expect(data.message).toMatch(/^Unauthorized$/iu);
        },
    );

    test('Login ohne Benutzerkennung', async () => {
        // given
        const body = '';

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            '',
            body,
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.UNAUTHORIZED);
        expect(data.statusCode).toBe(HttpStatus.UNAUTHORIZED);
        expect(data.message).toMatch(/^Unauthorized$/iu);
    });
});
