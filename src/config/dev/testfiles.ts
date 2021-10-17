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
import { k8sConfig } from '../kubernetes';
import { resolve } from 'path';

const srcDir = k8sConfig.detected ? resolve('dist', 'src') : resolve('src');
// relativ zum Verzeichnis, in dem "npm run start:dev" aufgerufen wird
const filesDir = resolve(srcDir, 'config', 'dev');

export const testfiles = [
    {
        filenameBinary: resolve(filesDir, 'image.png'),
        contentType: 'image/png',
        filename: '000000000000000000000001',
    },
    {
        filenameBinary: resolve(filesDir, 'image.jpg'),
        contentType: 'image/jpg',
        filename: '000000000000000000000002',
    },
];
