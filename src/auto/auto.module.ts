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
import {
    AutoFileService,
    AutoReadService,
    AutoValidationService,
    AutoWriteService,
} from './service';
import { autoSchema, collectionName } from './entity';
import { AuthModule } from '../security/auth/auth.module';
import { AutoFileController } from './rest/auto-file.controller';
import { AutoGetController } from './rest/auto-get.controller';
import { AutoMutationResolver } from './graphql/auto-mutation.resolver';
import { AutoQueryResolver } from './graphql/auto-query.resolver';
import { AutoWriteController } from './rest/auto-write.controller';
import { DbModule } from '../db/db.module';
import { MailModule } from '../mail/mail.module';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

/**
 * Das Modul besteht aus Controller- und Service-Klassen für die Verwaltung von
 * Bücher.
 * @packageDocumentation
 */

/**
 * Die dekorierte Modul-Klasse mit Controller- und Service-Klassen sowie der
 * Funktionalität für Mongoose.
 */
@Module({
    imports: [
        MailModule,
        MongooseModule.forFeature([
            {
                name: collectionName,
                schema: autoSchema,
                collection: collectionName,
            },
        ]),
        AuthModule,
        DbModule,
    ],
    controllers: [AutoGetController, AutoWriteController, AutoFileController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        AutoReadService,
        AutoWriteService,
        AutoFileService,
        AutoValidationService,
        AutoQueryResolver,
        AutoMutationResolver,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [
        AutoReadService,
        AutoWriteService,
        AutoValidationService,
        AutoFileService,
    ],
})
export class AutoModule {}
