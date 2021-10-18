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

import { exactFilterProperties, modelName } from '../entity';
import type { BuchDocument } from '../entity';
import type { FilterQuery } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectID } from 'bson';
import { getLogger } from '../../logger';

// API-Dokumentation zu Mongoose:
// http://mongoosejs.com/docs/api.html
// https://github.com/Automattic/mongoose/issues/3949

/* eslint-disable unicorn/no-useless-undefined */

/**
 * Die Klasse `BuchReadService` implementiert das Lesen für Bücher und greift
 * mit _Mongoose_ auf MongoDB zu.
 */
@Injectable()
export class BuchReadService {
    readonly #buchModel: Model<BuchDocument>;

    readonly #logger = getLogger(BuchReadService.name);

    constructor(@InjectModel(modelName) buchModel: Model<BuchDocument>) {
        this.#buchModel = buchModel;
    }

    // Rueckgabetyp Promise bei asynchronen Funktionen
    //    ab ES2015
    //    vergleiche Task<> bei C# und Mono<> aus Project Reactor
    // Status eines Promise:
    //    Pending: das Resultat ist noch nicht vorhanden, weil die asynchrone
    //             Operation noch nicht abgeschlossen ist
    //    Fulfilled: die asynchrone Operation ist abgeschlossen und
    //               das Promise-Objekt hat einen Wert
    //    Rejected: die asynchrone Operation ist fehlgeschlagen and das
    //              Promise-Objekt wird nicht den Status "fulfilled" erreichen.
    //              Im Promise-Objekt ist dann die Fehlerursache enthalten.

    /**
     * Ein Buch asynchron anhand seiner ID suchen
     * @param id ID des gesuchten Buches
     * @returns Das gefundene Buch vom Typ {@linkcode Buch} oder undefined
     *          in einem Promise aus ES2015 (vgl.: Mono aus Project Reactor oder
     *          Future aus Java)
     */
    async findById(idStr: string) {
        this.#logger.debug('findById: idStr=%s', idStr);

        // ein Buch zur gegebenen ID asynchron mit Mongoose suchen
        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // Das Resultat ist null, falls nicht gefunden.
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document,
        // so dass u.a. der virtuelle getter "id" auch nicht mehr vorhanden ist.
        // ObjectID: 12-Byte Binaerwert, d.h. 24-stellinger HEX-String
        if (!ObjectID.isValid(idStr)) {
            this.#logger.debug('findById: Ungueltige ObjectID');
            return undefined;
        }

        const id = new ObjectID(idStr);
        const buch = await this.#buchModel.findById(id); //NOSONAR
        this.#logger.debug('findById: buch=%o', buch);

        return buch || undefined;
    }

    /**
     * Bücher asynchron suchen.
     * @param filter Die DB-Query als JSON-Objekt
     * @returns Ein JSON-Array mit den gefundenen Büchern. Ggf. ist das Array leer.
     */
    // eslint-disable-next-line max-lines-per-function
    async find(filter?: FilterQuery<BuchDocument> | undefined) {
        this.#logger.debug('find: filter=%o', filter);

        // alle Buecher asynchron suchen u. aufsteigend nach titel sortieren
        // https://docs.mongodb.org/manual/reference/object-id
        // entries(): { titel: 'a', rating: 5 } => [{ titel: 'x'}, {rating: 5}]
        if (filter === undefined || Object.entries(filter).length === 0) {
            return this.#findAll();
        }

        // { titel: 'a', rating: 5, javascript: true }
        // Rest Properties
        const { titel, javascript, typescript, ...dbFilter } = filter;

        if (this.#checkInvalidProperty(dbFilter)) {
            return [];
        }

        // Buecher zur Query (= JSON-Objekt durch Express) asynchron suchen
        // Titel in der Query: Teilstring des Titels,
        // d.h. "LIKE" als regulaerer Ausdruck
        // 'i': keine Unterscheidung zw. Gross- u. Kleinschreibung
        // NICHT /.../, weil das Muster variabel sein muss
        // CAVEAT: KEINE SEHR LANGEN Strings wg. regulaerem Ausdruck
        // RegExp statt RE2 wegen Mongoose
        if (
            titel !== undefined &&
            titel !== null &&
            typeof titel === 'string'
        ) {
            dbFilter.titel =
                // eslint-disable-next-line @typescript-eslint/no-magic-numbers
                titel.length < 10
                    ? new RegExp(titel, 'iu') // eslint-disable-line security/detect-non-literal-regexp, security-node/non-literal-reg-expr
                    : titel;
        }

        // z.B. {javascript: true, typescript: true}
        const schlagwoerter = [];
        if (javascript === 'true') {
            schlagwoerter.push('JAVASCRIPT');
        }
        if (typescript === 'true') {
            schlagwoerter.push('TYPESCRIPT');
        }
        if (schlagwoerter.length === 0) {
            if (Array.isArray(dbFilter.schlagwoerter)) {
                dbFilter.schlagwoerter.splice(0);
            }
        } else {
            dbFilter.schlagwoerter = schlagwoerter;
        }

        // Pattern "Active Record" (urspruengl. von Ruby-on-Rails)
        // leeres Array, falls nichts gefunden wird
        // Model<Document>.findOne(query), falls das Suchkriterium eindeutig ist
        // bei findOne(query) wird null zurueckgeliefert, falls nichts gefunden
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        const buecher = await this.#buchModel.find( //NOSONAR
            dbFilter as FilterQuery<BuchDocument>,
        ); //NOSONAR
        this.#logger.debug('find: buecher=%o', buecher);

        return buecher;
    }

    async #findAll() {
        this.#logger.debug('#findAll');
        // lean() liefert ein "Plain JavaScript Object" statt ein Mongoose Document
        const buecher = await this.#buchModel.find().sort('titel'); //NOSONAR
        this.#logger.debug('#findAll: buecher=%o', buecher);
        return buecher;
    }

    #checkInvalidProperty(dbFilter: Record<string, string>) {
        const filterKeys = Object.keys(dbFilter);
        const result = filterKeys.some(
            (key) => !exactFilterProperties.includes(key),
        );
        this.#logger.debug('#checkInvalidProperty: result=%o', result);
        return result;
    }
}

/* eslint-enable unicorn/no-useless-undefined */
