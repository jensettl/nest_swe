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

import type { Auto, AutoDocument } from '../entity';
import {
    AutoInvalid,
    AutoNotExists,
    AutoServiceError,
    ModellExists,
    ModellNrExists,
    VersionInvalid,
    VersionOutdated,
} from './errors';
import { AutoValidationService } from './auto-validation.service';
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
 * Die Klasse `AutoWriteService` implementiert den Anwendungskern für das
 * Schreiben von Bücher und greift mit _Mongoose_ auf MongoDB zu.
 */
@Injectable()
export class AutoWriteService {
    private static readonly UPDATE_OPTIONS: QueryOptions = { new: true };

    private static readonly VERSION_PATTERN = new RE2('^"\\d*"');

    readonly #autoModel: Model<AutoDocument>;

    readonly #validationService: AutoValidationService;

    readonly #mailService: MailService;

    readonly #logger = getLogger(AutoWriteService.name);

    constructor(
        @InjectModel(modelName) autoModel: Model<AutoDocument>,
        validationService: AutoValidationService,
        mailService: MailService,
    ) {
        this.#autoModel = autoModel;
        this.#validationService = validationService;
        this.#mailService = mailService;
    }

    /**
     * Ein neues Auto soll angelegt werden.
     * @param auto Das neu abzulegende Auto
     * @returns Die ID des neu angelegten Autoes oder im Fehlerfall
     * - {@linkcode AutoInvalid} falls die Autodaten gegen Constraints verstoßen
     * - {@linkcode ModellNrExists} falls die MODELLNR-Nr bereits existiert
     * - {@linkcode ModellExists} falls das Modell bereits existiert
     */
    async create(
        auto: Auto,
    ): Promise<AutoInvalid | ModellExists | ModellNrExists | ObjectID> {
        this.#logger.debug('create: auto=%o', auto);
        const validateResult = await this.#validateCreate(auto);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        const autoDocument = new this.#autoModel(auto);
        const saved = await autoDocument.save();
        const id = saved.id as ObjectID;
        this.#logger.debug('create: id=%s', id);

        await this.#sendmail(saved);

        return id;
    }

    /**
     * Ein vorhandenes Auto soll aktualisiert werden.
     * @param auto Das zu aktualisierende Auto
     * @param id ID des zu aktualisierenden Autos
     * @param version Die Versionsnummer für optimistische Synchronisation
     * @returns Die neue Versionsnummer gemäß optimistischer Synchronisation
     *  oder im Fehlerfall
     *  - {@linkcode AutoInvalid}, falls Constraints verletzt sind
     *  - {@linkcode AutoNotExists}, falls das Auto nicht existiert
     *  - {@linkcode ModellExists}, falls das Modell bereits existiert
     *  - {@linkcode VersionInvalid}, falls die Versionsnummer ungültig ist
     *  - {@linkcode VersionOutdated}, falls die Versionsnummer nicht aktuell ist
     */
    async update(
        id: string,
        auto: Auto,
        version: string,
    ): Promise<
        | AutoInvalid
        | AutoNotExists
        | ModellExists
        | VersionInvalid
        | VersionOutdated
        | number
    > {
        this.#logger.debug(
            'update: id=%s,  auto=%o, version=%s',
            id,
            auto,
            version,
        );
        if (!ObjectID.isValid(id)) {
            this.#logger.debug('update: Keine gueltige ObjectID');
            return new AutoNotExists(id);
        }

        const validateResult = await this.#validateUpdate(auto, id, version);
        if (validateResult instanceof AutoServiceError) {
            return validateResult;
        }

        // findByIdAndReplace ersetzt ein Document mit ggf. weniger Properties
        // Weitere Methoden zum Aktualisieren:
        //    Document.findOneAndUpdate(update)
        //    document.updateOne(bedingung)
        const options = AutoWriteService.UPDATE_OPTIONS;
        // eslint-disable-next-line max-len, prettier/prettier
        const updated = await this.#autoModel.findByIdAndUpdate(new ObjectID(id), auto, options); //NOSONAR
        if (updated === null) {
            this.#logger.debug('update: Kein Auto mit id=%s', id);
            return new AutoNotExists(id);
        }

