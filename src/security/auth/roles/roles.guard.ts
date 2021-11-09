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
import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator';
import { Reflector } from '@nestjs/core';
import type { RequestWithUser } from '../jwt/jwt-auth.guard';
import type { Role } from '../service';
import { UserService } from '../service';
import { getLogger } from '../../../logger';

/**
 * Guard für RBAC (= role-based access control), so dass der Decorater `@Role()`
 * verwendet werden kann.
 */
@Injectable()
export class RolesGuard implements CanActivate {
    readonly #reflector: Reflector;

    readonly #userService: UserService;

    readonly #logger = getLogger(RolesGuard.name);

    constructor(reflector: Reflector, userService: UserService) {
        this.#reflector = reflector;
        this.#userService = userService;
    }

    /**
     * Die Rollen im Argument des Decorators `@Role()` ermitteln.
     * @param context Der Ausführungskontext zur Ermittlung der Metadaten bzw.
     * des Decorators.
     * @return true, falls die Rollen beim Controller oder bei der dekorierten
     * Funktion durch den JWT gegeben sind.
     */
    async canActivate(context: ExecutionContext) {
        // https://docs.nestjs.com/fundamentals/execution-context#reflection-and-metadata
        const requiredRoles: Role[] | undefined =
            this.#reflector.getAllAndOverride(ROLES_KEY, [
                context.getHandler(),
                context.getClass(),
            ]);
        this.#logger.debug('canActivate: requiredRoles=%o', requiredRoles);

        if (requiredRoles === undefined || requiredRoles.length === 0) {
            return true;
        }

        const request: RequestWithUser = context.switchToHttp().getRequest();
        const userPayload = request.user;
        this.#logger.debug('canActivate: userPayload=%o', userPayload);
        if (userPayload === undefined) {
            return false;
        }
        const { userId } = userPayload;
        const user = await this.#userService.findById(userId);
        this.#logger.debug('canActivate: user=%o', user);
        if (user === undefined) {
            return false;
        }
        return requiredRoles.some((role) => user.roles.includes(role));
    }
}
