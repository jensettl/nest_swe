/*
 * Copyright (C) 2017 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus der Klasse {@linkcode AutoFileService}, damit
 * Binärdateien mit dem Treiber von _MongoDB_ in _GridFS_ abgespeichert und
 * ausgelesen werden können.
 * @packageDocumentation
 */

import {
    AutoNotExists,
    FileNotFound,
    InvalidContentType,
    MultipleFiles,
} from './errors';
import type { GridFSBucketReadStream, GridFSFile } from 'mongodb';
import { AutoReadService } from './auto-read.service';
import { DbService } from '../../db/db.service';
import type { FileTypeResult } from 'file-type';
import { GridFSBucket } from 'mongodb';
import { Injectable } from '@nestjs/common';
import { dbConfig } from '../../config';
import { getLogger } from '../../logger';
import intoStream from 'into-stream';

/**
 * Das Interface {@linkcode FindResult} beschreibt das Resultat, wenn eine
 * Binärdatei gefunden wurde und besteht aus dem Stream zum Lesen sowie dem
 * MIME-Type.
 */
interface FindResult {
    readStream: GridFSBucketReadStream;
    contentType: string;
}

/* eslint-disable unicorn/no-useless-undefined */
/**
 * Mit der Klasse {@linkcode AutoFileService} können Binärdateien mit dem
 * Treiber von _MongoDB_ in _GridFS_ abgespeichert und ausgelesen werden.
 */
@Injectable()
export class AutoFileService {
    readonly #service: AutoReadService;

    readonly #dbService: DbService;

    readonly #logger = getLogger(AutoFileService.name);

    constructor(service: AutoReadService, dbService: DbService) {
        this.#service = service;
        this.#dbService = dbService;
    }

    /**
     * Asynchrones Abspeichern einer Binärdatei.
     *
     * @param filename ID des zugehörigen Autoes, die als Dateiname verwendet wird.
     * @param buffer Node-Buffer mit den Binärdaten.
     * @param contentType MIME-Type, z.B. `image/png`.
     * @returns true, falls die Binärdaten abgespeichert wurden. Sonst false.
     */
    async save(
        filename: string,
        buffer: Buffer,
        fileType: FileTypeResult | undefined,
    ) {
        this.#logger.debug(
            'save: filename=%s, fileType=%o',
            filename,
            fileType,
        );

        if (fileType === undefined) {
            return false;
        }

        // Gibt es ein Auto zur angegebenen ID?
        const auto = await this.#service.findById(filename); //NOSONAR
        if (auto === undefined) {
            return false;
        }

        const client = await this.#dbService.connect();
        const bucket = new GridFSBucket(client.db(dbConfig.dbName));
        await this.#delete(filename, bucket);

        const stream = intoStream(buffer);
        const options = { contentType: fileType.mime };
        stream.pipe(bucket.openUploadStream(filename, options));
        return true;
    }

    /**
     * Asynchrones Suchen nach einer Binärdatei in _GridFS_ anhand des Dateinamens.
     * @param filename Der Dateiname der Binärdatei.
     * @returns GridFSBucketReadStream, falls es eine Binärdatei mit dem
     *  angegebenen Dateinamen gibt. Im Fehlerfall ein JSON-Objekt vom Typ:
     * - {@linkcode AutoNotExists}
     * - {@linkcode FileNotFound}
     * - {@linkcode MultipleFiles}
     */
    async find(
        filename: string,
    ): Promise<AutoNotExists | FindResult | InvalidContentType> {
        this.#logger.debug('find: filename=%s', filename);
        const resultCheck = await this.#checkFilename(filename);
        if (resultCheck !== undefined) {
            return resultCheck;
        }

        // https://mongodb.github.io/node-mongodb-native/3.5/tutorials/gridfs/streaming
        const client = await this.#dbService.connect();
        const bucket = new GridFSBucket(client.db(dbConfig.dbName));
        const contentType = await this.#getContentType(filename, bucket);
        if (typeof contentType !== 'string') {
            return new InvalidContentType();
        }
        this.#logger.debug('find: contentType=%s', contentType);

        // https://mongodb.github.io/node-mongodb-native/3.5/tutorials/gridfs/streaming/#downloading-a-file
        // https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93
        const readStream = bucket.openDownloadStreamByName(filename);
        const result: FindResult = { readStream, contentType };
        return result;
    }

    async #delete(filename: string, bucket: GridFSBucket) {
        this.#logger.debug('#delete: filename=%s', filename);
        const idObjects: GridFSFile[] = await bucket
            .find({ filename })
            .toArray();
        const ids = idObjects.map((obj) => obj._id);
        this.#logger.debug('#delete: ids=%o', ids);
        ids.forEach((fileId) =>
            bucket.delete(fileId, () =>
                this.#logger.debug('#delete: geloeschte File-ID=%s', fileId),
            ),
        );
    }

    async #checkFilename(filename: string) {
        this.#logger.debug('#checkFilename: filename=%s', filename);

        // Gibt es ein Auto mit dem gegebenen "filename" als ID?
        const auto = await this.#service.findById(filename); //NOSONAR
        if (auto === undefined) {
            const result = new AutoNotExists(filename);
            this.#logger.debug('#checkFilename: AutoNotExists=%o', result);
            return result;
        }

        this.#logger.debug('#checkFilename: auto vorhanden=%o', auto);
        return undefined;
    }

    async #getContentType(filename: string, bucket: GridFSBucket) {
        let files: GridFSFile[];
        try {
            files = await bucket.find({ filename }).toArray();
        } catch (err) {
            this.#logger.error('%o', err);
            files = [];
        }

        switch (files.length) {
            case 0: {
                const error = new FileNotFound(filename);
                this.#logger.debug('#getContentType: FileNotFound=%o', error);
                return error;
            }

            case 1: {
                const [file] = files;
                if (file === undefined) {
                    const error = new FileNotFound(filename);
                    this.#logger.debug(
                        '#getContentType: FileNotFound=%o',
                        error,
                    );
                    return error;
                }
                const { contentType } = file;
                if (contentType === undefined) {
                    return new InvalidContentType();
                }
                this.#logger.debug(
                    '#getContentType: contentType=%s',
                    contentType,
                );
                return contentType;
            }

            default: {
                const error = new MultipleFiles(filename);
                this.#logger.debug('#getContentType: MultipleFiles=%o', error);
                return new MultipleFiles(filename);
            }
        }
    }
}

/* eslint-enable unicorn/no-useless-undefined */
