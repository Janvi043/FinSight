# FinSight Backend

## Setup
1. Copy `.env.example` to `.env` and fill in PostgreSQL credentials.
2. Create the database in pgAdmin (or run the SQL in [database/schema.sql](database/schema.sql)).
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the API:
   ```bash
   npm run dev
   ```

## API Endpoints
- `GET /health`
- `GET /api/dashboard/:userId`
- `GET /api/profile/:userId`
- `POST /api/profile/:userId`
- `GET /api/transactions/:userId`
- `POST /api/transactions/:userId`
- `PUT /api/transactions/:userId/:transactionId`
- `DELETE /api/transactions/:userId/:transactionId`
