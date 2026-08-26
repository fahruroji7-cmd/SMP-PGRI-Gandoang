# Authentication Testing Notes

The current AbsenSPG interface uses a local demo login only. Any non-empty username and password opens the dashboard so the existing UI workflows can be reviewed.

No JWT endpoint, credential store, or external authentication provider is active in this first visual/product pass. When persistence is implemented, add the JWT flow, seeded admin account, cookies, and protected API checks before enabling real accounts.