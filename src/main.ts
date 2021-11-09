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
// Pfad innerhalb von Packages in node_modules ("nicht-relative Imports")
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// relativer Import
import { corsOptions, helmetHandlers } from './security';
import { nodeConfig, paths } from './config';
import { AppModule } from './app.module';
// TODO https://github.com/typescript-eslint/typescript-eslint/issues/3950
// TODO https://github.com/prettier/prettier/issues/11600
import type { INestApplication } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { SwaggerCustomOptions } from '@nestjs/swagger';
import compression from 'compression';

// Destructuring
const { httpsOptions, port } = nodeConfig;

// "Arrow Function" ab ES 2015
const setupSwagger = (app: INestApplication) => {
    const config = new DocumentBuilder()
        .setTitle('Auto')
        .setDescription('Beispiel für Software Engineering')
        .setVersion('1.0.0')
        .addBearerAuth()
        .build();
    const document = SwaggerModule.createDocument(app, config);
    const options: SwaggerCustomOptions = {
        customSiteTitle: 'Software Engineering 2021/22',
    };
    SwaggerModule.setup(paths.swagger, app, document, options);
};

// async/await ab ES 2017, vgl: C#
// Promise ab ES 2015, vgl: Future in Java
const bootstrap = async () => {
    const app =
        httpsOptions === undefined
            ? await NestFactory.create(AppModule)
            : await NestFactory.create(AppModule, { httpsOptions }); // "Shorthand Properties" ab ES 2015

    // https://docs.nestjs.com/security/helmet
    app.use(helmetHandlers);

    setupSwagger(app);
    // compression von Express fuer GZip-Komprimierung
    // Default "Chunk Size" ist 16 KB: https://github.com/expressjs/compression#chunksize
    app.use(compression());
    // cors von Express fuer CORS (= cross origin resource sharing)
    app.enableCors(corsOptions);
    app.enableShutdownHooks();

    await app.listen(port);
};

// "Top-Level await" ab ES 2021, nicht fuer CommonJS-Module
// eslint-disable-next-line @typescript-eslint/no-floating-promises
bootstrap();

// IIFE = immediately invoked function expression
// (async () => {
//     await bootstrap();
// })();
