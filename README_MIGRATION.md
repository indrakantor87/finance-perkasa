
# MySQL Migration Guide

This branch (`migration/mysql-switch`) is pre-configured for MySQL migration.

## Steps to Migrate

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Configure Environment**
    - Copy `.env.example` to `.env`.
    - Update `DATABASE_URL` with your local MySQL credentials.
    ```env
    DATABASE_URL="mysql://root:your_password@localhost:3306/finance_perkasa"
    ```

3.  **Setup Database Schema**
    Run the migration to create tables in MySQL:
    ```bash
    npx prisma migrate dev --name init_mysql
    ```

4.  **Restore Data**
    Import the existing data from `database_dump.json` into MySQL:
    ```bash
    node scripts/restore-database.js
    ```

5.  **Start Application**
    ```bash
    npm run dev
    ```

## Notes
- Ensure your MySQL server is running.
- The `restore-database.js` script handles data type conversion (ISO strings to Date objects) automatically.
