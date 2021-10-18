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
 * Das Modul enthält Objekte mit Daten aus Umgebungsvariablen.
 * @packageDocumentation
 */

// Umgebungsvariable durch die Konfigurationsdatei .env
// evtl. node-config
import dotenv from 'dotenv';
import type pino from 'pino';

// .env nur einlesen, falls nicht in Kubernetes bzw. in der Cloud
dotenv.config();

const {
    // Umgebungsvariable `NODE_ENV` als gleichnamige Konstante, die i.a. einen der
    // folgenden Werte enthält:
    // - `production`, z.B. in der _Heroku_-Cloud,
    // - `development` oder
    // - `test`
    NODE_ENV,
    PORT,
    BUCH_SERVICE_HOST,
    BUCH_SERVICE_PORT,
    K8S_TLS,
    DB_NAME,
    DB_HOST,
    DB_USER,
    DB_PASS,
    DB_AUTO_INDEX,
    DB_POPULATE,
    DB_POPULATE_FILES,
    APOLLO_DEBUG,
    APOLLO_SANDBOX,
    LOG_LEVEL,
    LOG_DIR,
    LOG_PRETTY,
    LOG_DEFAULT,
    JWT_EXPIRES_IN,
    JWT_ISSUER,
    MAIL_HOST,
    MAIL_PORT,
    MAIL_LOG,
    USER_PASSWORD_ENCODED,
} = process.env; // eslint-disable-line node/no-process-env

interface NodeConfigEnv {
    readonly nodeEnv: string | undefined;
    // fuer OpenShift
    readonly port: string | undefined;
    readonly serviceHost: string | undefined;
    readonly servicePort: string | undefined;
}

const nodeConfigEnv: NodeConfigEnv = {
    nodeEnv: NODE_ENV,
    port: PORT,
    serviceHost: BUCH_SERVICE_HOST,
    servicePort: BUCH_SERVICE_PORT,
};

interface ApolloConfigEnv {
    readonly debug: string | undefined;
    readonly sandbox: string | undefined;
}

const apolloConfigEnv: ApolloConfigEnv = {
    debug: APOLLO_DEBUG,
    sandbox: APOLLO_SANDBOX,
};

interface K8sConfigEnv {
    readonly tls: string | undefined;
}

const k8sConfigEnv: K8sConfigEnv = {
    tls: K8S_TLS,
};

interface DbConfigEnv {
    readonly name: string | undefined;
    readonly host: string | undefined;
    readonly user: string | undefined;
    readonly password: string | undefined;
    readonly autoIndex: string | undefined;
    readonly populate: string | undefined;
    readonly populateFiles: string | undefined;
}

const dbConfigEnv: DbConfigEnv = {
    name: DB_NAME,
    host: DB_HOST,
    user: DB_USER,
    password: DB_PASS,
    autoIndex: DB_AUTO_INDEX,
    populate: DB_POPULATE,
    populateFiles: DB_POPULATE_FILES,
};

interface AuthConfigEnv {
    readonly expiresIn: string;
    readonly issuer: string;
    // fuer Testdaten und Tests
    readonly password: string;
}

const authConfigEnv: AuthConfigEnv = {
    // 1d = 1 Tag, 1h = 1 Stunde, 1m = 1 Minute, 1s = 1 Sekunde
    expiresIn: JWT_EXPIRES_IN ?? '1h',
    issuer: JWT_ISSUER ?? 'https://hka.de/JuergenZimmermann',
    password: USER_PASSWORD_ENCODED ?? '! To Be Changed !',
};

interface LogConfigEnv {
    readonly logLevel: pino.Level | undefined;
    readonly logDir: string | undefined;
    readonly pretty: boolean;
    readonly def: boolean;
}

const logConfigEnv: LogConfigEnv = {
    logLevel: LOG_LEVEL as pino.Level | undefined,
    logDir: LOG_DIR === undefined ? LOG_DIR : LOG_DIR.trimEnd(),
    pretty: LOG_PRETTY?.toLowerCase() === 'true',
    def: LOG_DEFAULT?.toLowerCase() === 'true',
};

interface MailConfigEnv {
    readonly host: string | undefined;
    readonly port: string | undefined;
    readonly log: string | undefined;
}

const mailConfigEnv: MailConfigEnv = {
    host: MAIL_HOST,
    port: MAIL_PORT,
    log: MAIL_LOG,
};

interface Env {
    nodeConfigEnv: NodeConfigEnv;
    apolloConfigEnv: ApolloConfigEnv;
    k8sConfigEnv: K8sConfigEnv;
    dbConfigEnv: DbConfigEnv;
    authConfigEnv: AuthConfigEnv;
    logConfigEnv: LogConfigEnv;
    mailConfigEnv: MailConfigEnv;
}

/**
 * Eingelesene Umgebungsvariable
 */
export const env: Env = {
    nodeConfigEnv,
    apolloConfigEnv,
    k8sConfigEnv,
    dbConfigEnv,
    authConfigEnv,
    logConfigEnv,
    mailConfigEnv,
};