        const versionUpdated = updated.__v as number;
        this.#logger.debug('update: versionUpdated=%s', versionUpdated);

        return versionUpdated;
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID gelöscht.
     *
     * @param id ID des zu löschenden Autoes
     * @returns true, falls das Auto vorhanden war und gelöscht wurde. Sonst false.
     */
    async delete(idStr: string) {
        this.#logger.debug('delete: idStr=%s', idStr);
        if (!ObjectID.isValid(idStr)) {
            this.#logger.debug('delete: Keine gueltige ObjectID');
            return false;
        }

        // Das Auto zur gegebenen ID asynchron loeschen
        const deleted = await this.#autoModel
            .findByIdAndDelete(new ObjectID(idStr))
            .lean<Auto | null>(); //NOSONAR
        this.#logger.debug('delete: deleted=%o', deleted);
        return deleted !== null;

        // Weitere Methoden von mongoose, um zu loeschen:
        //  Auto.findByIdAndRemove(id)
        //  Auto.findOneAndRemove(bedingung)
    }

    async #validateCreate(auto: Auto) {
        const msg = this.#validationService.validate(auto);
        if (msg.length > 0) {
            this.#logger.debug('#validateCreate: msg=%o', msg);
            return new AutoInvalid(msg);
        }

        // statt 2 sequentiellen DB-Zugriffen waere 1 DB-Zugriff mit OR besser

        const { modell } = auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await this.#autoModel.exists({ modell })) {
            return new ModellExists(modell);
        }

        const { modellnr } = auto;
        // eslint-disable-next-line security/detect-non-literal-fs-filename
        if (await this.#autoModel.exists({ modellnr })) {
            return new ModellNrExists(modellnr);
        }

        this.#logger.debug('#validateCreate: ok');
        return undefined;
    }

    async #sendmail(auto: AutoDocument) {
        const subject = `Neues Auto ${auto.id as string}`;
        const body = `Das Auto mit dem Modell <strong>${auto.modell}</strong> ist angelegt`;
        await this.#mailService.sendmail(subject, body);
    }

    async #validateUpdate(auto: Auto, id: string, versionStr: string) {
        const result = this.#validateVersion(versionStr);
        if (typeof result !== 'number') {
            return result;
        }

        const version = result;
        this.#logger.debug(
            '#validateUpdate: auto=%o, version=%s',
            auto,
            version,
        );

        const validationMsg = this.#validationService.validate(auto);
        if (validationMsg.length > 0) {
            return new AutoInvalid(validationMsg);
        }

        const resultModell = await this.#checkModellExists(auto);
        if (resultModell !== undefined && resultModell.id !== id) {
            return resultModell;
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
            !AutoWriteService.VERSION_PATTERN.test(versionStr)
        ) {
            const error = new VersionInvalid(versionStr);
            this.#logger.debug('#validateVersion: VersionInvalid=%o', error);
            return error;
        }

        return Number.parseInt(versionStr.slice(1, -1), 10);
    }

    async #checkModellExists(auto: Auto) {
        const { modell } = auto;

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        const result = await this.#autoModel.findOne({ modell }, { _id: true }); //NOSONAR
        if (result !== null) {
            const id = result._id.toString();
            this.#logger.debug('#checkModellExists: id=%s', id);
            return new ModellExists(modell, id);
        }

        this.#logger.debug('#checkModellExists: ok');
        return undefined;
    }

    async #checkIdAndVersion(id: string, version: number) {
        const autoDb = await this.#autoModel.findById(id); //NOSONAR
        if (autoDb === null) {
            const result = new AutoNotExists(id);
            this.#logger.debug('#checkIdAndVersion: AutoNotExists=%o', result);
            return result;
        }

        // nullish coalescing
        const versionDb = (autoDb.__v ?? 0) as number;
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
