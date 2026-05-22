# ONEE IT Consumables Manager — Phase U3 test flow

This document describes a manual end-to-end check after Phase U3 (notifications and polish).

## Preconditions

- Backend running (`php artisan serve` or equivalent) with migrations applied, including `notifications`.
- Frontend running and pointed at the API base URLs configured in the project.
- At least one admin account and one agent (user) account with stock available on a few consumables.

## Flow

1. **User logs in** at the agent login URL. The catalogue (or home after login) loads without errors.
2. **User opens the catalogue** and confirms articles and stock badges display.
3. **User creates a request** from “Nouvelle demande”, adds in-stock lines only (Ajouter disabled at stock 0), submits, and sees a success confirmation with a ticket reference.
4. **Admin logs in**. The sidebar “Demandes” item shows a badge matching the number of submitted (`soumis`) tickets (polls on navigation; count comes from `meta.pending_count` on the tickets API).
5. **Admin dashboard** shows the “Demandes en attente” card with the same pending count; clicking it opens `/admin/tickets?status=soumis`. The activity card lists the five most recent tickets with links filtered by reference search.
6. **Admin approves** the ticket from the tickets list. Stock decreases, a discharge is created, and the user receives an in-app notification (type `ticket_validé`).
7. **Admin rejects** (optional second ticket) to verify `ticket_refusé` and message with reason.
8. **User refreshes** (or waits up to 60 seconds). The bell shows an unread badge; opening the dropdown lists the latest notifications with unread styling.
9. **User marks one notification read** by clicking it; unread count decreases. **“Marquer tout comme lu”** clears remaining unread for ticket notifications.
10. **Ticket notification click** navigates to “Mes demandes” with the relevant ticket expanded; status shows validated (or refused) as expected.
11. **User downloads the discharge** from the validated row using “Télécharger”; a PDF named with the discharge reference is saved.
12. **Insufficient stock approve** (optional): create a ticket requesting more than available; admin approve shows an error listing failed items by name with available vs requested quantities.

## Validation checklist (quick)

- [ ] `notifications` table exists and rows appear on approve/reject.
- [ ] `GET /api/v1/user/notifications` paginates and includes `meta.unread_count`.
- [ ] `GET /api/v1/user/notifications/unread-count` returns `{ "unread_count": N }`.
- [ ] Bell polls unread count every 60 seconds.
- [ ] `PATCH` read and read-all only affect the authenticated user’s rows.
- [ ] Admin `GET /api/v1/tickets` exposes `meta.pending_count` (and legacy `pending_count`).
- [ ] Empty and loading states remain acceptable on user tickets, admin tickets, and notification dropdown.

## Regression

- Admin stock, discharges, CSV export, and user catalogue still behave as before Phase U3.
