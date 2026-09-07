# Live Chat & Contact Info Implementation Tasks

- [ ] **Task 1: Store Addresses (Frontend)**
  - [ ] Add dummy addresses to `BRANDING` in `frontend/lib/branding.ts`
  - [ ] Update `frontend/components/SiteFooter.tsx` to render these addresses

- [ ] **Task 2: Database Models & Backend (FastAPI)**
  - [ ] Create `backend/app/models/chat.py` with `ChatRoom` and `ChatMessage`
  - [ ] Add them to `backend/app/db/base.py` for Alembic/metadata
  - [ ] Create `backend/app/api/websockets.py` (or similar) for handling WS connections
  - [ ] Create REST endpoints in `backend/app/api/v1/endpoints/chat.py` for customers to init/resume chat
  - [ ] Create REST endpoints in `backend/app/api/v1/endpoints/admin_chat.py` for staff to list/claim chats
  - [ ] Register new routers in `backend/app/api/v1/router.py` (or `main.py` for WS)

- [ ] **Task 3: ChatWidget (Frontend - Customer)**
  - [ ] Refactor `ChatWidget.tsx` to a Floating Action Button with 3 sub-buttons (Zalo, Messenger, Chat)
  - [ ] Implement conditional logic: Guests see Bot Chat, Logged-in users see Live Chat (or both)
  - [ ] Build the WebSocket client logic in the Live Chat UI

- [ ] **Task 4: Admin Chat UI (Frontend - Admin)**
  - [ ] Create `frontend/app/admin/(protected)/chat/page.tsx`
  - [ ] Build a split view: list of active/waiting chats on the left, chat window on the right
  - [ ] Integrate WebSocket client logic for Admin
  - [ ] Add "Chat Support" link to `AdminSidebar.tsx`

- [ ] **Task 5: Verification**
  - [ ] Verify frontend build and layout
  - [ ] Verify DB migration (create tables)
  - [ ] Test chat functionality (customer -> staff)
