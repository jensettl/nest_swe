# Zusammenfassung

<!--
  Copyright (C) 2020 - present Juergen Zimmermann, Hochschule Karlsruhe

  This program is free software: you can redistribute it and/or modify
  it under the terms of the GNU General Public License as published by
  the Free Software Foundation, either version 3 of the License, or
  (at your option) any later version.

  This program is distributed in the hope that it will be useful,
  but WITHOUT ANY WARRANTY; without even the implied warranty of
  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
  GNU General Public License for more details.

  You should have received a copy of the GNU General Public License
  along with this program.  If not, see <http://www.gnu.org/licenses/>.
-->

[Juergen Zimmermann](mailto:Juergen.Zimmermann@HS-Karlsruhe.de)

GPL v3

## Entwicklungsumgebung

- Konfig-Dateien, Verzeichnisse
- package.json einschl. dependencies, devDependencies und scripts
- node_modules
- ESLint mit .eslintrc.yml
- Prettier mit .prettierrc.yml
- Git
- VS Code
- ES2015+, TypeScript einschl. @types mit .d.ts sowie tsconfig.json
- ts-node
- RESTclient
- (Build)pack(s) und Kustomize
- AsciiDoctor mit PlantUML
- reveal.js
- Heroku mit Procfile einschl. Atlas sowie VS Code mit `<F1>`
- Jenkins
- SonarQube

## Nest

- REST (Express) und GraphQL (Apollo Server)
- Controller-, Resolver- und Service-Klassen
- Decorators für Klassen und Methoden
- Dependency Injection
- Request/Response mit Header/Body, Statuscodes, ETag und HATEOAS
- GraphQL-Schema mit Types, Query und Mutation
- Validierung mit JSON-Schema durch Ajv
- Mongoose mit Active Record einschl. Model und Schema
- .env, config/, reguläre Ausdrücke mit /.../ und new RE2(...)
- index.ts als barrel
- Error
- Login mit POST und application/x-www-form-urlencoded
- JWT mit RS256
- Users als Array
- RESTclient für REST und GraphQL
- Tests mit Jest, Chai und Axios zzgl. Coverage durch Istanbul
- (Sandbox)

## Features von JavaScript und TypeScript

| Feature                                       | ECMAScript |
| --------------------------------------------- | ---------- |
| import, export, Modul                         | 2015       |
| import type                                   | TS         |
| Deklaration durch name: Typ                   | TS         |
| const und let (statt var)                     | 2015       |
| Type Inference                                | TS         |
| === und !==                                   | 1          |
| Destructuring für JSON-Objekte und -Arrays    | 2015       |
| Shorthand Properties                          | 2015       |
| Rest (und Spread) Properties für JSON-Objekte | 2018       |
| (Rest und Spread Properties für JSON-Arrays)  | 2015       |
| Optional Chaining ?.                          | 2020       |
| Nullish Coalescing ??                         | 2020       |
| Template Strings                              | 2015       |
| Trailing Comma                                | 2017       |
| Arrow Function                                | 2015       |
| Klasse                                        | 2015       |
| # (private), protected, readonly              | TS         |
| for await                                     | 2018       |
| Promise                                       | 2015       |
| async und await                               | 2017       |
| (Top-Level await)                             | 2020       |
| IIFE                                          | 1          |
