/* eslint-disable max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-extra-non-null-assertion */
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
import { HttpStatus } from '@nestjs/common';
import RE2 from 're2';
import axios from 'axios';
import each from 'jest-each';
import { loginGraphQL } from '../login';

// -----------------------------------------------------------------------------
// T e s t d a t e n
// -----------------------------------------------------------------------------
const objectIdRegexp = new RE2('[\\dA-Fa-f]{24}', 'u');

const idsLoeschen = ['000000000000000000000003'];

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;
let baseURL: string;
const graphqlPath = '/graphql';

// Test-Suite
// eslint-disable-next-line max-lines-per-function
describe('GraphQL Mutations', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();
        baseURL = `https://${host}:${port}${graphqlPath}`;
        client = axios.create({
            baseURL,
            httpsAgent,
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    // -------------------------------------------------------------------------
    test('Neues Auto', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLRequest = {
            query: `
                mutation {
                    create(
                        modell: "Test",
                        verbrauch: 1,
                        typ: FAMILIENKUTSCHE,
                        marke: AUDI,
                        preis: 11.1,
                        rabatt: 0.011,
                        lieferbar: true,
                        datum: "2021-01-31",
                        modellnr: "3897225832",
                        homepage: "http://acme.com",
                        herstellorte: ["ESSLINGEN"]
                    )
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data).toBeDefined();

        const { create } = data.data!;

        // Der Wert der Mutation ist die generierte ObjectID
        expect(create).toBeDefined();
        expect(objectIdRegexp.test(create as string)).toBe(true);
    });

    // -------------------------------------------------------------------------
    test('Neues Auto nur als "admin"/"mitarbeiter"', async () => {
        // given
        const token = await loginGraphQL(client, 'dirk.delta', 'p');
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLRequest = {
            query: `
                mutation {
                    create(
                        modell: "Nichtadmin",
                        verbrauch: 1,
                        typ: FAMILIENKUTSCHE,
                        marke: AUDI,
                        preis: 11.1,
                        rabatt: 0.011,
                        lieferbar: true,
                        datum: "2021-01-31",
                        modellnr: "9783663087465",
                        homepage: "http://acme.com",
                        herstellorte: ["ESSLINGEN"]
                    )
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, extensions } = error!;

        expect(message).toBe('Forbidden resource');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('FORBIDDEN');
    });

    // -------------------------------------------------------------------------
    test('Auto aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLRequest = {
            query: `
                mutation {
                    update(
                        id: "000000000000000000000003",
                        version: 0,
                        auto: {
                            modell: "Geaendert",
                            verbrauch: 5,
                            typ: SPORTWAGEN,
                            marke: AUDI,
                            preis: 99.99,
                            rabatt: 0.099,
                            lieferbar: false,
                            datum: "2021-01-02",
                            modellnr: "9780201633610",
                            homepage: "https://acme.com",
                            herstellorte: [
                                "ESSLINGEN",
                                "FRANKFURZ"
                            ]
                        }
                    )
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const { update } = data.data!;

        // Der Wert der Mutation ist die neue Versionsnummer
        expect(update).toBe(1);
    });

    // -------------------------------------------------------------------------
    // eslint-disable-next-line max-lines-per-function
    test('Auto mit ungueltigen Werten aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLRequest = {
            query: `
                mutation {
                    update(
                        id: "000000000000000000000003",
                        version: 1,
                        auto: {
                            modell: "?!$",
                            verbrauch: 999,
                            typ: FAMILIENKUTSCHE,
                            marke: AUDI,
                            preis: -999,
                            rabatt: 999,
                            lieferbar: false,
                            datum: "123",
                            modellnr: "123",
                            homepage: "?!$",
                            herstellorte: ["ESSLINGEN"]
                        }
                    )
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error!;

        expect(message).toEqual(expect.stringContaining(' Automodell '));
        expect(message).toEqual(
            expect.stringContaining(
                'Eine Bewertung muss zwischen 0 und 5 liegen.',
            ),
        );
        expect(message).toEqual(
            expect.stringContaining('Der Preis darf nicht negativ sein.'),
        );
        expect(message).toEqual(
            expect.stringContaining(
                'Der Rabatt muss ein Wert zwischen 0 und 1 sein.',
            ),
        );
        expect(message).toEqual(
            expect.stringContaining(
                'Das Datum muss im Format yyyy-MM-dd sein.',
            ),
        );
        expect(message).toEqual(
            expect.stringContaining('Die MODELLNR-Nummer ist nicht korrekt.'),
        );
        expect(message).toEqual(
            expect.stringContaining('Die Homepage ist nicht korrekt.'),
        );
        expect(path).toBeDefined();
        expect(path![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    test('Nicht-vorhandenes Auto aktualisieren', async () => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const id = '999999999999999999999999';
        const body: GraphQLRequest = {
            query: `
                mutation {
                    update(
                        id: "${id}",
                        version: 0,
                        auto: {
                            modell: "Nichtvorhanden",
                            verbrauch: 5,
                            typ: SPORTWAGEN,
                            marke: AUDI,
                            preis: 99.99,
                            rabatt: 0.099,
                            lieferbar: false,
                            datum: "2021-01-02",
                            modellnr: "9780201633610",
                            homepage: "https://acme.com",
                            herstellorte: ["ESSLINGEN"]
                        }
                    )
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.data!.update).toBeNull();

        const { errors } = data;

        expect(errors).toHaveLength(1);

        const [error] = errors!;
        const { message, path, extensions } = error!;

        expect(message).toBe(
            `Es gibt kein Auto mit der ID ${id.toLowerCase()}`,
        );
        expect(path).toBeDefined();
        expect(path!![0]).toBe('update');
        expect(extensions).toBeDefined();
        expect(extensions!.code).toBe('BAD_USER_INPUT');
    });

    // -------------------------------------------------------------------------
    each(idsLoeschen).test('Auto loeschen %s', async (id: string) => {
        // given
        const token = await loginGraphQL(client);
        const authorization = { Authorization: `Bearer ${token}` }; // eslint-disable-line @typescript-eslint/naming-convention
        const body: GraphQLRequest = {
            query: `
                mutation {
                    delete(id: "${id}")
                }
            `,
        };

        // when
        const response: AxiosResponse<GraphQLResponse> = await client.post(
            '',
            body,
            { headers: authorization },
        );

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);
        expect(data.errors).toBeUndefined();

        const deleteMutation = data.data!.delete;

        // Der Wert der Mutation ist true (falls geloescht wurde) oder false
        expect(deleteMutation).toBe(true);
    });
});
/* eslint-enable max-lines, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-extra-non-null-assertion */
