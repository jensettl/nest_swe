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
    BuchInvalid,
    BuchNotExists,
    BuchServiceError,
    BuchWriteService,
    IsbnExists,
    TitelExists,
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
import { Buch } from '../entity';
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
// alternativ: globale Aktivierung der Guards https://docs.nestjs.com/security/authorization#basic-rbac-implementation
@UseGuards(JwtAuthGraphQlGuard, RolesGraphQlGuard)
@UseInterceptors(ResponseTimeInterceptor)
export class BuchMutationResolver {
    readonly #service: BuchWriteService;

    readonly #logger = getLogger(BuchMutationResolver.name);

    constructor(service: BuchWriteService) {
        this.#service = service;
    }

    @Mutation()
    @Roles(Role.ADMIN, Role.MITARBEITER)
    async create(@Args() input: Buch) {
        this.#logger.debug('createBuch: input=%o', input);
        const result = await this.#service.create(input);
        this.#logger.debug('createBuch: result=%o', result);
        if (result instanceof BuchServiceError) {
            // UserInputError liefert Statuscode 200
            throw new UserInputError(this.#errorMsgCreateBuch(result));
        }
        return result.toString();
    }

    @Mutation()
    @Roles(Role.ADMIN, Role.MITARBEITER)
    async update(@Args() buchDTO: BuchUpdateInput) {
        this.#logger.debug('updateBuch: buchDTO=%o', buchDTO);
        // nullish coalescing
        const { id, version, buch } = buchDTO;
        const versionStr = `"${(version ?? 0).toString()}"`;

        const result = await this.#service.update(id!, buch, versionStr); // eslint-disable-line @typescript-eslint/no-non-null-assertion
        if (result instanceof BuchServiceError) {
            throw new UserInputError(this.#errorMsgUpdateBuch(result));
        }
        this.#logger.debug('updateBuch: result=%d', result);
        return result;
    }

    @Mutation()
    @Roles(Role.ADMIN)
    async delete(@Args() id: Id) {
        const idStr = id.id;
        this.#logger.debug('deleteBuch: id=%s', idStr);
        const result = await this.#service.delete(idStr);
        this.#logger.debug('deleteBuch: result=%s', result);
        return result;
    }

    #errorMsgCreateBuch(err: BuchServiceError) {
        if (err instanceof BuchInvalid) {
            return err.messages.join(' ');
        }
        if (err instanceof TitelExists) {
            return `Der Titel "${err.titel}" existiert bereits`;
        }
        if (err instanceof IsbnExists) {
            return `Die ISBN ${err.isbn} existiert bereits`;
        }
        return 'Unbekannter Fehler';
    }

    #errorMsgUpdateBuch(err: BuchServiceError) {
        if (err instanceof BuchInvalid) {
            return err.messages.join(' ');
        }
        if (err instanceof TitelExists) {
            return `Der Titel "${err.titel}" existiert bereits`;
        }
        if (err instanceof BuchNotExists) {
            return `Es gibt kein Buch mit der ID ${err.id}`;
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
