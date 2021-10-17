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

import type { LoggerOptions } from 'pino';
import type { PrettyOptions } from 'pino-pretty';
import { env } from './env';
import pino from 'pino';
import { resolve } from 'path';

/**
 * Das Modul enthält die Konfiguration für den Logger mit _Winston_ sowie
 * die Request-Protokollierung mit _Morgan_.
 * @packageDocumentation
 */

const { logConfigEnv, nodeConfigEnv } = env;

// https://getpino.io
// Log-Levels: fatal, error, warn, info, debug, trace
// Alternativen: Winston, log4js, Bunyan

const { nodeEnv } = nodeConfigEnv;
const production = nodeEnv === 'production' || nodeEnv === 'PRODUCTION';
let { logLevel } = logConfigEnv;
if (logLevel === undefined) {
    logLevel = production ? 'info' : 'debug';
}

const { logDir } = logConfigEnv;
// stderr = 2
const destination = logDir === undefined ? 1 : resolve(logDir, 'server.log');

const prettyOptions: PrettyOptions = {
    translateTime: 'SYS:standard',
    singleLine: true,
    colorize: true,
    ignore: 'pid,hostname',
};

const options: LoggerOptions = {
    level: logLevel,
    prettyPrint: prettyOptions,
};

export const parentLogger = pino(options, pino.destination(destination));
