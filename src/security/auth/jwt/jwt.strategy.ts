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
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { getLogger } from '../../../logger';
import { jwtConfig } from '../../../config';

const { algorithm, publicKey } = jwtConfig;

export interface UserPayload {
    userId: number;
    username: string;
}

/**
 * Mit `JwtStrategy` wird im Konstruktor verifziert, wie ein JWT verifiziert
 * wird, z.B. mit _RS256_ (Public/Private Key) oder _HS256_ (Passwort, default).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    readonly #logger = getLogger(JwtStrategy.name);

    constructor() {
        // https://stackoverflow.com/questions/55091698/nestjs-passport-jwtstrategy-never-being-called-with-rs256-tokens
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: publicKey,
            algorithms: [algorithm],
            ignoreExpiration: false,
        });
    }

    // eslint-disable-next-line @typescript-eslint/require-await
    async validate(payload: any) {
        this.#logger.debug('validate: payload=%o', payload);
        /* eslint-disable @typescript-eslint/no-unsafe-assignment */
        const userPayload: UserPayload = {
            userId: payload.sub,
            username: payload.username,
        };
        /* eslint-enable @typescript-eslint/no-unsafe-assignment */
        this.#logger.debug('validate: userPayload=%o', userPayload);
        return userPayload;
    }
}
