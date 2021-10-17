/* eslint-disable max-lines */
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

/**
 * Das Modul besteht aus der Klasse {@linkcode AuthService} für die
 * Authentifizierung.
 * @packageDocumentation
 */

import type { Buch, BuchDocument } from '../entity';
import {
    BuchInvalid,
    BuchNotExists,
    BuchServiceError,
    IsbnExists,
    TitelExists,
    VersionInvalid,
    VersionOutdated,
} from './errors';
import { BuchValidationService } from './buch-validation.service';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { MailService } from '../../mail/mail.service';
import { Model } from 'mongoose';
import { ObjectID } from 'bson';
import type { QueryOptions } from 'mongoose';
import RE2 from 're2';
import { getLogger } from '../../logger';
import { modelName } from '../entity';

// API-Dokumentation zu Mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable unicorn/no-useless-undefined */

/**
 * Die Klasse `BuchWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _Mongoose_ auf MongoDB zu.
 */
@Injectable()
export class BuchWriteService {
    private static readonly UPDATE_OPTIONS: QueryOptions = { new: true };

    private static readonly VERSION_PATTERN = new RE2('^"\\d*"');

    readonly #buchModel: Model<BuchDocument>;

    readonly #validationService: BuchValidationService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(BuchWriteService.name);

    constructor(
        @InjectModel(modelName) buchModel: Model<BuchDocument>,
        validationService: BuchValidationService,
        mailService: MailService,
    ) {
        this.#buchModel = buchModel;
        this.#validationService = validationService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Buch soll angelegt werden.
     * @param buch Das neu abzulegende Buch
     * @returns Die ID des neu angelegten Buches oder im Fehlerfall
     * - {@linkcode BuchInvalid} falls die Buchdaten gegen Constraints verstoßen
     * - {@linkcode IsbnExists} falls die ISBN-Nr bereits existiert
     * - {@linkcode TitelExists} falls der Titel bereits existiert
     */
    async create(
        buch: Buch,
    ): Promise<BuchInvalid | IsbnExists | ObjectID | TitelExists> {
        this.#logger.debug('create: buch=%o', buch);
        const validateResult = await this.#validateCreate(buch);
        if (validateResult instanceof BuchServiceError) {
            return validateResult;
        }

        const buchDocument = new this.#buchModel(buch);
        const saved = await buchDocument.save();
        const id = saved.id as ObjectID;
        this.#logger.debug('create: id=%s', id);

        await this.#sendmail(saved);

        return id;
    }

    /**
     * Ein vorhandenes Buch soll aktualisiert werden.
     * @param buch Das zu aktualisierende Buch
     * @param id ID des zu aktualisierenden Buchs
     * @param version Die Versionsnummer für optimistische Synchronisation
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     *  oder im Fehlerfall
     *  - {@linkcode BuchInvalid}, falls Constraints verletzt sind
     *  - {@linkcode BuchNotExists}, falls das Buch nicht existiert
     *  - {@linkcode TitelExists}, falls der Titel bereits existiert
     *  - {@linkcode VersionInvalid}, falls die Versionsnummer ungültig ist
     *  - {@linkcode VersionOutdated}, falls die Versionsnummer nicht aktuell ist
     */
    async update(
        id: string,
        buch: Buch,
        version: string,
    ): Promise<
        | BuchInvalid
        | BuchNotExists
        | TitelExists
        | VersionInvalid
        | VersionOutdated
        | number
    > {
        this.#logger.debug(
            'update: id=%s,  buch=%o, version=%s',
            id,
            buch,
            version,
        );
        if (!ObjectID.isValid(id)) {
            this.#logger.debug('update: Keine gueltige ObjectID');
            return new BuchNotExists(id);
        }

        const validateResult = await this.#validateUpdate(buch, id, version);
        if (validateResult instanceof BuchServiceError) {
            return validateResult;
        }

        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        // Weitere Methoden zum Aktualisieren:
        //    Document.findOneAndUpdate(update)
        //    document.updateOne(bedingung)
        const options = BuchWriteService.UPDATE_OPTIONS;
        // eslint-disable-next-line max-len, prettier/prettier
        const updated = await this.#buchModel.findByIdAndUpdate(new ObjectID(id), buch, options); //NOSONAR
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (updated === null) {
            this.#logger.debug('update: Kein Buch mit id=%s', id);
            return new BuchNotExists(id);
        }

        const versionUpdated = updated.__v as number;
        this.#logger.debug('update: versionUpdated=%s', versionUpdated);

        return versionUpdated;
    }

