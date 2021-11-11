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
import { ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
    AutoFileService,
    AutoFileServiceError,
    AutoNotExists,
    FileNotFound,
    MultipleFiles,
} from '../service';
import {
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Put,
    Res,
    UploadedFile,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { Express, Response } from 'express';
import { JwtAuthGuard, Role, Roles, RolesGuard } from '../../security';
import { ResponseTimeInterceptor, getLogger } from '../../logger';
import type { DownloadError } from '../service';
import { FileInterceptor } from '@nestjs/platform-express';
import { fromBuffer } from 'file-type';

@Controller('file')
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(ResponseTimeInterceptor)
@ApiTags('REST-API')
export class AutoFileController {
    readonly #service: AutoFileService;

    readonly #logger = getLogger(AutoFileController.name);

    constructor(service: AutoFileService) {
        this.#service = service;
    }

    @Put(':id')
    @Roles(Role.ADMIN, Role.MITARBEITER)
    @HttpCode(HttpStatus.NO_CONTENT)
    // name= innerhalb von "multipart/form-data" ist auf "file" gesetzt
    // und wird zu File.fieldname
    @UseInterceptors(FileInterceptor('file'))
    @ApiConsumes('multipart/form-data')
    async upload(
        @Param('id') id: string,
        @UploadedFile() file: Express.Multer.File,
    ) {
        this.#logger.debug('upload: id=%s', id);
        const { fieldname, originalname, size, buffer } = file;
        this.#logger.debug(
            'upload: fieldname=%s, originalname=%s, mimetype=%s, size=%d',
            fieldname,
            originalname,
            size,
        );

        const fileType = await fromBuffer(buffer);
        this.#logger.debug('upload: fileType=%o', fileType);

        await this.#service.save(id, buffer, fileType);
    }

    @Get(':id')
    async download(@Param('id') id: string, @Res() res: Response) {
        this.#logger.debug('download: %s', id);

        const findResult = await this.#service.find(id);
        if (
            findResult instanceof AutoFileServiceError ||
            findResult instanceof AutoNotExists
        ) {
            return this.#handleDownloadError(findResult, res);
        }

        const file = findResult;
        const { readStream, contentType } = file;
        res.contentType(contentType);
        // https://www.freecodecamp.org/news/node-js-streams-everything-you-need-to-know-c9141306be93
        return readStream.pipe(res);
    }

    #handleDownloadError(err: AutoNotExists | DownloadError, res: Response) {
        if (err instanceof AutoNotExists) {
            const { id } = err;
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const msg = `Es gibt kein Auto mit der ID "${id!}".`;
            this.#logger.debug(
                'AutoFileRequestHandler.handleDownloadError(): msg=%s',
                msg,
            );
            return res
                .status(HttpStatus.PRECONDITION_FAILED)
                .set('Content-Type', 'text/plain')
                .send(msg);
        }

        if (err instanceof FileNotFound) {
            const { filename } = err;
            const msg = `Es gibt kein File mit Name ${filename}`;
            this.#logger.debug(
                'AutoFileRequestHandler.handleDownloadError(): msg=%s',
                msg,
            );
            return res.status(HttpStatus.NOT_FOUND).send(msg);
        }

        if (err instanceof MultipleFiles) {
            const { filename } = err;
            const msg = `Es gibt mehr als ein File mit Name ${filename}`;
            this.#logger.debug(
                'AutoFileRequestHandler.handleDownloadError(): msg=%s',
                msg,
            );
            return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send(msg);
        }

        return res.sendStatus(HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
