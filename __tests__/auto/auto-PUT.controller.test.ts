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
import axios from 'axios';
import { loginRest } from '../login';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const geaendertesAuto: Omit<Auto, 'modellnr'> = {
    // modellnr wird nicht geaendet
    modell: 'Geaendert',
    verbrauch: 1,
    typ: 'SPORTWAGEN',
    marke: 'AUDI',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    homepage: 'https://test.te',
    herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
};
const idVorhanden = '000000000000000000000003';

const geaendertesAutoIdNichtVorhanden: Omit<Auto, 'homepage' | 'modellnr'> = {
    modell: 'Nichtvorhanden',
    verbrauch: 1,
    typ: 'SPORTWAGEN',
    marke: 'AUDI',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
};
const idNichtVorhanden = '999999999999999999999999';

const geaendertesAutoInvalid: Record<string, unknown> = {
    modell: '?!$',
    verbrauch: -1,
    typ: 'UNSICHTBAR',
    marke: 'NO_VERLAG',
    preis: 0.01,
    rabatt: 2,
    lieferbar: true,
    datum: '12345-123-123',
    modellnr: 'falsche-MODELLNR',
    herstellorte: [],
};

// modellnr wird nicht geaendet
const veraltesAuto: Omit<Auto, 'modellnr'> = {
    modell: 'Veraltet',
    verbrauch: 1,
    typ: 'SPORTWAGEN',
    marke: 'AUDI',
    preis: 33.33,
    rabatt: 0.033,
    lieferbar: true,
    datum: '2016-02-03',
    homepage: 'https://test.te',
    herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
};

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;
// eslint-disable-next-line @typescript-eslint/naming-convention
const headers: Record<string, string> = { 'Content-Type': 'application/json' };

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('PUT /api/:id', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();

        const baseURL = `https://${host}:${port}`;
        client = axios.create({
            baseURL,
            headers,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    test('Vorhandenes Auto aendern', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.NO_CONTENT);
        expect(data).toBe('');
    });

    test('Nicht-vorhandenes Auto aendern', async () => {
        // given
        const url = `/${apiPath}/${idNichtVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaendertesAutoIdNichtVorhanden,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.PRECONDITION_FAILED);
        expect(data).toBe(
            `Es gibt kein Auto mit der ID "${idNichtVorhanden}".`,
        );
    });

    test('Vorhandenes Auto aendern, aber mit ungueltigen Daten', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaendertesAutoInvalid,
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

    test('Vorhandenes Auto aendern, aber ohne Versionsnummer', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        delete headers['If-Match'];

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.PRECONDITION_REQUIRED);
        expect(data).toBe('Header "If-Match" fehlt');
    });

    test('Vorhandenes Auto aendern, aber mit alter Versionsnummer', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        const token = await loginRest(client);
        headers.Authorization = `Bearer ${token}`;
        headers['If-Match'] = '"-1"';

        // when
        const response: AxiosResponse<string> = await client.put(
            url,
            veraltesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.PRECONDITION_FAILED);
        expect(data).toEqual(expect.stringContaining('Die Versionsnummer'));
    });

    test('Vorhandenes Auto aendern, aber ohne Token', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        delete headers.Authorization;
        headers['If-Match'] = '"0"';

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });

    test('Vorhandenes Auto aendern, aber mit falschem Token', async () => {
        // given
        const url = `/${apiPath}/${idVorhanden}`;
        const token = 'FALSCH';
        headers.Authorization = `Bearer ${token}`;

        // when
        const response: AxiosResponse<Record<string, any>> = await client.put(
            url,
            geaendertesAuto,
            { headers },
        );

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.FORBIDDEN);
        expect(data.statusCode).toBe(HttpStatus.FORBIDDEN);
    });
});
