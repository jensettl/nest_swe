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
    $id: 'https://acme.com/auto.json#',
    title: 'Auto',
    description: 'Eigenschaften eines Autos: Typen und Constraints',
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
        modell: {
            type: 'string',
            pattern: '^\\w.*',
        },
        verbrauch: {
            type: 'number',
            minimum: 0,
            maximum: MAX_RATING,
        },
        typ: {
            type: 'string',
            enum: ['SPORTWAGEN', 'FAMILIENKUTSCHE', ''],
        },
        marke: {
            type: 'string',
            enum: ['BMW', 'AUDI', ''],
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
        modellnr: { type: 'string', format: 'MODELLNR' },
        homepage: { type: 'string', format: 'uri' },
        herstellorte: {
            type: 'array',
            items: { type: 'string' },
        },
    },
    // modellnr ist NUR beim Neuanlegen ein Pflichtfeld
    // Mongoose bietet dazu die Funktion Document.findByIdAndUpdate()
    required: ['modell', 'typ', 'marke'],
    additionalProperties: false,
    errorMessage: {
        properties: {
            version: 'Die Versionsnummer muss mindestens 0 sein.',
            modell: 'Ein Automodell muss mit einem Autostaben, einer Ziffer oder _ beginnen.',
            verbrauch: 'Eine Bewertung muss zwischen 0 und 5 liegen.',
            typ: 'Die Typ eines Autoes muss FAMILIENKUTSCHE oder SPORTWAGEN sein.',
            marke: 'Die Marke eines Autoes muss AUDI oder BMW sein.',
            preis: 'Der Preis darf nicht negativ sein.',
            rabatt: 'Der Rabatt muss ein Wert zwischen 0 und 1 sein.',
            lieferbar: '"lieferbar" muss auf true oder false gesetzt sein.',
            datum: 'Das Datum muss im Format yyyy-MM-dd sein.',
            modellnr: 'Die MODELLNR-Nummer ist nicht korrekt.',
            homepage: 'Die Homepage ist nicht korrekt.',
        },
    },
};
