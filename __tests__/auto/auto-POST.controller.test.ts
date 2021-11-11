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
    apiPath,
    createTestserver,
    host,
    httpsAgent,
    port,
    shutdownTestserver,
} from '../testserver';
import type { Auto } from '../auto';
import { HttpStatus } from '@nestjs/common';
import { MAX_RATING } from '../auto';
import RE2 from 're2';
import axios from 'axios';
import { loginRest } from '../login';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const neuesAuto: Auto = {
    modell: 'Neu',
    verbrauch: 1,
    typ: 'SPORTWAGEN',
    marke: 'AUDI',
    preis: 99.99,
    rabatt: 0.099,
    lieferbar: true,
    datum: '2016-02-28',
    modellnr: '9780007006441',
    homepage: 'https://test.de/',
    herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
};
const neuesAutoInvalid: Record<string, unknown> = {
    modell: '!?$',
    verbrauch: -1,
    typ: 'UNSICHTBAR',
    marke: 'NO_VERLAG',
    preis: 0,
    rabatt: 2,
    lieferbar: true,
    datum: '12345123123',
    modellnr: 'falsche-MODELLNR',
    herstellorte: [],
};
const neuesAutoModellExistiert: Auto = {
    modell: 'Alpha',
    verbrauch: 1,
    typ: 'SPORTWAGEN',
    marke: 'AUDI',
    preis: 99.99,
    rabatt: 0.099,
    lieferbar: true,
    datum: '2016-02-28',
    modellnr: '9780007097326',
    homepage: 'https://test.de/',
    herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;
const headers: Record<string, string> = { 'Content-Type': 'application/json' }; // eslint-disable-line @typescript-eslint/naming-convention

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('POST /api', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();
        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    // (done?: DoneFn) => Promise<void | undefined | unknown> | void | undefined
    // close(callback?: (err?: Error) => void): this
    afterAll(async () => {
        await shutdownTestserver();
    });

    test('Neues Auto', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        const objectIdRegexp = new RE2('[\\dA-Fa-f]{24}', 'u');

        // when
        const response: AxiosResponse<string> = await client.post(
            `/${apiPath}`,
            neuesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.CREATED);

        const { location } = response.headers as { location: string };

        expect(location).toBeDefined();

        // ObjectID: Muster von HEX-Ziffern
        const indexLastSlash: number = location.lastIndexOf('/');
        const idStr = location.slice(indexLastSlash + 1);

        expect(idStr).toBeDefined();
        expect(objectIdRegexp.test(idStr)).toBe(true);

        expect(data).toBe('');
    });

    test('Neues Auto mit ungueltigen Daten', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            `/${apiPath}`,
            neuesAutoInvalid,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);
        expect(data).toEqual(
            expect.arrayContaining([
                'Ein Automodell muss mit einem Autostaben, einer Ziffer oder _ beginnen.',
                `Eine Bewertung muss zwischen 0 und ${MAX_RATING} liegen.`,
                'Die Typ eines Autoes muss FAMILIENKUTSCHE oder SPORTWAGEN sein.',
                'Die Marke eines Autoes muss AUDI oder BMW sein.',
                'Der Rabatt muss ein Wert zwischen 0 und 1 sein.',
                'Das Datum muss im Format yyyy-MM-dd sein.',
                'Die MODELLNR-Nummer ist nicht korrekt.',
            ]),
        );
    });

    test('Neues Auto, aber das Modell existiert bereits', async () => {
        // given
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<string> = await client.post(
            `/${apiPath}`,
            neuesAutoModellExistiert,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.BAD_REQUEST);
        expect(data).toEqual(expect.stringContaining('Modell'));
    });

    test('Neues Auto, aber ohne Token', async () => {
        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            `/${apiPath}`,
            neuesAuto,
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test('Neues Auto, aber mit falschem Token', async () => {
        // given
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.post(
            `/${apiPath}`,
            neuesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test.todo('Test mit abgelaufenem Token');
});
