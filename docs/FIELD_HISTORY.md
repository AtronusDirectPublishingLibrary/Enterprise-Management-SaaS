# Field-level change history

The audit log records what happened and who did it. The `field_change` table
records which fields changed, their old and new values, and the request that
caused the change. Both are needed for a defensible reconstruction of a record.

## Data model

`field_change` stores:

- `entity_type` and `entity_id` — the affected record.
- `field` — the changed field name.
- `old_value` and `new_value` — text representations; dates are ISO strings and
  objects are JSON.
- `changed_by_id` and `changed_by_name`.
- `request_id` — correlates the change with the response header and server log.
- `changed_at`.

Rows are written only for values that actually differ. An update that changes
nothing creates no history row.

## Reading history

```http
GET /api/audit/history/LEAVE_REQUEST/<id>
Authorization: session cookie or bearer token
```

The endpoint is restricted to administrators and executives and returns up to
500 rows in chronological order, oldest first.

## Adoption pattern

Call `recordFieldChanges` with the same Prisma transaction as the update:

```ts
await prisma.$transaction(async (tx) => {
  const before = await tx.leaveRequest.findUniqueOrThrow({ where: { id } });
  const after = await tx.leaveRequest.update({ where: { id }, data });
  await recordFieldChanges(tx, {
    entityType: "LEAVE_REQUEST",
    entityId: id,
    before,
    after,
    fields: ["status", "rejectionReason", "approvedById"],
    user: { id: req.user?.sub, username: req.user?.username },
    requestId: res.locals.requestId,
  });
});
```

The transaction boundary is deliberate: a failed update cannot leave a history
row claiming a change that never committed.

## Currently covered

- Leave request approval/rejection: status, rejection reason and approver.
- Payroll salary approval/rejection: approval status, approver, approval time
  and note.

## Recommended next coverage

Apply the same helper to staff profile edits, payroll register adjustments,
QMS document status changes, project budget changes and plan approvals. Prefer
one history row per changed field over a single opaque JSON diff; it keeps the
auditor's queries simple and lets the database index the entity and timestamp.
