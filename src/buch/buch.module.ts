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
    BuchFileService,
    BuchReadService,
    BuchValidationService,
    BuchWriteService,
} from './service';
import { buchSchema, collectionName } from './entity';
import { AuthModule } from '../security/auth/auth.module';
import { BuchFileController } from './rest/buch-file.controller';
import { BuchGetController } from './rest/buch-get.controller';
import { BuchMutationResolver } from './graphql/buch-mutation.resolver';
import { BuchQueryResolver } from './graphql/buch-query.resolver';
import { BuchWriteController } from './rest/buch-write.controller';
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
                schema: buchSchema,
                collection: collectionName,
            },
        ]),
        AuthModule,
        DbModule,
    ],
    controllers: [BuchGetController, BuchWriteController, BuchFileController],
    // Provider sind z.B. Service-Klassen fuer DI
    providers: [
        BuchReadService,
        BuchWriteService,
        BuchFileService,
        BuchValidationService,
        BuchQueryResolver,
        BuchMutationResolver,
    ],
    // Export der Provider fuer DI in anderen Modulen
    exports: [
        BuchReadService,
        BuchWriteService,
        BuchValidationService,
        BuchFileService,
    ],
})
export class BuchModule {}
