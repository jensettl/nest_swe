/* eslint-disable max-lines */
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

/**
 * Das Modul besteht aus der Controller-Klasse für Schreiben an der REST-Schnittstelle.
 * @packageDocumentation
 */

import {
    ApiBadRequestResponse,
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiHeader,
    ApiNoContentResponse,
    ApiOperation,
    ApiPreconditionFailedResponse,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import {
    Body,
    Controller,
    Delete,
    Headers,
    HttpStatus,
    Param,
    Post,
    Put,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
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
import type { CreateError, UpdateError } from '../service';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '../../security';
import { Request, Response } from 'express';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import { Buch } from '../entity';
import { getBaseUri } from './getBaseUri';
import { paths } from '../../config';

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
@Controller(paths.api)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('REST-API')
@ApiBearerAuth()
export class BuchWriteController {
    readonly #service: BuchWriteService;

    readonly #logger = getLogger(BuchWriteController.name);

    constructor(service: BuchWriteService) {
        this.#service = service;
    }

    /**
     * Ein neues Buch wird asynchron angelegt. Das neu anzulegende Buch ist als
     * JSON-Datensatz im Request-Objekt enthalten. Wenn es keine
     * Verletzungen von Constraints gibt, wird der Statuscode `201` (`Created`)
     * gesetzt und im Response-Header wird `Location` auf die URI so gesetzt,
     * dass damit das neu angelegte Buch abgerufen werden kann.
     *
     * Falls Constraints verletzt sind, wird der Statuscode `400` (`Bad Request`)
     * gesetzt und genauso auch wenn der Titel oder die ISBN-Nummer bereits
     * existieren.
     *
     * @param buch JSON-Daten für ein Buch im Request-Body.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Post()
    @Roles(Role.ADMIN, Role.MITARBEITER)
    @ApiOperation({ summary: 'Ein neues Buch anlegen' })
    @ApiCreatedResponse({ description: 'Erfolgreich neu angelegt' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Buchdaten' })
    async create(
        @Body() buch: Buch,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        this.#logger.debug('create: buch=%o', buch);

        const result = await this.#service.create(buch);
        if (result instanceof BuchServiceError) {
            return this.#handleCreateError(result, res);
        }

        const location = `${getBaseUri(req)}/${result.toString()}`;
        this.#logger.debug('create: location=%s', location);
        return res.location(location).send();
    }

    /**
     * Ein vorhandenes Buch wird asynchron aktualisiert.
     *
     * Im Request-Objekt von Express muss die ID des zu aktualisierenden Buches
     * als Pfad-Parameter enthalten sein. Außerdem muss im Rumpf das zu
     * aktualisierende Buch als JSON-Datensatz enthalten sein. Damit die
     * Aktualisierung überhaupt durchgeführt werden kann, muss im Header
     * `If-Match` auf die korrekte Version für optimistische Synchronisation
     * gesetzt sein.
     *
     * Bei erfolgreicher Aktualisierung wird der Statuscode `204` (`No Content`)
     * gesetzt und im Header auch `ETag` mit der neuen Version mitgeliefert.
     *
     * Falls die Versionsnummer fehlt, wird der Statuscode `428` (`Precondition
     * required`) gesetzt; und falls sie nicht korrekt ist, der Statuscode `412`
     * (`Precondition failed`). Falls Constraints verletzt sind, wird der
     * Statuscode `400` (`Bad Request`) gesetzt und genauso auch wenn der neue
     * Titel oder die neue ISBN-Nummer bereits existieren.
     *
     * @param buch Buchdaten im Body des Request-Objekts.
     * @param id Pfad-Paramater für die ID.
     * @param version Versionsnummer aus dem Header _If-Match_.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // eslint-disable-next-line max-params
    @Put(':id')
    @Roles(Role.ADMIN, Role.MITARBEITER)
    @ApiOperation({ summary: 'Ein vorhandenes Buch aktualisieren' })
    @ApiHeader({
        name: 'If-Match',
        description: 'Header für optimistische Synchronisation',
        required: false,
    })
    @ApiHeader({
        name: 'Authorization',
        description: 'Header für JWT',
        required: true,
    })
    @ApiNoContentResponse({ description: 'Erfolgreich aktualisiert' })
    @ApiBadRequestResponse({ description: 'Fehlerhafte Buchdaten' })
    @ApiPreconditionFailedResponse({
        description: 'Falsche Version im Header "If-Match"',
    })
    @ApiResponse({
        status: HttpStatus.PRECONDITION_REQUIRED,
        description: 'Header "If-Match" fehlt',
    })
    async update(
        @Body() buch: Buch,
        @Param('id') id: string,
        @Headers('If-Match') version: string | undefined,
        @Res() res: Response,
    ) {
        this.#logger.debug(
            'update: id=%s, buch=%o, version=%s',
            id,
            buch,
            version,
        );

        if (version === undefined) {
            const msg = 'Header "If-Match" fehlt';
            this.#logger.debug('#handleUpdateError: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_REQUIRED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        const result = await this.#service.update(id, buch, version);
        if (result instanceof BuchServiceError) {
            return this.#handleUpdateError(result, res);
        }

        this.#logger.debug('update: version=%d', result);
        return res.set('ETag', `"${result}"`).sendStatus(HttpStatus.NO_CONTENT);
    }

    /**
     * Ein Buch wird anhand seiner ID-gelöscht, die als Pfad-Parameter angegeben
     * ist. Der zurückgelieferte Statuscode ist `204` (`No Content`).
     *
     * @param id Pfad-Paramater für die ID.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiOperation({ summary: 'Buch mit der ID löschen' })
    @ApiHeader({
        name: 'Authorization',
        description: 'Header für JWT',
        required: true,
    })
    @ApiNoContentResponse({
        description: 'Das Buch wurde gelöscht oder war nicht vorhanden',
    })
    async delete(@Param('id') id: string, @Res() res: Response) {
        this.#logger.debug('delete: id=%s', id);

        let deleted: boolean;
        try {
            deleted = await this.#service.delete(id);
        } catch (err) {
            this.#logger.error('delete: error=%o', err);
            return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        }
        this.#logger.debug('delete: deleted=%s', deleted);

        return res.sendStatus(HttpStatus.NO_CONTENT);
    }

    #handleCreateError(err: CreateError, res: Response) {
        if (err instanceof BuchInvalid) {
            return this.#handleValidationError(err.messages, res);
        }

        if (err instanceof TitelExists) {
            return this.#handleTitelExists(err.titel, res);
        }

        if (err instanceof IsbnExists) {
            return this.#handleIsbnExists(err.isbn, res);
        }

        return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }

    #handleValidationError(messages: readonly string[], res: Response) {
        this.#logger.debug('#handleValidationError: messages=%o', messages);
        return res.status(HttpStatus.BAD_REQUEST).send(messages);
    }

    #handleTitelExists(titel: string | null | undefined, res: Response) {
        const msg = `Der Titel "${titel}" existiert bereits.`;
        this.#logger.debug('#handleTitelExists(): msg=%s', msg);
        return res
            .status(HttpStatus.BAD_REQUEST)
            .set('Content-Type', 'text/plain')
            .send(msg);
    }

    #handleIsbnExists(isbn: string | null | undefined, res: Response) {
        const msg = `Die ISBN-Nummer "${isbn}" existiert bereits.`;
        this.#logger.debug('#handleIsbnExists(): msg=%s', msg);
        return res
            .status(HttpStatus.BAD_REQUEST)
            .set('Content-Type', 'text/plain')
            .send(msg);
    }

    #handleUpdateError(err: UpdateError, res: Response) {
        if (err instanceof BuchInvalid) {
            return this.#handleValidationError(err.messages, res);
        }

        if (err instanceof BuchNotExists) {
            const { id } = err;
            const msg = `Es gibt kein Buch mit der ID "${id}".`;
            this.#logger.debug('#handleUpdateError: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        if (err instanceof TitelExists) {
            return this.#handleTitelExists(err.titel, res);
        }

        if (err instanceof VersionInvalid) {
            const { version } = err;
            const msg = `Die Versionsnummer "${version}" ist ungueltig.`;
            this.#logger.debug('#handleUpdateError: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        if (err instanceof VersionOutdated) {
            const { version } = err;
            const msg = `Die Versionsnummer "${version}" ist nicht aktuell.`;
            this.#logger.debug('#handleUpdateError: msg=%s', msg);
            return res
                .status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
/* eslint-enable max-lines */
