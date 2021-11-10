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
import type { AutoDocument, AutoTyp, Marke } from '../entity';
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
import { Auto } from '../entity';
import { AutoReadService } from '../service';
// TODO https://github.com/typescript-eslint/typescript-eslint/issues/3950
// TODO https://github.com/prettier/prettier/issues/11600
import type { ObjectID } from 'bson';
import { getBaseUri } from './getBaseUri';
import { paths } from '../../config';

// TypeScript
interface Link {
    href: string;
}
interface Links {
    self: Link;
    // optional
    list?: Link;
    add?: Link;
    update?: Link;
    remove?: Link;
}

// Interface fuer GET-Request mit Links fuer HATEOAS
// DTO = data transfer object
export interface AutoDTO extends Auto {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _links: Links;
}

export interface AutosDTO {
    // eslint-disable-next-line @typescript-eslint/naming-convention
    _embedded: {
        autos: AutoDTO[];
    };
}

/**
 * Klasse für `AutoGetController`, um Queries in _OpenAPI_ bzw. Swagger zu
 * formulieren. `AutoController` hat dieselben Properties wie die Basisklasse
 * `Auto` - allerdings mit dem Unterschied, dass diese Properties beim Ableiten
 * so überschrieben sind, dass sie auch nicht gesetzt bzw. undefined sein
 * dürfen, damit die Queries flexibel formuliert werden können. Deshalb ist auch
 * immer der zusätzliche Typ undefined erforderlich.
 * Außerdem muss noch `string` statt `Date` verwendet werden, weil es in OpenAPI
 * den Typ Date nicht gibt.
 */
export class AutoQuery extends Auto {
    @ApiProperty({ required: false })
    override readonly modell: string | undefined;

    @ApiProperty({ required: false })
    override readonly verbrauch: number | undefined;

    @ApiProperty({ required: false })
    override readonly typ: AutoTyp | undefined;

    @ApiProperty({ required: false })
    override readonly marke: Marke | undefined;

    @ApiProperty({ required: false })
    override readonly preis: number | undefined;

    @ApiProperty({ required: false })
    override readonly rabatt: number | undefined;

    @ApiProperty({ required: false })
    override readonly lieferbar: boolean | undefined;

    @ApiProperty({ required: false, type: String })
    override readonly datum: string | undefined;

    @ApiProperty({ required: false })
    override readonly modellnr: string | undefined;

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
// Decorator in TypeScript
@Controller(paths.api)
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('REST-API')
@ApiBearerAuth()
// Klassen ab ES 2015
export class AutoGetController {
    // readonly in TypeScript, vgl. C#
    // private ab ES 2019
    readonly #service: AutoReadService;

    readonly #logger = getLogger(AutoGetController.name);

    // Dependency Injection (DI)
    constructor(service: AutoReadService) {
        this.#service = service;
    }

    /**
     * Ein Auto wird asynchron anhand seiner ID als Pfadparameter gesucht.
     *
     * Falls es ein solches Auto gibt und `If-None-Match` im Request-Header
     * auf die aktuelle Version des Autoes gesetzt war, wird der Statuscode
     * `304` (`Not Modified`) zurückgeliefert. Falls `If-None-Match` nicht
     * gesetzt ist oder eine veraltete Version enthält, wird das gefundene
     * Auto im Rumpf des Response als JSON-Datensatz mit Atom-Links für HATEOAS
     * und dem Statuscode `200` (`OK`) zurückgeliefert.
     *
     * Falls es kein Auto zur angegebenen ID gibt, wird der Statuscode `404`
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
    @ApiOperation({ summary: 'Auto mit der ID suchen' })
    @ApiParam({
        name: 'id',
        description: 'Z.B. 000000000000000000000001',
    })
    @ApiHeader({
        name: 'If-None-Match',
        description: 'Header für bedingte GET-Requests, z.B. "0"',
        required: false,
    })
    @ApiOkResponse({ description: 'Das Auto wurde gefunden' })
    @ApiNotFoundResponse({ description: 'Kein Auto zur ID gefunden' })
    @ApiResponse({
        status: HttpStatus.NOT_MODIFIED,
        description: 'Das Auto wurde bereits heruntergeladen',
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

        let auto: AutoDocument | undefined;
        try {
            // vgl. Kotlin: Aufruf einer suspend-Function
            auto = await this.#service.findById(id);
        } catch (err) {
            // Exception einer export async function bei der Ausfuehrung fangen:
            // https://strongloop.com/strongblog/comparing-node-js-promises-trycatch-zone-js-angular
            this.#logger.error('findById: error=%o', err);
            return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        }

        if (auto === undefined) {
            this.#logger.debug('findById: NOT_FOUND');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }
        this.#logger.debug('findById(): auto=%o', auto);

        // ETags
        const versionDb = auto.__v as number;
        if (version === `"${versionDb}"`) {
            this.#logger.debug('findById: NOT_MODIFIED');
            return res.sendStatus(HttpStatus.NOT_MODIFIED);
        }
        this.#logger.debug('findById: versionDb=%s', versionDb);
        res.header('ETag', `"${versionDb}"`);

        // HATEOAS mit Atom Links und HAL (= Hypertext Application Language)
        const autoDTO = this.#toDTO(auto, req, id);
        this.#logger.debug('findById: autoDTO=%o', autoDTO);
        return res.json(autoDTO);
    }

    /**
     * Bücher werden mit Query-Parametern asynchron gesucht. Falls es mindestens
     * ein solches Auto gibt, wird der Statuscode `200` (`OK`) gesetzt. Im Rumpf
     * des Response ist das JSON-Array mit den gefundenen Büchern, die jeweils
     * um Atom-Links für HATEOAS ergänzt sind.
     *
     * Falls es kein Auto zu den Suchkriterien gibt, wird der Statuscode `404`
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
        @Query() query: AutoQuery,
        @Req() req: Request,
        @Res() res: Response,
    ) {
        this.#logger.debug('find: query=%o', query);

        if (req.accepts(['json', 'html']) === false) {
            this.#logger.debug('find: accepted=%o', req.accepted);
            return res.sendStatus(HttpStatus.NOT_ACCEPTABLE);
        }

        const autos = await this.#service.find(query);
        this.#logger.debug('find: %o', autos);
        if (autos.length === 0) {
            this.#logger.debug('find: NOT_FOUND');
            return res.sendStatus(HttpStatus.NOT_FOUND);
        }

        // HATEOAS: Atom Links je Auto
        const autosDTO = autos.map((auto) => {
            const id = (auto.id as ObjectID).toString();
            return this.#toDTO(auto, req, id, false);
        });
        this.#logger.debug('find: autosDTO=%o', autosDTO);

        const result: AutosDTO = { _embedded: { autos: autosDTO } };
        return res.json(result).send();
    }

    // eslint-disable-next-line max-params
    #toDTO(auto: AutoDocument, req: Request, id: string, all = true) {
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

        this.#logger.debug('#toDTO: auto=%o, links=%o', auto, links);
        const autoDTO: AutoDTO = {
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
            _links: links,
        };
        return autoDTO;
    }
}
/* eslint-enable max-lines */
