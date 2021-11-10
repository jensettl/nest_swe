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
import type { Auto, AutoDocument } from '../entity';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import { AutoReadService } from '../service';
import { UseInterceptors } from '@nestjs/common';
import { UserInputError } from 'apollo-server-express';

export type AutoDTO = Auto & {
    id: string;
    version: number;
};

export interface AutoUpdateInput {
    id?: string;
    version?: number;
    auto: Auto;
}

interface Id {
    id: string;
}

@Resolver()
@UseInterceptors(ResponseTimeInterceptor)
export class AutoQueryResolver {
    readonly #service: AutoReadService;

    readonly #logger = getLogger(AutoQueryResolver.name);

    constructor(service: AutoReadService) {
        this.#service = service;
    }

    @Query('auto')
    async findById(@Args() id: Id) {
        const idStr = id.id;
        this.#logger.debug('findById: id=%s', idStr);

        const auto = await this.#service.findById(idStr);
        if (auto === undefined) {
            // UserInputError liefert Statuscode 200
            // Weitere Error-Klasse in apollo-server-errors:
            // SyntaxError, ValidationError, AuthenticationError, ForbiddenError,
            // PersistedQuery, PersistedQuery
            // https://www.apollographql.com/blog/graphql/error-handling/full-stack-error-handling-with-graphql-apollo
            throw new UserInputError(
                `Es wurde kein Auto mit der ID ${idStr} gefunden.`,
            );
        }
        const autoDTO = this.#toAutoDTO(auto);
        this.#logger.debug('findById: autoDTO=%o', autoDTO);
        return autoDTO;
    }

    @Query('autos')
    async find(@Args() modell: { modell: string } | undefined) {
        const modellStr = modell?.modell;
        this.#logger.debug('find: modell=%s', modellStr);
        const suchkriterium =
            modellStr === undefined ? {} : { modell: modellStr };
        const autos = await this.#service.find(suchkriterium);
        if (autos.length === 0) {
            // UserInputError liefert Statuscode 200
            throw new UserInputError('Es wurden keine Autos gefunden.');
        }

        const autosDTO = autos.map((auto) => this.#toAutoDTO(auto));
        this.#logger.debug('find: autosDTO=%o', autosDTO);
        return autosDTO;
    }

    // Resultat mit id (statt _id) und version (statt __v)
    // __ ist bei GraphQL fuer interne Zwecke reserviert
    #toAutoDTO(auto: AutoDocument) {
        const autoDTO: AutoDTO = {
            id: auto._id.toString(),
            version: auto.__v as number,
            modell: auto.modell,
            verbrauch: auto.verbrauch,
            typ: auto.typ,
            marke: auto.marke,
            preis: auto.preis,
            rabatt: auto.rabatt,
            lieferbar: auto.lieferbar,
            datum: auto.datum,
            modellnr: auto.modellnr,
            homepage: auto.homepage,
            herstellorte: auto.herstellorte,
        };
        return autoDTO;
    }
}
