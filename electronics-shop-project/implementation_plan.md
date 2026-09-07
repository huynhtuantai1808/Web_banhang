# Implementation Plan: Live Chat & Contact Info

## Goal Description
- **Contact Info / Floating Action Button**: Replace the single Chatbot button with a Floating Action Button (FAB) that expands to show Zalo, Facebook Messenger, and a "Live Chat" option.
- **Store Addresses**: Update the footer to display a structured list of store addresses instead of a generic text.
- **Live Chat Feature**: Implement a real-time chat system allowing customers to talk with staff. Staff can claim incoming chat sessions and communicate in real-time.

## User Review Required
> [!IMPORTANT]
> **Live Chat Authentication**: Should guest users (unauthenticated) be allowed to start a live chat, or must they log in first? Currently, I plan to allow guest users to chat by generating a random guest ID stored in their browser `localStorage`, but requiring login is more secure and easier to track.
> **Store Addresses**: I will hardcode a few store branches in the frontend configuration (`frontend/lib/branding.ts`) for now. Do you want this to be editable in the Admin Settings panel in the future?
> **Zalo/Messenger Links**: I will use the existing `zaloLink` and `facebookLink` from the configuration.

## Open Questions
- Do you have specific store addresses you want me to list in the footer right now, or should I use dummy data (e.g. "Showroom Hà Nội", "Showroom TP.HCM")?
- For the Live Chat, do you want to keep the automated "Chatbot" as one of the options, or completely replace it with "Live Chat with Staff"? (My current plan replaces it with Live Chat).

## Proposed Changes

### Database Models & Backend (FastAPI)
- **`backend/app/models/chat.py`**: Create `ChatRoom` (customer/guest ID, employee_id, status) and `ChatMessage` (room_id, sender_type, text).
- **`backend/app/db/base.py`**: Import the new chat models for Alembic.
- **`backend/app/api/websockets/chat.py`**: Create WebSocket endpoints for real-time bi-directional messaging between clients (customers) and staff.
- **`backend/app/api/v1/endpoints/admin_chat.py`**: REST endpoints for staff to list active chat rooms, claim a room, and fetch chat history.
- **`backend/app/api/v1/endpoints/chat.py`**: REST endpoints for customers to create/resume a chat room.

### Frontend - Customer Side
- **`frontend/components/ChatWidget.tsx`**: Redesign into a multi-action floating button (FAB). When clicked, it reveals Zalo, Messenger, and Live Chat buttons.
- **Live Chat UI**: Build a real-time chat window inside `ChatWidget.tsx` using `WebSocket` to connect to the backend. Handle guest IDs via `localStorage`.
- **`frontend/components/SiteFooter.tsx`**: Update the "Địa chỉ" section to render a list of branches defined in `frontend/lib/branding.ts`.
- **`frontend/lib/branding.ts`**: Add a `branches` array.

### Frontend - Admin Side
- **`frontend/app/admin/(protected)/chat/page.tsx`**: New admin page for staff. Split view: Left pane shows incoming/waiting chats and active chats. Right pane shows the chat interface for the selected room.
- **`frontend/components/admin/AdminSidebar.tsx`**: Add a navigation link to the new Live Chat management page.

## Verification Plan
### Automated Tests
- I will run standard TypeScript checks and verify no build errors.
### Manual Verification
- I will open the customer frontend, click the Live Chat button, and send a message.
- I will open the admin panel, navigate to the Chat page, claim the incoming chat, and reply.
- I will verify that both sides receive the messages in real-time.
- I will verify the Zalo and Messenger buttons correctly redirect to the provided links.
- I will verify the footer correctly lists the store addresses.
