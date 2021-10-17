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
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

// eslint-disable-next-line max-classes-per-file
import {
    ApiBearerAuth,
    ApiHeader,
    ApiNotFoundResponse,
    ApiOkResponse,
    ApiOperation,
    ApiParam,
    ApiProperty,
    ApiResponse,
    ApiTags,
} from '@nestjs/swagger';
import type { BuchArt, BuchDocument, Verlag } from '../entity';
import {
    Controller,
    Get,
    Headers,
    HttpStatus,
    Param,
    Query,
    Req,
    Res,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard, RolesGuard } from '../../security';
import { Request, Response } from 'express';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import { Buch } from '../entity';
import { BuchReadService } from '../service';
import type { ObjectID } from 'bson';
import { getBaseUri } from './getBaseUri';
import { paths } from '../../config';

interface Links {
    self: { href: string };
    list?: { href: string };
    add?: { href: string };
    update?: { href: string };
    remove?: { href: string };
}

// Interface fuer GET-Request mit Links fuer HATEOAS
export interface BuchDTO extends Buch {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
}

export interface BuecherDTO {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        buecher: BuchDTO[];
    };
}

/**
 * Klasse für `BuchGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `BuchController` hat dieselben Properties wie die Basisklasse
 * `Buch` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class BuchQuery extends Buch {
    @ApiProperty({ required: false })
    override readonly titel: string | undefined;

    @ApiProperty({ required: false })
    override readonly rating: number | undefined;

    @ApiProperty({ required: false })
    override readonly art: BuchArt | undefined;

    @ApiProperty({ required: false })
    override readonly verlag: Verlag | undefined;

    @ApiProperty({ required: false })
    override readonly preis: number | undefined;

    @ApiProperty({ required: false })
    override readonly rabatt: number | undefined;

    @ApiProperty({ required: false })
    override readonly lieferbar: boolean | undefined;

    @ApiProperty({ required: false, type: String })
    override readonly datum: string | undefined;

    @ApiProperty({ required: false })
    override readonly isbn: string | undefined;

    @ApiProperty({ required: false })
    override readonly homepage: string | undefined;

    @ApiProperty({ example: true, type: Boolean, required: false })
    readonly javascript: boolean | undefined;

    @ApiProperty({ example: true, type: Boolean, required: false })
    readonly typescript: boolean | undefined;
}

/**
 * Die Controller-Klasse für die Verwaltung von Bücher.
 */
@Controller(paths.api)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('REST-API')
@ApiBearerAuth()
export class BuchGetController {
    readonly #service: BuchReadService;

    readonly #logger = getLogger(BuchGetController.name);

    constructor(service: BuchReadService) {
        this.#service = service;
    }

    /**
     * Ein Buch wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Buch gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Buches gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Buch im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Buch zur angegebenen ID gibt, wird der Statuscode `404`
     * (`Not Found`) zurückgeliefert.
     *
     * @param id Pfad-Parameter `id`
     * @param req Request-Objekt von Express mit Pfadparameter, Query-String,
     *            Request-Header und Request-Body.
     * @param version Versionsnummer im Request-Header bei `If-None-Match`
     * @param accept Content-Type bzw. MIME-Type
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    // vgl Kotlin: Schluesselwort "suspend"
    // eslint-disable-next-line max-params, max-lines-per-function
    @Get(':id')
    @ApiOperation({ summary: 'Buch mit der ID suchen' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 000000000000000000000001',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Buch wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Buch zur ID gefunden' })
    // https://github.com/nestjs/swagger/issues/1501
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Buch wurde bereits heruntergeladen',
    })
    async findById(
        @Param('id') id: string,
        @Req() req: Request,
        @Headers('If-None-Match') version: string | undefined,
        @Res() res: Response,
    ) {
        this.#logger.debug('findById: id=%s, version=%s"', id, version);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('findById: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        let buch: BuchDocument | undefined;
        try {
            // vgl. Kotlin: Aufruf einer suspend-Function
            buch = await this.#service.findById(id);
        } catch (err) {
            // Exception einer export async function bei der Ausfuehrung fangen:
            // https://strongloop.com/strongblog/comparing-node-js-promises-trycatch-zone-js-angular
            this.#logger.error('findById: error=%o', err);
            return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (buch === undefined) {
            this.#logger.debug('findById: NOT_FOUND');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }
        this.#logger.debug('findById(): buch=%o', buch);

        // ETags
        const versionDb = buch.__v as number;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('findById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('findById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const buchDTO = this.#toDTO(buch, req, id);
        this.#logger.debug('findById: buchDTO=%o', buchDTO);
        return res.json(buchDTO);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Buch gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Buch zu den Suchkriterien gibt, wird der Statuscode `404`
     * (`Not Found`) gesetzt.
     *
     * Falls es keine Query-Parameter gibt, werden alle Bücher ermittelt.
     *
     * @param query Query-Parameter von Express.
     * @param req Request-Objekt von Express.
     * @param res Leeres Response-Objekt von Express.
     * @returns Leeres Promise-Objekt.
     */
    @Get()
    @ApiOperation({ summary: 'Bücher mit Suchkriterien suchen' })
    @ApiOkResponse({ description: 'Eine evtl. leere Liste mit Büchern' })
    async find(
        @Query() query: BuchQuery,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        this.#logger.debug('find: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('find: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const buecher = await this.#service.find(query);
        this.#logger.debug('find: %o', buecher);
        if (buecher.length === 0) {
            this.#logger.debug('find: NOT_FOUND');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }

        // HATEOAS: Atom Links je Buch
        const buecherDTO = buecher.map((buch) => {
            const id = (buch.id as ObjectID).toString();
            return this.#toDTO(buch, req, id, false);
        });
        this.#logger.debug('find: buecherDTO=%o', buecherDTO);

        const result: BuecherDTO = { _embedded: { buecher: buecherDTO } };
        return res.json(result).send();
    }

    // eslint-disable-next-line max-params
    #toDTO(buch: BuchDocument, req: Request, id: string, all = true) {
        const baseUri = getBaseUri(req);
        this.#logger.debug('#toDTO: baseUri=%s', baseUri);
        const links = all
            ? {
                  self: { href: `${baseUri}/${id}` },
                  list: { href: `${baseUri}` },
                  add: { href: `${baseUri}` },
                  update: { href: `${baseUri}/${id}` },
                  remove: { href: `${baseUri}/${id}` },
              }
            : { self: { href: `${baseUri}/${id}` } };

        this.#logger.debug('#toDTO: buch=%o, links=%o', buch, links);
        const buchDTO: BuchDTO = {
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
            _links: links,
        };
        return buchDTO;
    }
}
/* eslint-enable max-lines */