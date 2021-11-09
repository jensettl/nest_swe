/*
 * Copyright (C) 2020 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul enthält die Konfiguration für den Zugriff auf MongoDB.
 * @packageDocumentation
 */

import { env } from './env';
import { k8sConfig } from './kubernetes';

const { dbConfigEnv } = env;

// nullish coalescing
const dbName = dbConfigEnv.name ?? 'acme';
const { detected } = k8sConfig;
const host = detected ? 'mongodb' : dbConfigEnv.host ?? 'localhost';
const atlas = host.endsWith('mongodb.net');
const user = dbConfigEnv.user ?? 'admin';
const pass = dbConfigEnv.password ?? 'p';
const autoIndex = dbConfigEnv.autoIndex?.toLowerCase() === 'true';
const dbPopulate = dbConfigEnv.populate?.toLowerCase() === 'true';
const dbPopulateFiles = dbConfigEnv.populateFiles?.toLowerCase() === 'true';

// https://docs.mongodb.com/manual/reference/connection-string
// Default:
//  retryWrites=true            ab MongoDB-Treiber 4.2
//  readPreference=primary
// "mongodb+srv://" statt "mongodb://" fuer eine "DNS seedlist" z.B. bei "Replica Set"
// https://docs.mongodb.com/manual/reference/write-concern
const url = atlas
    ? `mongodb+srv://${user}:${pass}@${host}/${dbName}?replicaSet=Cluster0-shard-0&w=majority`
    : `mongodb://${user}:${pass}@${host}/${dbName}?authSource=admin`;

interface DbConfig {
    readonly atlas: boolean;
    readonly url: string;
    readonly dbName: string;
    readonly autoIndex: boolean;
    readonly dbPopulate: boolean;
    readonly dbPopulateFiles: boolean;
}

/**
 * Das Konfigurationsobjekt für den Zugriff auf MongoDB.
 */
export const dbConfig: DbConfig = {
    atlas,
    url,
    dbName,
    autoIndex,
    dbPopulate,
    dbPopulateFiles,
};

const dbConfigLog = {
    atlas,
    url: url.replace(/\/\/.*:/u, '//USERNAME:@').replace(/:[^:]*@/u, ':***@'),
    dbName,
    autoIndex,
    dbPopulate,
    dbPopulateFiles,
};

console.info('dbConfig: %o', dbConfigLog);