    /**
     * Ein Buch wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Buches
     * @returns true, falls das Buch vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(idStr: string) {
        this.#logger.debug('delete: idStr=%s', idStr);
        if (!ObjectID.isValid(idStr)) {
            this.#logger.debug('delete: Keine gueltige ObjectID');
            return false;
        }

        // Das Buch zur gegebenen ID asynchron loeschen
        const deleted = await this.#buchModel
            .findByIdAndDelete(new ObjectID(idStr))
            .lean<Buch | null>(); //NOSONAR
        this.#logger.debug('delete: deleted=%o', deleted);
        return deleted !== null;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Buch.findByIdAndRemove(id)
        //  Buch.findOneAndRemove(bedingung)
    }

    async #validateCreate(buch: Buch) {
        const msg = this.#validationService.validate(buch);
        if (msg.length > 0) {
            this.#logger.debug('#validateCreate: msg=%o', msg);
            return new BuchInvalid(msg);
        }

        // statt 2 sequentiellen DB-Zugriffen waere 1 DB-Zugriff mit OR besser

        const { titel } = buch;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await this.#buchModel.exists({ titel })) {
            return new TitelExists(titel);
        }

        const { isbn } = buch;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await this.#buchModel.exists({ isbn })) {
            return new IsbnExists(isbn);
        }

        this.#logger.debug('#validateCreate: ok');
        return undefined;
    }

    async #sendmail(buch: BuchDocument) {
        const subject = `Neues Buch ${buch.id as string}`;
        const body = `Das Buch mit dem Titel <strong>${buch.titel}</strong> ist angelegt`;
        await this.#mailService.sendmail(subject, body);
    }

    async #validateUpdate(buch: Buch, id: string, versionStr: string) {
        const result = this.#validateVersion(versionStr);
        if (typeof result !== 'number') {
            return result;
        }

        const version = result;
        this.#logger.debug(
            '#validateUpdate: buch=%o, version=%s',
            buch,
            version,
        );

        const validationMsg = this.#validationService.validate(buch);
        if (validationMsg.length > 0) {
            return new BuchInvalid(validationMsg);
        }

        const resultTitel = await this.#checkTitelExists(buch);
        if (resultTitel !== undefined && resultTitel.id !== id) {
            return resultTitel;
        }

        const resultIdAndVersion = await this.#checkIdAndVersion(id, version);
        if (resultIdAndVersion !== undefined) {
            return resultIdAndVersion;
        }

        this.#logger.debug('#validateUpdate: ok');
        return undefined;
    }

    #validateVersion(versionStr: string | undefined) {
        if (
            versionStr === undefined ||
            !BuchWriteService.VERSION_PATTERN.test(versionStr)
        ) {
            const error = new VersionInvalid(versionStr);
            this.#logger.debug('#validateVersion: VersionInvalid=%o', error);
            return error;
        }

        return Number.parseInt(versionStr.slice(1, -1), 10);
    }

    async #checkTitelExists(buch: Buch) {
        const { titel } = buch;

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const result = await this.#buchModel.findOne({ titel }, { _id: true }); //NOSONAR
        if (result !== null) {
            const id = (result.id as ObjectID).toString();
            this.#logger.debug('#checkTitelExists: id=%s', id);
            return new TitelExists(titel, id);
        }

        this.#logger.debug('#checkTitelExists: ok');
        return undefined;
    }

    async #checkIdAndVersion(id: string, version: number) {
        const buchDb = await this.#buchModel.findById(id); //NOSONAR
        if (buchDb === null) {
            const result = new BuchNotExists(id);
            this.#logger.debug('#checkIdAndVersion: BuchNotExists=%o', result);
            return result;
        }

        // nullish coalescing
        const versionDb = (buchDb.__v ?? 0) as number;
        if (version < versionDb) {
            const result = new VersionOutdated(id, version);
            this.#logger.debug(
                '#checkIdAndVersion: VersionOutdated=%o',
                result,
            );
            return result;
        }

        return undefined;
    }
}

/* eslint-enable unicorn/no-useless-undefined */
/* eslint-enable max-lines */
