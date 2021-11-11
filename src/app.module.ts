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
import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { dbConfig, graphQlConfig } from './config';
import { AuthModule } from './security/auth/auth.module';
import { AutoModule } from './auto/auto.module';
import { DbModule } from './db/db.module';
import { DevModule } from './config/dev/dev.module';
import { GraphQLModule } from '@nestjs/graphql';
import { HealthModule } from './health/health.module';
import { LoggerModule } from './logger/logger.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { RequestLoggerMiddleware } from './logger';

@Module({
    imports: [
        AuthModule,
        AutoModule,
        MongooseModule.forRoot(dbConfig.url),
        DbModule,
        DevModule,
        GraphQLModule.forRoot({
            typePaths: ['./**/*.graphql'],
            debug: graphQlConfig.debug,
        }),
        LoggerModule,
        HealthModule,
        // default: TEMP-Verzeichnis des Betriebssystems
        MulterModule.register(),
    ],
})
export class AppModule implements NestModule {
    configure(consumer: MiddlewareConsumer) {
        consumer
            .apply(RequestLoggerMiddleware)
            .forRoutes('api', 'auth', 'graphql', 'file');
    }
}
