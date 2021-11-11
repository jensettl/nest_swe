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
import type { Auto } from '../../auto/entity';
import { ObjectID } from 'bson';

// eslint-disable-next-line @typescript-eslint/naming-convention
type AutoIdVersion = Auto & { _id: ObjectID; __v: number };

/* eslint-disable @typescript-eslint/naming-convention */
export const testdaten: AutoIdVersion[] = [
    {
        _id: new ObjectID('000000000000000000000001'),
        modell: 'Alpha',
        verbrauch: 4,
        typ: 'SPORTWAGEN',
        marke: 'AUDI',
        preis: 11.1,
        rabatt: 0.011,
        lieferbar: true,
        // https://docs.mongodb.com/manual/reference/method/Date
        datum: new Date('2021-02-01'),
        modellnr: '9783897225831',
        homepage: 'https://acme.at/',
        herstellorte: ['ESSLINGEN'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000002'),
        modell: 'Beta',
        verbrauch: 2,
        typ: 'FAMILIENKUTSCHE',
        marke: 'BMW',
        preis: 22.2,
        rabatt: 0.022,
        lieferbar: true,
        datum: new Date('2021-02-02'),
        modellnr: '9783827315526',
        homepage: 'https://acme.biz/',
        herstellorte: ['FRANKFURZ'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000003'),
        modell: 'Gamma',
        verbrauch: 1,
        typ: 'SPORTWAGEN',
        marke: 'AUDI',
        preis: 33.3,
        rabatt: 0.033,
        lieferbar: true,
        datum: new Date('2021-02-03'),
        modellnr: '9780201633610',
        homepage: 'https://acme.com/',
        herstellorte: ['ESSLINGEN', 'FRANKFURZ'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000004'),
        modell: 'Delta',
        verbrauch: 3,
        typ: 'SPORTWAGEN',
        marke: 'BMW',
        preis: 44.4,
        rabatt: 0.044,
        lieferbar: true,
        datum: new Date('2021-02-04'),
        modellnr: '978038753406',
        homepage: 'https://acme.de/',
        herstellorte: [],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000005'),
        modell: 'Epsilon',
        verbrauch: 2,
        typ: 'FAMILIENKUTSCHE',
        marke: 'AUDI',
        preis: 55.5,
        rabatt: 0.055,
        lieferbar: true,
        datum: new Date('2021-02-05'),
        modellnr: '9783824404810',
        homepage: 'https://acme.es/',
        herstellorte: ['FRANKFURZ'],
        __v: 0,
    },
    {
        _id: new ObjectID('000000000000000000000006'),
        modell: 'Phi',
        verbrauch: 2,
        typ: 'FAMILIENKUTSCHE',
        marke: 'AUDI',
        preis: 66.6,
        rabatt: 0.066,
        lieferbar: true,
        datum: new Date('2021-02-06'),
        modellnr: '9783540430810',
        homepage: 'https://acme.it/',
        herstellorte: ['FRANKFURZ'],
        __v: 0,
    },
];
/* eslint-enable @typescript-eslint/naming-convention */
