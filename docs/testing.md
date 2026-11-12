# Testing

Automated tests cover pure validation and similarity logic. Run `npm test`.

| ID | Description | Expected result | Status |
|---|---|---|---|
| T-01 | Valid staff login payload | Zod accepts email/password | PASS |
| T-02 | Invalid login payload | Validation rejects malformed input | PASS |
| T-03 | Age 150 case payload | Database-facing schema rejects age | PASS |
| T-04 | Empty similarity query | Search schema rejects request | PASS |
| T-05 | Identical embedding vectors | Cosine score is 1.0 | PASS |
| T-06 | Cough + fever semantic query | Respiratory case ranks first in demo mode | PASS |
| T-07 | Gender filter | Every returned result matches filter | PASS |
| T-08 | Session token signed by the app | Token verifies and returns the same user | PASS |
| T-09 | Tampered or garbage session token | Verification rejects it, user is sent to `/login` | PASS |

Manual smoke checks for the viva: sign in as Admin and Staff, open dashboard, filter case library, open a case, create a case, run similarity search, inspect history, and verify the Admin panel is denied to Staff.
