/*
 * Copyright (C) 2016 - present Juergen Zimmermann, FLorian Goebel, Hochschule Karlsruhe
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

/**
 * Das Modul besteht aus dem Schema für _Mongoose_.
 * @packageDocumentation
 */

import type { Model, Query } from 'mongoose';
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { ApiProperty } from '@nestjs/swagger';
import type { ObjectID } from 'bson';
import { dbConfig } from '../../config';
import mongoose from 'mongoose';

/**
 * Alias-Typ für gültige Strings bei Markeen.
 */
export type Marke = 'AUDI' | 'BMW';

/**
 * Alias-Typ für gültige Strings bei der Typ eines Autoes.
 */
export type AutoTyp = 'FAMILIENKUTSCHE' | 'SPORTWAGEN';

mongoose.SchemaType.set('debug', true);

// Mongoose ist von Valeri Karpov, der auch den Begriff "MEAN-Stack" gepraegt hat:
// http://thecodebarbarian.com/2013/04/29//easy-web-prototyping-with-mongodb-and-nodejs

// @Schema(), @Prop() usw. von Nest kann man nicht mit "virtuellen Funktionen"
// verwenden, wie sie fuer _id vom Typ UUID verwendet werden.

/**
 * Document-Klasse für _Mongoose_
 */

// Mongoose Schema mit NestJS
// https://docs.nestjs.com/techniques/mongodb#model-injection
// Schemas can be created with NestJS decorators, or with Mongoose itself manually.
// Using decorators to create schemas greatly reduces boilerplate and improves
// overall code readability.

const MONGOOSE_OPTIONS: mongoose.SchemaOptions = {
    // createdAt und updatedAt als automatisch gepflegte Felder
    timestamps: true,

    // http://thecodebarbarian.com/whats-new-in-mongoose-5-10-optimistic-concurrency.html
    optimisticConcurrency: true,

    // Mongoose nutzt createIndex() von MongoDB statt ensureIndex()
    autoIndex: dbConfig.autoIndex,
};

// Ein Schema in Mongoose definiert die Struktur und Methoden fuer die
// Dokumente in einer Collection, die aus Dokumenten im BSON-Format besteht.
// Ein Property im Schema definiert eine Property fuer jedes Dokument.
// Ein Schematyp (String, Number, Boolean, Date, Array, ObjectId) legt den Typ
// der Property fest.
// https://mongoosejs.com/docs/schematypes.html

/**
 * Das Schema für Mongoose, das dem Schema bei einem relationalen DB-System
 * entspricht, welches durch `CREATE TABLE`, `CREATE INDEX` usw. entsteht.
 */

@Schema(MONGOOSE_OPTIONS)
export class Auto {
    @Prop({ type: String, required: true, unique: true })
    @ApiProperty({ example: 'Das Modell', type: String })
    readonly modell: string | null | undefined; //NOSONAR

    @Prop({ type: Number, min: 0, max: 50 })
    @ApiProperty({ example: 5, type: Number })
    readonly verbrauch: number | null | undefined;

    @Prop({ type: String, enum: ['SPORTWAGEN', 'FAMILIENKUTSCHE'] })
    @ApiProperty({ example: 'SPORTWAGEN', type: String })
    readonly typ: AutoTyp | '' | null | undefined;

    @Prop({ type: String, required: true, enum: ['AUDI', 'BMW'] })
    @ApiProperty({ example: 'AUDI', type: String })
    readonly marke: Marke | '' | null | undefined;

    @Prop({ type: Number, required: true })
    @ApiProperty({ example: 1, type: Number })
    readonly preis: number | undefined;

    @Prop({ type: Number })
    @ApiProperty({ example: 0.1, type: Number })
    readonly rabatt: number | undefined;

    @Prop({ type: Boolean })
    @ApiProperty({ example: true, type: Boolean })
    readonly lieferbar: boolean | undefined;

    // das Temporal-API ab ES2022 wird von Mongoose noch nicht unterstuetzt
    @Prop({ type: Date })
    @ApiProperty({ example: '2021-01-31' })
    readonly datum: Date | string | undefined;

    @Prop({ type: String, required: true, unique: true, immutable: true })
    @ApiProperty({ example: '0-0070-0644-6', type: String })
    readonly modellnr: string | null | undefined;

    @Prop({ type: String })
    @ApiProperty({ example: 'https://test.de/', type: String })
    readonly homepage: string | null | undefined;

    // Metainformationen sind fuer Arrays und geschachtelte Objekte nicht verfuegbar
    @Prop({ type: [String], sparse: true })
    @ApiProperty({ example: ['ESSLINGEN', 'FRANKFURZ'] })
    readonly herstellorte: string[] | null | undefined;
}

// Optimistische Synchronisation durch das Feld __v fuer die Versionsnummer
// https://mongoosejs.com/docs/guide.html#versionKey
const optimistic = (
    schema: mongoose.Schema<
        mongoose.Document<Auto>,
        Model<mongoose.Document<Auto>>
    >,
) => {
    schema.pre<Query<mongoose.Document<Auto>, mongoose.Document<Auto>>>(
        'findOneAndUpdate',
        function () {
            // eslint-disable-next-line @typescript-eslint/no-invalid-this
            const update = this.getUpdate();
            if (update === null) {
                return;
            }

            const updateDoc = update as mongoose.Document<Auto>;
            if (updateDoc.__v !== null) {
                delete updateDoc.__v;
            }

            for (const key of ['$set', '$setOnInsert']) {
                /* eslint-disable security/detect-object-injection */
                // @ts-expect-error siehe https://mongoosejs.com/docs/guide.html#versionKey
                const updateKey = update[key]; // eslint-disable-line @typescript-eslint/no-unsafe-assignment
                // Optional Chaining
                if (updateKey?.__v !== null) {
                    delete updateKey.__v;
                    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
                    if (Object.entries(updateKey).length === 0) {
                        // @ts-expect-error UpdateQuery laesst nur Lesevorgaenge zu: abgeleitet von ReadonlyPartial<...>
                        delete update[key]; // eslint-disable-line @typescript-eslint/no-dynamic-delete
                    }
                }
                /* eslint-enable security/detect-object-injection */
            }
            // @ts-expect-error $inc ist in _UpdateQuery<TSchema> enthalten
            update.$inc = update.$inc || {}; // eslint-disable-line @typescript-eslint/strict-boolean-expressions, @typescript-eslint/no-unsafe-assignment
            // @ts-expect-error UpdateQuery laesst nur Lesevorgaenge zu: abgeleitet von ReadonlyPartial<...>
            update.$inc.__v = 1;
        },
    );
};

// Schema passend zur Entity-Klasse erzeugen
export const autoSchema = SchemaFactory.createForClass(Auto);

// Indexe anlegen (max. 3 bei Atlas)
// hier: aufsteigend (1) sowie "unique" oder "sparse"
autoSchema.index({ modell: 1 }, { unique: true, name: 'modell' });
autoSchema.index({ marke: 1 }, { name: 'marke' });
autoSchema.index({ herstellorte: 1 }, { sparse: true, name: 'herstellorte' });

// Document: _id (vom Type ObjectID) und __v als Attribute
export type AutoDocument = Auto &
    mongoose.Document<ObjectID, any, Auto> & { _id: ObjectID }; // eslint-disable-line @typescript-eslint/naming-convention

autoSchema.plugin(optimistic);

export const modelName = 'Auto';
export const collectionName = modelName;

export const exactFilterProperties = [
    'verbrauch',
    'typ',
    'marke',
    'preis',
    'rabatt',
    'lieferbar',
    'datum',
    'modellnr',
    'homepage',
];
