# FitMind AI deployment

The backend uses MongoDB and manual QR payment review. Configure these environment values in the backend deployment:

- `MONGO_URI`
- `JWT_SECRET`
- `CORS_ORIGINS` and `FRONTEND_URL`
- `PAYMENT_HANDLE`
- `PAYMENT_QR_IMAGE_URL` (for example `/payment-qr.png`)
- `PREMIUM_PRICE_INR` and `PREMIUM_PERIOD_DAYS`
- AI provider values as needed

Set `isAdmin: true` on the first administrator account in MongoDB. Admins use `/admin` to review payment requests, approve or reject them, inspect analytics, and grant or revoke premium access.

Payment screenshots are written to `backend/uploads`. For a multi-instance or ephemeral deployment, replace local storage with object storage before production use. The hourly job expires premium subscriptions whose `currentPeriodEnd` has passed.
