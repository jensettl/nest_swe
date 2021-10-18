/*
 * Copyright (C) 2021 - present Juergen Zimmermann, Florian Goebel, Hochschule Karlsruhe
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
 * Das Modul enthält die Funktionen, um die DB-Verbindung beim Herunterfahren
 * des Servers zu schließen und um einen DB-Client für Datei-Upload und
 * -Download bereitzustellen.
 * @packageDocumentation
 */

import { Injectable, ShutdownSignal } from '@nestjs/common';
import { MongoClient } from 'mongodb';
import type { OnApplicationShutdown } from '@nestjs/common';
import { dbConfig } from '../config/db';
import { disconnect } from 'mongoose';
import { getLogger } from '../logger';

/**
 * Die Test-DB wird im Development-Modus neu geladen, nachdem die Module
 * initialisiert sind, was duch `OnApplicationBootstrap` realisiert wird.
 */
@Injectable()
export class DbService implements OnApplicationShutdown {
    readonly #logger = getLogger(DbService.name);

    /**
     * DB-Verbindung beim Herunterfahren schließen. Siehe main.ts
     * @param signal z.B. `SIGINT`
     */
    async onApplicationShutdown(signal?: string) {
        this.#logger.debug('onApplicationShutdown: signal=%s', signal);

        if (signal === ShutdownSignal.SIGINT) {
            await disconnect();
            this.#logger.info(
                'onApplicationShutdown: Die DB-Verbindung fuer MongoDB wird geschlossen',
            );
        }
    }

    /**
     * DB-Verbindung für Datei-Upload und -Download bereitstellen
     * @returns DB-Client
     */
    async connect() {
        const { url } = dbConfig;
        const client = new MongoClient(url);
        await client.connect();
        return client;
    }
}
