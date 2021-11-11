/*
 * Copyright (C) 2019 - present Juergen Zimmermann, Hochschule Karlsruhe
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
 * Das Modul besteht aus den Klassen {@linkcode AutoReadService},
 * {@linkcode AutoReadService} und {@linkcode AutoFileService}, um Bücher und
 * ihre zugehörige Binärdateien in MongoDB abzuspeichern, auszulesen, zu ändern
 * und zu löschen einschließlich der Klassen für die Fehlerbehandlung.
 * @packageDocumentation
 */

export { AutoFileService } from './auto-file.service';
export { AutoValidationService } from './auto-validation.service';
export { AutoReadService } from './auto-read.service';
export { AutoWriteService } from './auto-write.service';
export {
    AutoFileServiceError,
    AutoInvalid,
    AutoNotExists,
    AutoServiceError,
    FileNotFound,
    InvalidContentType,
    ModellNrExists,
    MultipleFiles,
    ModellExists,
    VersionInvalid,
    VersionOutdated,
} from './errors';
export type { CreateError, DownloadError, UpdateError } from './errors';
export { MAX_RATING, jsonSchema } from './jsonSchema';
