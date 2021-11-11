/* eslint-disable no-underscore-dangle, @typescript-eslint/no-non-null-assertion */
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
import type { AutosDTO } from '../auto';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import each from 'jest-each';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const modellVorhanden = ['a', 't', 'g'];
const modellNichtVorhanden = ['xx', 'yy'];
const herstellorteVorhanden = ['javascript', 'typescript'];
const herstellorteNichtVorhanden = ['csharp', 'php'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GET /api', () => {
    beforeAll(async () => {
        await createTestserver();
        const baseURL = `https://${host}:${port}/${apiPath}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: () => true,
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    test('Alle Autos', async () => {
        // given

        // when
        const response: AxiosResponse<AutosDTO> = await client.get('');

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data).toBeDefined();

        const { autos } = data._embedded;

        autos
            .map((auto) => auto._links.self.href)
            .forEach((selfLink) => {
                expect(selfLink).toEqual(
                    expect.stringContaining(`/${apiPath}`),
                );
            });
    });

    each(modellVorhanden).test(
        'Autos mit einem Modell, der "%s" enthaelt',
        async (teilModell: string) => {
            // given
            const params = { modell: teilModell };

            // when
            const response: AxiosResponse<AutosDTO> = await client.get('', {
                params,
            });

            // then
            const { status, headers, data } = response;

            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            expect(data).toBeDefined();

            const { autos } = data._embedded;

            // Jedes Auto hat einen Modell mit dem Teilstring 'a'
            autos
                .map((auto) => auto.modell!)
                .forEach((modell: string) =>
                    expect(modell.toLowerCase()).toEqual(
                        expect.stringContaining(teilModell),
                    ),
                );
        },
    );

    each(modellNichtVorhanden).test(
        'Keine Autos mit einem Modell, der "%s" enthaelt',
        async (teilModell: string) => {
            // given
            const params = { modell: teilModell };

            // when
            const response: AxiosResponse<string> = await client.get('', {
                params,
            });

            // then
            const { status, data } = response;

            expect(status).toBe(HttpStatus.NOT_FOUND);
            expect(data).toMatch(/^not found$/iu);
        },
    );

    each(herstellorteVorhanden).test(
        'Mind. 1 Auto mit dem Herstellort "%s"',
        async (herstellort: string) => {
            // given
            const params = { [herstellort]: 'true' };

            // when
            const response: AxiosResponse<AutosDTO> = await client.get('', {
                params,
            });

            // then
            const { status, headers, data } = response;

            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            // JSON-Array mit mind. 1 JSON-Objekt
            expect(data).toBeDefined();

            const { autos } = data._embedded;

            // Jedes Auto hat im Array der Herstellorte z.B. "javascript"
            autos
                .map((auto) => auto.herstellorte!)
                .forEach((herstellorte) =>
                    expect(herstellorte).toEqual(
                        expect.arrayContaining([herstellort.toUpperCase()]),
                    ),
                );
        },
    );

    each(herstellorteNichtVorhanden).test(
        'Keine Autos mit dem Herstellort "%s"',
        async (herstellort: string) => {
            // given
            const params = { [herstellort]: 'true' };

            // when
            const response: AxiosResponse<string> = await client.get('', {
                params,
            });

            // then
            const { status, data } = response;

            expect(status).toBe(HttpStatus.NOT_FOUND);
            expect(data).toMatch(/^not found$/iu);
        },
    );

    test('Keine Autos zu einer nicht-vorhandenen Property', async () => {
        // given
        const params = { foo: 'bar' };

        // when
        const response: AxiosResponse<string> = await client.get('', {
            params,
        });

        // then
        const { status, data } = response;

        expect(status).toBe(HttpStatus.NOT_FOUND);
        expect(data).toMatch(/^not found$/iu);
    });
});
/* eslint-enable no-underscore-dangle, @typescript-eslint/no-non-null-assertion */
