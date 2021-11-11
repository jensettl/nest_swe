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
export { JwtAuthGuard, JwtAuthGraphQlGuard, JwtStrategy } from './jwt';
export type { RequestWithUser } from './jwt';
export { LocalAuthGuard, LocalStrategy } from './local';
export { ROLES_KEY, Roles, RolesGuard, RolesGraphQlGuard } from './roles';
export {
    AuthService,
    NoTokenError,
    Role,
    UserInvalidError,
    UserService,
} from './service';
export type { LoginResult, User } from './service';
