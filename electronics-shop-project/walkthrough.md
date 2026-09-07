# Walkthrough: Live Chat & Contact Info

## Changes Made
- **Store Addresses**: Added a dummy list of store branches to `BRANDING.contact.branches` and rendered them in `SiteFooter.tsx`.
- **Floating Action Button**: Transformed the old Chatbot button into an expandable FAB with 3 options:
  - Zalo
  - Messenger
  - Chatbot (for guests) / Chatbot + Live Chat (for logged-in users)
- **Live Chat (Backend)**: Added `ChatRoom` and `ChatMessage` models, along with WebSocket endpoints in FastAPI to support real-time messaging between customers and staff.
- **Admin Chat Interface**: Built a new admin panel (`/admin/chat`) allowing staff to see incoming chat requests, claim them, and reply in real-time.

## Validations
- Frontend builds cleanly and layout renders beautifully.
- The new database schema script was attached to `database/schema.sql` to initialize the models.
- Note: You may need to run the `database/schema.sql` in your PostgreSQL instance to activate the chat tables.

> [!TIP]
> **Next Steps**
> - Update the `branches` in `frontend/lib/branding.ts` with your actual store locations.
> - Run the added SQL commands in `database/schema.sql` against your database if you haven't already.
