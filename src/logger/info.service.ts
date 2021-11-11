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
 * Das Modul enthält die Funktion, um die Test-DB neu zu laden.
 * @packageDocumentation
 */

import { k8sConfig, nodeConfig, paths } from '../config';
import { release, userInfo } from 'os';
import { Injectable } from '@nestjs/common';
import type { OnApplicationBootstrap } from '@nestjs/common';
import { getLogger } from './logger';
import ip from 'ip';
import osName from 'os-name';
import stripIndent from 'strip-indent';

/**
 * Die Test-DB wird im Development-Modus neu geladen, nachdem die Module
 * initialisiert sind, was duch `OnApplicationBootstrap` realisiert wird.
 */
@Injectable()
export class InfoService implements OnApplicationBootstrap {
    readonly #logger = getLogger(InfoService.name);

    /**
     * Die Test-DB wird im Development-Modus neu geladen.
     */
    onApplicationBootstrap() {
        const banner = `
            .         _                _           
            .        /  \\     _   _  | |_    ___  
            .       / _  \\   | | | | | __|  / _ \\ 
            .      / ___  \\  | |_| | | |_  | (_) |
            .     /_/   \\_\\  \\__,_| \\__| \\___/                 
        `;
        const { host, httpsOptions, nodeEnv, port, serviceHost, servicePort } =
            nodeConfig;
        const isK8s = k8sConfig.detected;
        const kubernetesStr = isK8s
            ? `Kubernetes: BUCH_SERVICE_HOST=${serviceHost}, BUCH_SERVICE_PORT=${servicePort}`
            : 'N/A';

        this.#logger.info(stripIndent(banner));
        // https://nodejs.org/api/process.html
        // "Template String" ab ES 2015
        this.#logger.info('Node: %s', process.version);
        this.#logger.info('NODE_ENV: %s', nodeEnv);
        this.#logger.info(kubernetesStr);

        const desPods = isK8s ? ' des Pods' : '';
        this.#logger.info('Rechnername%s: %s', desPods, host);
        this.#logger.info('IP-Adresse%s: %s', desPods, ip.address());
        this.#logger.info('Port%s: %s', desPods, port);
        this.#logger.info(
            '%s',
            httpsOptions === undefined ? 'HTTP (ohne TLS)' : 'HTTPS',
        );
        this.#logger.info('Betriebssystem: %s (%s)', osName(), release());
        this.#logger.info('Username: %s', userInfo().username);
        this.#logger.info('OpenAPI: /%s', paths.swagger);
    }
}
