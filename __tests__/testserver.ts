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
import { nodeConfig, paths } from '../src/config';
import { Agent } from 'https';
import { AppModule } from '../src/app.module';
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

export const apiPath = paths.api;
export const loginPath = `${paths.auth}/${paths.login}`;

export const { host, port } = nodeConfig;

const { httpsOptions } = nodeConfig;

// -----------------------------------------------------------------------------
// T e s t s e r v e r   m i t   H T T P S
// -----------------------------------------------------------------------------
let testserver: INestApplication;

export const createTestserver = async () => {
    if (httpsOptions === undefined) {
        throw new Error('HTTPS wird nicht konfiguriert.');
    }
    testserver = await NestFactory.create(AppModule, {
        httpsOptions,
        logger: false,
    });
    await testserver.listen(port);
    return testserver;
};

export const shutdownTestserver = async () => {
    try {
        await testserver.close();
    } catch {
        console.warn('Der Testserver wurde fehlerhaft beendet.');
    }
};

// fuer selbst-signierte Zertifikate
export const httpsAgent = new Agent({
    requestCert: true,
    rejectUnauthorized: false,
    ca: httpsOptions?.cert as Buffer,
});
