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

import { Role } from '../../security/auth/service/role';
import type { User } from '../../security/auth/service/user.service';
import { env } from '../env';

// ein verschluesseltes Passwort fuer Testzwecke mittels hashSync und
// genSaltSync aus bcrypt ausgeben:
//  const hash = hashSync('mypassword', genSaltSync());
//  this.#logger.warn('Verschluesseltes Password: %s', hash);

const { password } = env.authConfigEnv;

/**
 * Ein JSON-Array der Benutzerdaten mit den vorhandenen Rollen.
 * Nicht Set, weil es dafür keine Suchfunktion gibt.
 */
export const users: User[] = [
    {
        userId: 1,
        username: 'admin',
        password,
        email: 'admin@acme.com',
        roles: [Role.ADMIN, Role.MITARBEITER],
    },
    {
        userId: 2,
        username: 'adriana.alpha',
        password,
        email: 'adriana.alpha@acme.com',
        roles: [Role.ADMIN, Role.MITARBEITER],
    },
    {
        userId: 3,
        username: 'alfred.alpha',
        password,
        email: 'alfred.alpha@acme.com',
        roles: [Role.MITARBEITER],
    },
    {
        userId: 4,
        username: 'antonia.alpha',
        password,
        email: 'antonia.alpha@acme.com',
        roles: [Role.MITARBEITER],
    },
    {
        userId: 5,
        username: 'dirk.delta',
        password,
        email: 'dirk.delta@acme.com',
        roles: [Role.KUNDE],
    },
    {
        userId: 6,
        username: 'emilia.epsilon',
        password,
        email: 'emilia.epsilon@acme.com',
        roles: [Role.KUNDE],
    },
];
