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

/**
 * Das Modul besteht aus der Controller-Klasse für Lesen an der REST-Schnittstelle.
 * @packageDocumentation
 */

import { Cloud, cloud, nodeConfig } from '../../config';
import RE2 from 're2';
import type { Request } from 'express';

const ID_SUFFIX_PATTERN = new RE2('/[\\dA-Fa-f]{24}$');
const port = cloud === undefined ? `:${nodeConfig.port}` : '';

export const getBaseUri = (req: Request) => {
    const { protocol, hostname, url } = req;
    let basePath = url.includes('?') ? url.slice(0, url.lastIndexOf('?')) : url;
    if (ID_SUFFIX_PATTERN.test(basePath)) {
        basePath = basePath.slice(0, basePath.lastIndexOf('/'));
    }
    const schema = cloud === Cloud.HEROKU ? 'https' : protocol;
    return `${schema}://${hostname}${port}${basePath}`;
};
