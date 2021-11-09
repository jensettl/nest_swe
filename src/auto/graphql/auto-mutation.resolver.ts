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
import { Args, Mutation, Resolver } from '@nestjs/graphql';
import {
    AutoInvalid,
    AutoNotExists,
    AutoServiceError,
    AutoWriteService,
    ModellNrExists,
    ModellExists,
    VersionInvalid,
    VersionOutdated,
} from '../service';
import {
    JwtAuthGraphQlGuard,
    Role,
    Roles,
    RolesGraphQlGuard,
} from '../../security';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import { UseGuards, UseInterceptors } from '@nestjs/common';
import { Auto } from '../entity';
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
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(JwtAuthGraphQlGuard, RolesGraphQlGuard)
@UseInterceptors(ResponseTimeInterceptor)
export class AutoMutationResolver {
    readonly #service: AutoWriteService;

    readonly #logger = getLogger(AutoMutationResolver.name);

    constructor(service: AutoWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles(Role.ADMIN, Role.MITARBEITER)
    async create(@Args() input: Auto) {
        this.#logger.debug('createAuto: input=%o', input);
        const result = await this.#service.create(input);
        this.#logger.debug('createAuto: result=%o', result);
        if (result instanceof AutoServiceError) {
            // UserInputError liefert Statuscode 200
            throw new UserInputError(this.#errorMsgCreateAuto(result));
        }
        return result.toString();
    }

    @Mutation()
    @Roles(Role.ADMIN, Role.MITARBEITER)
    async update(@Args() autoDTO: AutoUpdateInput) {
        this.#logger.debug('updateAuto: autoDTO=%o', autoDTO);
        // nullish coalescing
        const { id, version, auto } = autoDTO;
        const versionStr = `"${(version ?? 0).toString()}"`;

        const result = await this.#service.update(id!, auto, versionStr); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        if (result instanceof AutoServiceError) {
            throw new UserInputError(this.#errorMsgUpdateAuto(result));
        }
        this.#logger.debug('updateAuto: result=%d', result);
        return result;
    }

    @Mutation()
    @Roles(Role.ADMIN)
    async delete(@Args() id: Id) {
        const idStr = id.id;
        this.#logger.debug('deleteAuto: id=%s', idStr);
        const result = await this.#service.delete(idStr);
        this.#logger.debug('deleteAuto: result=%s', result);
        return result;
    }

    #errorMsgCreateAuto(err: AutoServiceError) {
        if (err instanceof AutoInvalid) {
            return err.messages.join(' ');
        }
        if (err instanceof ModellExists) {
            return `Das Modell "${err.modell}" existiert bereits`;
        }
        if (err instanceof ModellNrExists) {
            return `Die MODELLNR ${err.modellnr} existiert bereits`;
        }
        return 'Unbekannter Fehler';
    }

    #errorMsgUpdateAuto(err: AutoServiceError) {
        if (err instanceof AutoInvalid) {
            return err.messages.join(' ');
        }
        if (err instanceof ModellExists) {
            return `Das Modell "${err.modell}" existiert bereits`;
        }
        if (err instanceof AutoNotExists) {
            return `Es gibt kein Auto mit der ID ${err.id}`;
        }
        if (err instanceof VersionInvalid) {
            return `"${err.version}" ist keine gueltige Versionsnummer`;
        }
        if (err instanceof VersionOutdated) {
            return `Die Versionsnummer "${err.version}" ist nicht mehr aktuell`;
        }
        return 'Unbekannter Fehler';
    }
}
