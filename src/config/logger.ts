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

import type { PrettyOptions } from 'pino-pretty';
import { env } from './env';
import pino from 'pino';
import { resolve } from 'path';

/**
 * Das Modul enthält die Konfiguration für den Logger mit _Winston_ sowie
 * die Request-Protokollierung mit _Morgan_.
 * @packageDocumentation
 */

const logDirDefault = 'log';
const logFileNameDefault = 'server.log';
const logFileDefault = resolve(logDirDefault, logFileNameDefault);

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

const { logDir, pretty, def } = logConfigEnv;
const logFile =
    logDir === undefined ? logFileDefault : resolve(logDir, logFileNameDefault);
console.log(
    `loggerConfig: logLevel=${logLevel}, logFile=${logFile}, pretty=${pretty}, def=${def}`, // eslint-disable-line security-node/detect-crlf
);

const fileOptions = {
    level: logLevel,
    target: 'pino/file',
    options: { destination: logFile },
};
const prettyOptions: PrettyOptions = {
    translateTime: 'SYS:standard',
    singleLine: true,
    colorize: true,
    ignore: 'pid,hostname',
};
const prettyTransportOptions = {
    level: logLevel,
    target: 'pino-pretty',
    options: prettyOptions,
};

const options: pino.TransportMultiOptions | pino.TransportSingleOptions = pretty
    ? {
          targets: [fileOptions, prettyTransportOptions],
      }
    : {
          targets: [fileOptions],
      };
const transports = pino.transport(options); // eslint-disable-line @typescript-eslint/no-unsafe-assignment

// https://github.com/pinojs/pino/issues/1160#issuecomment-944081187
export const parentLogger = def
    ? pino(pino.destination(logFileDefault))
    : pino({ level: logLevel }, transports); // eslint-disable-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument
