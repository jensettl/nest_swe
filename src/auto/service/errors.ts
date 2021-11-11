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
 * Das Modul besteht aus den Klassen für die Fehlerbehandlung bei der Verwaltung
 * von Büchern, z.B. beim DB-Zugriff.
 * @packageDocumentation
 */

/* eslint-disable max-classes-per-file */

/**
 * Allgemeine Basisklasse für Fehler bei {@linkcode AutoReadService} und
 * {@linkcode AutoWriteService}
 */
export class AutoServiceError {}

/**
 * Klasse für fehlerhafte Autodaten. Die Meldungstexte sind in der Property
 * `msg` gekapselt.
 */
export class AutoInvalid extends AutoServiceError {
    // Parameter Properties
    constructor(readonly messages: string[]) {
        super();
    }
}

/**
 * Klasse für einen bereits existierenden Modell.
 */
export class ModellExists extends AutoServiceError {
    constructor(
        readonly modell: string | null | undefined,
        readonly id?: string,
    ) {
        super();
    }
}

/**
 * Klasse für eine bereits existierende MODELLNR-Nummer.
 */
export class ModellNrExists extends AutoServiceError {
    constructor(
        readonly modellnr: string | null | undefined,
        readonly id?: string,
    ) {
        super();
    }
}

/**
 * Union-Type für Fehler beim Neuanlegen eines Autoes.
 */
export type CreateError = AutoInvalid | ModellExists | ModellNrExists;

/**
 * Klasse für eine ungültige Versionsnummer beim Ändern.
 */
export class VersionInvalid extends AutoServiceError {
    constructor(readonly version: string | undefined) {
        super();
    }
}

/**
 * Klasse für eine veraltete Versionsnummer beim Ändern.
 */
export class VersionOutdated extends AutoServiceError {
    constructor(readonly id: string, readonly version: number) {
        super();
    }
}

/**
 * Klasse für ein nicht-vorhandenes Auto beim Ändern.
 */
export class AutoNotExists extends AutoServiceError {
    constructor(readonly id: string | undefined) {
        super();
    }
}

/**
 * Union-Type für Fehler beim Ändern eines Autoes.
 */
export type UpdateError =
    | AutoInvalid
    | AutoNotExists
    | ModellExists
    | VersionInvalid
    | VersionOutdated;

/**
 * Allgemeine Basisklasse für {@linkcode AutoFileService}
 */
export class AutoFileServiceError {}

/**
 * Klasse für eine nicht-vorhandenes Binärdatei.
 */
export class FileNotFound extends AutoFileServiceError {
    constructor(readonly filename: string) {
        super();
    }
}

/**
 * Klasse, falls es mehrere Binärdateien zu einem Auto gibt.
 */
export class MultipleFiles extends AutoFileServiceError {
    constructor(readonly filename: string) {
        super();
    }
}

/**
 * Klasse, falls der ContentType nicht korrekt ist.
 */
export class InvalidContentType extends AutoFileServiceError {
    // eslint-disable-next-line @typescript-eslint/no-useless-constructor
    constructor() {
        super();
    }
}

/**
 * Union-Type für Fehler beim Lesen eines Autoes.
 */
export type DownloadError =
    | AutoNotExists
    | FileNotFound
    | InvalidContentType
    | MultipleFiles;

/* eslint-enable max-classes-per-file */
