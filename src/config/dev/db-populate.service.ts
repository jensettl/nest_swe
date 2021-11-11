/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Florian Goebel, Hochschule Karlsruhe
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
 * Das Modul enthält die Funktion, um die Test-DB neu zu laden.
 * @packageDocumentation
 */

import type { Auto } from '../../auto/entity';
import { DbService } from '../../db/db.service';
import { GridFSBucket } from 'mongodb';
import type { GridFSBucketWriteStreamOptions } from 'mongodb';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { createReadStream } from 'fs';
import { dbConfig } from '../db';
import { getLogger } from '../../logger';
import { modelName } from '../../auto/entity';
import { testdaten } from './testdaten';
import { testfiles } from './testfiles';
/**
 * Die Test-DB wird im Development-Modus neu geladen, nachdem die Module
 * initialisiert sind, was duch `OnApplicationBootstrap` realisiert wird.
 */
@Injectable()
export class DbPopulateService implements OnApplicationBootstrap {
    readonly #dbService: DbService;

    readonly #autoModel: Model<Auto>;

    readonly #logger = getLogger(DbPopulateService.name);

    readonly #testdaten = testdaten;

    /**
     * Initialisierung durch DI mit `Model<Auto>` gemäß _Mongoose_.
     */
    constructor(
        dbService: DbService,
        @InjectModel(modelName) autoModel: Model<Auto>,
    ) {
        this.#dbService = dbService;
        this.#autoModel = autoModel;
    }

    /**
     * Die Test-DB wird im Development-Modus neu geladen.
     */
    async onApplicationBootstrap() {
        await this.#populateTestdaten();
        await this.#populateTestFiles();
    }

    /**
     * Binärdaten, z.B. Bilder oder Videos, abspeichern.
     * @param readableStream Node-Stream mit den Binärdaten
     * @param bucket Bucket von GridFS zum Abspeichern
     * @param filename Dateiname der abzuspeichernden Datei
     * @param metadata Metadaten, z.B. MIME-Typ
     */
    // eslint-disable-next-line max-params
    saveStream(
        readableStream: NodeJS.ReadableStream, // eslint-disable-line no-undef
        bucket: GridFSBucket,
        filename: string,
        metadata: GridFSBucketWriteStreamOptions,
    ) {
        readableStream.pipe(bucket.openUploadStream(filename, metadata));
    }

    async #populateTestdaten() {
        if (!dbConfig.dbPopulate) {
            return;
        }

        try {
            await this.#autoModel.collection.drop();
        } catch {
            this.#logger.info('#populateTestdaten: Keine Collection vorhanden');
        }

        const collection = await this.#autoModel.createCollection();
        this.#logger.warn(
            '#populateTestdaten: Collection %s neu angelegt',
            collection.collectionName,
        );

        // https://mongoosejs.com/docs/api.html#model_Model.insertMany
        const insertedDocs = await this.#autoModel.insertMany(this.#testdaten, {
            lean: true,
        });
        this.#logger.warn(
            '#populateTestdaten: %d Datensaetze eingefuegt',
            insertedDocs.length,
        );
    }

    async #populateTestFiles() {
        const client = await this.#dbService.connect();

        // https://mongodb.github.io/node-mongodb-native/3.6/tutorials/gridfs/streaming/
        const bucket = new GridFSBucket(client.db(dbConfig.dbName));

        // Bucket fuer Binaerdateien kann nur geloescht werden, wenn 'fs.files' existiert
        const collections = await client.db().listCollections().toArray();
        const collectionNames = collections.map(
            (collection) => collection.name,
        );
        if (collectionNames.includes('fs.files')) {
            await bucket.drop();
        }

        testfiles.forEach((testfile) => {
            const { filenameBinary, contentType, filename } = testfile;
            this.#saveFile(filenameBinary, contentType, bucket, filename);
        });
    }

    // eslint-disable-next-line max-params
    #saveFile(
        filenameBinary: string,
        contentType: string,
        bucket: GridFSBucket,
        filename: string,
    ) {
        const options = { contentType };
        createReadStream(filenameBinary).pipe(
            bucket.openUploadStream(filename, options),
        );
        this.#logger.warn(
            '#saveFile: %s mit %s gespeichert.',
            filename,
            contentType,
        );
    }
}
