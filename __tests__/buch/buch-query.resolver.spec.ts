/* eslint-disable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-extra-non-null-assertion */
/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
import type { GraphQLRequest, GraphQLResponse } from 'apollo-server-types';
import { afterAll, beforeAll, describe, test } from '@jest/globals';
import {
    createTestserver,
    host,
    httpsAgent,
    port,
    shutdownTestserver,
} from '../testserver';
import type { BuchDTOGraphQL } from '../buch';
import { HttpStatus } from '@nestjs/common';
import axios from 'axios';
import each from 'jest-each';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const idVorhanden = [
    '000000000000000000000001',
    '000000000000000000000002',
    '000000000000000000000003',
    '000000000000000000000004',
];

const titelVorhanden = ['Alpha', 'Beta'];

const teilTitelVorhanden = ['a', 'p'];

const teilTitelNichtVorhanden = ['Xyz', 'abc'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;
const graphqlPath = '/graphql';

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Queries', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();
        const baseURL = `https://${host}:${port}${graphqlPath}`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    each(idVorhanden).test('Buch zu vorhandener ID %s', async (id: string) => {
        // given
        const body: GraphQLRequest = {
            query: `
                {
                    buch(id: "${id}") {
                        titel
                        art
                        isbn
                        version
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();
        expect(data.data).toBeDefined();

        const { buch } = data.data!;
        const result: BuchDTOGraphQL = buch;

        expect(result.titel).toMatch(/^\w/u);
        expect(result.version).toBeGreaterThan(-1);
        expect(result.id).toBeUndefined();
    });

    test('Buch zu nicht-vorhandener ID', async () => {
        // given
        const id = '999999999999999999999999';
        const body: GraphQLRequest = {
            query: `
                {
                    buch(id: "${id}") {
                        titel
                    }
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.buch).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error!;

        expect(message).toBe(`Es wurde kein Buch mit der ID ${id} gefunden.`);
        expect(path).toBeDefined();
        expect(path!![0]).toBe('buch');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    each(titelVorhanden).test(
        'Buch zu vorhandenem Titel %s',
        async (titel: string) => {
            // given
            const body: GraphQLRequest = {
                query: `
                    {
                        buecher(titel: "${titel}") {
                            titel
                            art
                        }
                    }
                `,
            };

            // when
            const response: AxiosResponse<GraphQLResponse> = await client.post(
                '',
                body,
            );

            // then
            const { status, headers, data } = response;

            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            expect(data.errors).toBeUndefined();

            expect(data.data).toBeDefined();

            const { buecher } = data.data!;

            expect(buecher).not.toHaveLength(0);

            const buecherArray: BuchDTOGraphQL[] = buecher;

            expect(buecherArray).toHaveLength(1);

            const [buch] = buecherArray;

            expect(buch!.titel).toBe(titel);
        },
    );

    each(teilTitelVorhanden).test(
        'Buch zu vorhandenem Teil-Titel %s',
        async (teilTitel: string) => {
            // given
            const body: GraphQLRequest = {
                query: `
                    {
                        buecher(titel: "${teilTitel}") {
                            titel
                            art
                        }
                    }
                `,
            };

            // when
            const response: AxiosResponse<GraphQLResponse> = await client.post(
                '',
                body,
            );

            // then
            const { status, headers, data } = response;

            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            expect(data.errors).toBeUndefined();
            expect(data.data).toBeDefined();

            const { buecher } = data.data!;

            expect(buecher).not.toHaveLength(0);

            (buecher as BuchDTOGraphQL[])
                .map((buch) => buch.titel!)
                .forEach((titel: string) =>
                    expect(titel.toLowerCase()).toEqual(
                        expect.stringContaining(teilTitel),
                    ),
                );
        },
    );

    each(teilTitelNichtVorhanden).test(
        'Buch zu nicht vorhandenem Titel %s',
        async (teilTitel: string) => {
            // given
            const body: GraphQLRequest = {
                query: `
                    {
                        buecher(titel: "${teilTitel}") {
                            titel
                            art
                        }
                    }
                `,
            };

            // when
            const response: AxiosResponse<GraphQLResponse> = await client.post(
                '',
                body,
            );

            // then
            const { status, headers, data } = response;

            expect(status).toBe(HttpStatus.OK);
            expect(headers['content-type']).toMatch(/json/iu);
            expect(data.data!.buecher).toBeNull();

            const { errors } = data;

            expect(errors).toHaveLength(1);

            const [error] = errors!;
            const { message, path, extensions } = error!;

            expect(message).toBe('Es wurden keine Buecher gefunden.');
            expect(path).toBeDefined();
            expect(path!![0]).toBe('buecher');
            expect(extensions).toBeDefined();
            expect(extensions!.code).toBe('BAD_USER_INPUT');
        },
    );
});
/* eslint-enable @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-extra-non-null-assertion */
