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
 * Das Modul besteht aus der Controller-Klasse für Health-Checks.
 * @packageDocumentation
 */

import { Controller, Get } from '@nestjs/common';
import {
    HealthCheck,
    HealthCheckService,
    HttpHealthIndicator,
    MongooseHealthIndicator,
} from '@nestjs/terminus';
import { k8sConfig, nodeConfig } from '../config';
import { Agent } from 'https';
import { ApiTags } from '@nestjs/swagger';

/**
 * Die Controller-Klasse für Health-Checks.
 */
@Controller('health')
@ApiTags('Health')
export class HealthController {
    readonly #health: HealthCheckService;

    readonly #http: HttpHealthIndicator;

    readonly #mongodb: MongooseHealthIndicator;

    readonly #schema = k8sConfig.detected && !k8sConfig.tls ? 'http' : 'https';

    readonly #httpsAgent = new Agent({
        requestCert: true,
        rejectUnauthorized: false,
        ca: nodeConfig.httpsOptions?.cert as Buffer,
    });

    constructor(
        health: HealthCheckService,
        http: HttpHealthIndicator,
        mongodb: MongooseHealthIndicator,
    ) {
        this.#health = health;
        this.#http = http;
        this.#mongodb = mongodb;
    }

    @Get()
    @HealthCheck()
    check() {
        return this.#health.check([
            () =>
                this.#http.pingCheck(
                    'auto REST-API',
                    `${this.#schema}://${nodeConfig.host}:${
                        nodeConfig.port
                    }/api/000000000000000000000001`,
                    { httpsAgent: this.#httpsAgent },
                ),
            () => this.#mongodb.pingCheck('MongoDB'),
        ]);
    }
}
