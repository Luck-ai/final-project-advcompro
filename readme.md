# This repository contains the final project for the Advanced Compro Class.

This project is a web application that allows users to manage stock invemntory. Users can add, update, delete, and view stock items, create purchase orders and recieve email for it.

## Prerequisites

1. Install [Docker](https://www.docker.com/get-started) on your machine.
2. Clone the repository to your local machine.
3. Create a [SendGrid](https://sendgrid.com/) account and obtain an API key for sending emails.
4. Navigate to the backend directory and create an `.env` file based on the `.env.example` file provided.

## Running the Application

To run the application, follow these steps:

- Naviagate to the root directory of the project where the `docker-compose.yml` file is located.
- Run the following command to build and start the application:
```bash
docker compose up --build
```
The frontend will be available at
```
http://localhost:3000
```
and the backend at 
```
http://localhost:8000
```

