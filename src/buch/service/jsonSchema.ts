/*
 * Copyright (C) 2019 - present Juergen Zimmermann, Hochschule Karlsruhe
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
import type { GenericJsonSchema } from './GenericJsonSchema';

export const MAX_RATING = 5;

export const jsonSchema: GenericJsonSchema = {
    // naechstes Release: 2021-02-01
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://acme.com/buch.json#',
    title: 'Buch',
    description: 'Eigenschaften eines Buches: Typen und Constraints',
    type: 'object',
    properties: {
        /* eslint-disable @typescript-eslint/naming-convention */
        _id: { type: 'object' },
        __v: {
            type: 'number',
            minimum: 0,
        },
        /* eslint-enable @typescript-eslint/naming-convention */
        // fuer GraphQL
        version: {
            type: 'number',
            minimum: 0,
        },
        titel: {
            type: 'string',
            pattern: '^\\w.*',
        },
        rating: {
            type: 'number',
            minimum: 0,
            maximum: MAX_RATING,
        },
        art: {
            type: 'string',
            enum: ['DRUCKAUSGABE', 'KINDLE', ''],
        },
        verlag: {
            type: 'string',
            enum: ['BAR_VERLAG', 'FOO_VERLAG', ''],
        },
        preis: {
            type: 'number',
            minimum: 0,
        },
        rabatt: {
            type: 'number',
            exclusiveMinimum: 0,
            exclusiveMaximum: 1,
        },
        lieferbar: { type: 'boolean' },
        datum: { type: 'string', format: 'date' },
        isbn: { type: 'string', format: 'ISBN' },
        homepage: { type: 'string', format: 'uri' },
        schlagwoerter: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    // isbn ist NUR beim Neuanlegen ein Pflichtfeld
    // Mongoose bietet dazu die Funktion Document.findByIdAndUpdate()
    required: ['titel', 'art', 'verlag'],
    additionalProperties: false,
    errorMessage: {
        properties: {
            version: 'Die Versionsnummer muss mindestens 0 sein.',
            titel: 'Ein Buchtitel muss mit einem Buchstaben, einer Ziffer oder _ beginnen.',
            rating: 'Eine Bewertung muss zwischen 0 und 5 liegen.',
            art: 'Die Art eines Buches muss KINDLE oder DRUCKAUSGABE sein.',
            verlag: 'Der Verlag eines Buches muss FOO_VERLAG oder BAR_VERLAG sein.',
            preis: 'Der Preis darf nicht negativ sein.',
            rabatt: 'Der Rabatt muss ein Wert zwischen 0 und 1 sein.',
            lieferbar: '"lieferbar" muss auf true oder false gesetzt sein.',
            datum: 'Das Datum muss im Format yyyy-MM-dd sein.',
            isbn: 'Die ISBN-Nummer ist nicht korrekt.',
            homepage: 'Die Homepage ist nicht korrekt.',
        },
    },
};
