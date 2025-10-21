<a href="https://withconvexity.com">
    <img width="200" src="./chats_logo.svg?width=64" alt="CHATS Logo" />
</a>


# AIDCHAIN Solution

CHATS(Convexity Humanitarian Aid Transfer Solution), enables the transparent transfer of cash and voucher assistance to the beneficiaries while leveraging the blockchain technology for livelihood programs and logistics management for aid distribution.
##  Technology Stack
    -NodeJS (preferably ^14.10)
    -PostgresSQL Database
    -Redis
    -RabbitMq
    -Linux (Deb Distribution)
##  Installation
    -Install NodeJS
    -Install PostgresSQL
    -Install Redis Server
    -Install RabbitMQ Server
    -Fork The Code
    -Change into forked directory
    -run `npm i` to install dependencies
    -run `npm i g sequelize-cli` to install sequelize-cli dependencies to install it globally
    -run `cp .env.example .env` This copies the example ENV in the directory to a new .env file.
    -run `sequelize-cli db:create` to create a new db on the postgres database, (it is assumed that you have    set the db credentials in the .env file)
    -run `sequelize-cli db:migrate` to create all necessary tables in the database
    -This is an optional step run `sequelize-cli db:seed:all` to populate the table with data

    -run `npm start` (This starts the app in production mode)
    -run `npm run dev` (This starts the app in development mode with nodemon)
    -run `npm run start:consumer` (This starts the app queue consumer in production mode)
    -run `npm run start:consumer:dev` (This start the app queue consumer in development mode)

##  Run With Docker Compose
    -Install Docker
    -Install Docker Compose
    -run `docker volume create postgres` (This creates docker volume for PostgresSQL Database)
    -run `docker-compose up --build` to build and start all services


## Contribution Guide
**Create a New Branch:**
Create a new branch on your local machine.

**Make Changes:**
Implement your desired changes or additions to the codebase.
Ensure that your code follows the project's coding conventions and style guidelines.

**Test Your Changes:**
Before submitting your contribution, make sure to test your changes thoroughly.

**Commit and Push:**
Commit your changes with clear and descriptive commit messages.
Push your commits to the branch you created on your forked repository.

**Create a Merge Request (MR):**
Go to the original repository and locate the "Merge Requests" section.
Click on "New merge request" to create a new merge request from your branch to the original repository's main branch.
Provide a descriptive title and detailed description of your changes in the merge request.

## License
Copyright (C) 2023  Convexity CVA Inc.

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
