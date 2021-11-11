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

/**
 * Das Modul besteht aus der Klasse {@linkcode AuthService} für die
 * Authentifizierung.
 * @packageDocumentation
 */

import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { User } from './user.service';
import { UserService } from './user.service';
// Alternativen zu bcrypt:
//  scrypt: https://nodejs.org/api/crypto.html#crypto_crypto_scrypt_password_salt_keylen_options_callback
//  Argon2: https://github.com/p-h-c/phc-winner-argon2
//  SHA-Algorithmen und PBKDF2 sind anfaelliger bei Angriffen mittels GPUs
//  http://blog.rangle.io/how-to-store-user-passwords-and-overcome-security-threats-in-2017
//  https://stormpath.com/blog/secure-password-hashing-in-node-with-argon2
import { compareSync } from 'bcrypt';
import { getLogger } from '../../../logger';
import { jwtConfig } from '../../../config';

export interface LoginResult {
    token: string;
    expiresIn: number | string | undefined;
    roles?: readonly string[];
}

/**
 * Die Klasse `AuthService` implementiert die Funktionen für die
 * Authentifizierung wie z.B. Einloggen und Validierung von JSON Web Tokens.
 * Eine Injectable-Klasse ist ein _Singleton_, **kein** Request-Singleton.
 */
@Injectable()
export class AuthService {
    readonly #userService: UserService;

    readonly #jwtService: JwtService;

    readonly #logger = getLogger(AuthService.name);

    constructor(userService: UserService, jwtService: JwtService) {
        this.#userService = userService;
        this.#jwtService = jwtService;
    }

    /**
     * Aufruf durch Passport beim Einloggen, wobei Benutzername und Passwort
     * übergeben werden.
     *
     * @param username Benutzername.
     * @param password Passwort.
     * @return Das User-Objekt ohne Passwort oder undefined.
     */
    async validateUser(username: string | undefined, pass: string | undefined) {
        this.#logger.debug('validateUser: username=%s', username);
        if (username === undefined || pass === undefined) {
            this.#logger.debug('validateUser: username oder password fehlen.');
            return;
        }
        const user = await this.#userService.findOne(username);
        this.#logger.debug('validateUser: user.id=%d', user?.userId);
        if (user === undefined) {
            this.#logger.debug(
                'validateUser: Kein User zu %s gefunden.',
                username,
            );
            return;
        }

        this.#logger.debug('validateUser: password=*****');
        if (!this.#checkPassword(user, pass)) {
            this.#logger.debug('validateUser: Falsches password.');
            return;
        }

        // "rest properties" ab ES 2018
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { password, ...result } = user;
        this.#logger.debug('validateUser: result=%o', result);
        return result;
    }

    /**
     * Das eigentliche Einloggen eines validierten Users, bei dem das Passwort
     * in `AuthService.validateUser` überprüft wurde.
     * @param user Das validierte User-Objekt vom Typ "any", damit es von
     * einem Controller über die Property "user" des Request-Objekts benutzt
     * werden kann.
     * @return Objekt mit einem JWT als künftiger "Access Token", dem
     * Zeitstempel für das Ablaufdatum (`expiresIn`) und den Rollen als Array
     */
    // eslint-disable-next-line @typescript-eslint/require-await
    async login(user: any) {
        const userObj = user as User;

        const payload = {
            username: userObj.username,
            sub: userObj.userId,
        };
        // Der JWT (JSON Web Token) wird von Passport mit dem npm-Package
        // "jsonwebtoken" erstellt https://github.com/auth0/node-jsonwebtoken
        // Mit z.B. https://jwt.io kann ein JWT inspiziert werden
        const { signOptions } = jwtConfig;
        const token = this.#jwtService.sign(payload, signOptions);

        const result: LoginResult = {
            token,
            expiresIn: signOptions.expiresIn,
            roles: userObj.roles,
        };

        this.#logger.debug('login(): result=%o', result);
        return result;
    }

    #checkPassword(user: User | undefined, password: string) {
        if (user === undefined) {
            this.#logger.debug('#checkPassword: Kein User-Objekt');
            return false;
        }

        // Beispiel:
        //  $2a$12$50nIBzoTSmFEDGI8nM2iYOO66WNdLKq6Zzhrswo6p1MBmkER5O/CO
        //  $ als Separator
        //  2a: Version von bcrypt
        //  12: 2**12 Iterationen
        //  die ersten 22 Zeichen kodieren einen 16-Byte Wert fuer den Salt
        //  danach das chiffrierte Passwort
        const result = compareSync(password, user.password);
        this.#logger.debug('#checkPassword: %s', result);
        return result;
    }
}
