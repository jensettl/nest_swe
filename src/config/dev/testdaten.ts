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
import type { Buch } from '../../buch/entity';
import { ObjectID } from 'bson';

// eslint-disable-next-line @typescript-eslint/naming-convention
type BuchIdVersion = Buch & { _id: ObjectID; __v: number };

/* eslint-disable @typescript-eslint/naming-convention */
export const testdaten: BuchIdVersion[] = [
    {
        _id: new ObjectID('000000000000000000000001'),
        titel: 'Alpha',
        rating: 4,
        art: 'DRUCKAUSGABE',
        verlag: 'FOO_VERLAG',
        preis: 11.1,
        rabatt: 0.011,
        lieferbar: true,
        // https://docs.mongodb.com/manual/reference/method/Date
        datum: new Date('2021-02-01'),
        isbn: '9783897225831',
        homepage: 'https://acme.at/',
        schlagwoerter: ['JAVASCRIPT'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000002'),
        titel: 'Beta',
        rating: 2,
        art: 'KINDLE',
        verlag: 'BAR_VERLAG',
        preis: 22.2,
        rabatt: 0.022,
        lieferbar: true,
        datum: new Date('2021-02-02'),
        isbn: '9783827315526',
        homepage: 'https://acme.biz/',
        schlagwoerter: ['TYPESCRIPT'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000003'),
        titel: 'Gamma',
        rating: 1,
        art: 'DRUCKAUSGABE',
        verlag: 'FOO_VERLAG',
        preis: 33.3,
        rabatt: 0.033,
        lieferbar: true,
        datum: new Date('2021-02-03'),
        isbn: '9780201633610',
        homepage: 'https://acme.com/',
        schlagwoerter: ['JAVASCRIPT', 'TYPESCRIPT'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000004'),
        titel: 'Delta',
        rating: 3,
        art: 'DRUCKAUSGABE',
        verlag: 'BAR_VERLAG',
        preis: 44.4,
        rabatt: 0.044,
        lieferbar: true,
        datum: new Date('2021-02-04'),
        isbn: '978038753406',
        homepage: 'https://acme.de/',
        schlagwoerter: [],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000005'),
        titel: 'Epsilon',
        rating: 2,
        art: 'KINDLE',
        verlag: 'FOO_VERLAG',
        preis: 55.5,
        rabatt: 0.055,
        lieferbar: true,
        datum: new Date('2021-02-05'),
        isbn: '9783824404810',
        homepage: 'https://acme.es/',
        schlagwoerter: ['TYPESCRIPT'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000006'),
        titel: 'Phi',
        rating: 2,
        art: 'KINDLE',
        verlag: 'FOO_VERLAG',
        preis: 66.6,
        rabatt: 0.066,
        lieferbar: true,
        datum: new Date('2021-02-06'),
        isbn: '9783540430810',
        homepage: 'https://acme.it/',
        schlagwoerter: ['TYPESCRIPT'],
        __v: 0,
    },
];
/* eslint-enable @typescript-eslint/naming-convention */
