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

// axios: https://github.com/axios/axios

// Alternativen zu axios:
// https://github.com/request/request/issues/3143
// https://blog.bitsrc.io/comparing-http-request-libraries-for-2019-7bedb1089c83
//    got         https://github.com/sindresorhus/got
//    node-fetch  https://github.com/node-fetch/node-fetch
//                https://fetch.spec.whatwg.org
//                https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API/Using_Fetch
//    needle      https://github.com/tomas/needle
//    ky          https://github.com/sindresorhus/ky

import type { AxiosInstance, AxiosResponse } from 'axios';
import { afterAll, beforeAll, describe } from '@jest/globals';
import {
    apiPath,
    createTestserver,
    host,
    httpsAgent,
    port,
    shutdownTestserver,
} from '../testserver';
import type { AutoDTO } from '../auto';
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

// -----------------------------------------------------------------------------
// T e s t s
// -----------------------------------------------------------------------------
let client: AxiosInstance;
let baseURL: string;

// Test-Suite
describe('GET /api/:id', () => {
    // Testserver starten und dabei mit der DB verbinden
    beforeAll(async () => {
        await createTestserver();
        baseURL = `https://${host}:${port}/${apiPath}`;
        client = axios.create({
            baseURL,
            httpsAgent,
            validateStatus: (status) => status < 500, // eslint-disable-line @typescript-eslint/no-magic-numbers
        });
    });

    afterAll(async () => {
        await shutdownTestserver();
    });

    each(idVorhanden).test('Auto zu vorhandener ID %s', async (id: string) => {
        // given
        const url = `/${id}`;

        // when
        const response: AxiosResponse<AutoDTO> = await client.get(url);

        // then
        const { status, headers, data } = response;

        expect(status).toBe(HttpStatus.OK);
        expect(headers['content-type']).toMatch(/json/iu);

        // eslint-disable-next-line no-underscore-dangle
        const selfLink = data._links.self.href;

        // https://jestjs.io/docs/next/snapshot-testing
        // https://medium.com/swlh/easy-integration-testing-of-graphql-apis-with-jest-63288d0ad8d7
        expect(selfLink).toMatchSnapshot();
    });
});
