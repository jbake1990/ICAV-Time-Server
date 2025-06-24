# ICAV Time Tracker Database

This folder contains the schema and setup for the ICAV Time Tracker database, designed for easy deployment in the cloud or locally.

## Database: PostgreSQL
- **Version:** 16 (can be changed in `docker-compose.yml`)
- **Default user:** icav
- **Default password:** icavpassword
- **Default database:** icavtimetracker

## Running Locally (Recommended: Docker)

1. **Start the database:**
   ```bash
   docker-compose up -d
   ```
   This will launch a PostgreSQL server on port 5432.

2. **Apply the schema:**
   ```bash
   docker exec -i <container_id_or_name> psql -U icav -d icavtimetracker < schema.sql
   ```
   Or use a GUI tool (like TablePlus, DBeaver, or pgAdmin) to connect and run `schema.sql`.

3. **Stop the database:**
   ```bash
   docker-compose down
   ```

## Cloud Deployment
- The schema in `schema.sql` is compatible with all major cloud PostgreSQL providers (AWS RDS, Azure, GCP, etc.).
- Change credentials and connection details as needed for your environment.
- Use the same schema to initialize your cloud database.

## Moving Between Cloud and Local
- Use `pg_dump` and `pg_restore` to migrate data between environments.
- Keep `schema.sql` under version control for easy updates.

## Tables
- `users`: Stores technician login and display info
- `time_entries`: Stores all clock-in/out and lunch timestamps

## Security
- Change the default password before deploying to production.
- Use SSL connections in production/cloud environments.

---

For any questions, contact your database administrator or developer. 