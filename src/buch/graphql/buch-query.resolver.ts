/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Hochschule Karlsruhe
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
import { Args, Query, Resolver } from '@nestjs/graphql';
import type { Buch, BuchDocument } from '../entity';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import { BuchReadService } from '../service';
import { UseInterceptors } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';

export type BuchDTO = Buch & {
    id: string;
    version: number;
};

export interface BuchUpdateInput {
    id?: string;
    version?: number;
    buch: Buch;
}

interface Id {
    id: string;
}

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
export class BuchQueryResolver {
    readonly #service: BuchReadService;

    readonly #logger = getLogger(BuchQueryResolver.name);

    constructor(service: BuchReadService) {
        this.#service = service;
    }

    @Query('buch')
    async findById(@Args() id: Id) {
        const idStr = id.id;
        this.#logger.debug('findById: id=%s', idStr);

        const buch = await this.#service.findById(idStr);
        if (buch === undefined) {
            // UserInputError liefert Statuscode 200
            // Weitere Error-Klasse in apollo-server-errors:
            // SyntaxError, ValidationError, AuthenticationError, ForbiddenError,
            // PersistedQuery, PersistedQuery
            // https://www.apollographql.com/blog/graphql/error-handling/full-stack-error-handling-with-graphql-apollo
            throw new UserInputError(
                `Es wurde kein Buch mit der ID ${idStr} gefunden.`,
            );
        }
        const buchDTO = this.#toBuchDTO(buch);
        this.#logger.debug('findById: buchDTO=%o', buchDTO);
        return buchDTO;
    }

    @Query('buecher')
    async find(@Args() titel: { titel: string } | undefined) {
        const titelStr = titel?.titel;
        this.#logger.debug('find: titel=%s', titelStr);
        const suchkriterium = titelStr === undefined ? {} : { titel: titelStr };
        const buecher = await this.#service.find(suchkriterium);
        if (buecher.length === 0) {
            // UserInputError liefert Statuscode 200
            throw new UserInputError('Es wurden keine Buecher gefunden.');
        }

        const buecherDTO = buecher.map((buch) => this.#toBuchDTO(buch));
        this.#logger.debug('find: buecherDTO=%o', buecherDTO);
        return buecherDTO;
    }

    // Resultat mit id (statt _id) und version (statt __v)
    // __ ist bei GraphQL fuer interne Zwecke reserviert
    #toBuchDTO(buch: BuchDocument) {
        const buchDTO: BuchDTO = {
            id: buch._id.toString(),
            version: buch.__v as number,
            titel: buch.titel,
            rating: buch.rating,
            art: buch.art,
            verlag: buch.verlag,
            preis: buch.preis,
            rabatt: buch.rabatt,
            lieferbar: buch.lieferbar,
            datum: buch.datum,
            isbn: buch.isbn,
            homepage: buch.homepage,
            schlagwoerter: buch.schlagwoerter,
        };
        return buchDTO;
    }
}
