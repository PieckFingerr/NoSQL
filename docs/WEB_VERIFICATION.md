# Web application verification

Branch: `web`. Local frontend and backend only. No deployment configuration.

## Automated commands

From `backend`:

```powershell
npm run check
npm test
npm run test:integration
npm audit --omit=dev
```

`npm test` uses Node's built-in test runner. Offline tests exercise validation,
business services, a limited in-memory database adapter, real Express HTTP routes,
JWT/bcrypt, seed relationships, Extended JSON, import/export, backup/restore,
HTML asset references and frontend fetch helpers. They do not prove MongoDB's
server validator, unique index, aggregation, or transaction behavior.

`npm run test:integration` exercises the full real API on Atlas, including all
eight basic and ten advanced report routes, BSON validators/indexes, duplicate
room/month rejection, users, CRUD, contract occupancy, billing snapshots,
partial/full payments, dashboard revenue, import/export, backup/restore and
maintenance preservation. It uses a new random `QuanLyPhongTro_Web_*_Test`
database unless TEST_MONGODB_DB_NAME is provided. An explicitly supplied name
must match `QuanLyPhongTro_*_Test` and the database must be empty.

Tests remove only their isolated database documents and their own backup files.
They never call dropDatabase. A test connection needs permission to create the
dedicated test database and indexes. Do not point tests at a shared member-test
database. Existing database member tests are preserved; some expect database
triggers that MongoDB validators do not provide, so use the API integration suite
to verify application business rules.

## Current results

- Offline tests: 23 passing, 0 failed.
- JavaScript syntax: 66 files checked, 0 failures, including original database scripts.
- Production dependency audit: zero vulnerabilities at verification time.
- Live Atlas integration: blocked. The local .env contains a placeholder Atlas
  hostname and placeholder JWT secret. Initial DNS attempts returned ENOTFOUND /
  ETIMEOUT. Startup now rejects the placeholder with an actionable message.
- Real browser interaction and live Atlas end-to-end workflow: pending local
  configuration and manual demo. Static frontend and fetch-helper tests pass.

## Rubric implementation and verification checklist

Checked means implemented and covered by offline tests or source review. Pending
live checks are intentionally separate; implementation is not a live-test claim.

- [x] Seven existing collections and BSON validators reused; explicit setup command.
- [x] Sufficient relational sample data; all requested statuses and methods.
- [x] Eight basic query endpoints and visible report controls.
- [x] Ten aggregation report endpoints and dashboard statistics.
- [x] JSON import/export with collection whitelist and validation.
- [x] Seven-collection backup and ADMIN-only confirmed safety-backup restore.
- [x] MongoDB Compass/mongosh demonstration instructions.
- [x] Official MongoDB Atlas driver connection via local .env, no frontend secrets.
- [x] Frontend fetch helper, forms, filters, details, alerts, logout and downloads.
- [x] JWT/bcrypt user management and ADMIN authorization.
- [x] Room, tenant, service CRUD and safe historical deletion checks.
- [x] Contract occupancy, monthly readings, invoice snapshots, partial/full payments.
- [x] Offline workflow and HTTP tests.
- [ ] Live database connection succeeds: supply a real Atlas URI and network access.
- [ ] Live basic/advanced queries and statistics return validated MongoDB results.
- [ ] Live import, export, backup and transactional restore pass integration tests.
- [ ] Browser-to-Atlas full demonstration passes using Live Server.

## Manual presentation checklist

1. Create an administrator, log in, add a manager, edit/deactivate the manager.
2. Rooms/Tenants/Services: create, list/filter, edit, safely delete a temporary row.
3. Create a new AVAILABLE room and tenant, create ACTIVE contract; show OCCUPIED.
4. Try a duplicate ACTIVE contract; expect 409 and an unchanged database.
5. Add current-month utility reading: electricity 100→160, water 20→28.
6. Generate invoice: 2,500,000 rent + 210,000 electricity + 120,000 water +
   100,000 Internet + 30,000 Garbage = 2,960,000 VND with sample service prices.
7. Change Electricity price after billing; show the old invoice still uses 3,500.
8. Record 1,000,000 SUCCESS payment; show PARTIAL and balance 1,960,000.
9. Try overpayment; expect 409. Record remaining 1,960,000; show PAID.
10. Show successful revenue increase in Dashboard for the payment month/year.
11. Run Reports, then equivalent Compass queries; choose October 2026 for seed data.
12. Export rooms; import a valid new room JSON; demonstrate invalid import feedback.
13. Create/download a backup. On a disposable demo database, add a temporary room,
    restore the backup with RESTORE, and show the room removed and safety backup listed.
14. Extend/terminate a contract; verify room availability and maintenance preservation.
15. Show safe deletion conflicts for leased rooms, contracted tenants, billed readings,
    used services and invoices with any payment history.
