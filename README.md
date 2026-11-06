# Notivibe Parent Website

React + Vite parent portal using the existing Firebase Authentication project and Spring Boot APIs.

## Run

```bash
npm install
npm run dev
```

## Connected dashboard

After the existing pairing status endpoint returns `CONNECTED` with `childUid`, the website opens the four-tab dashboard matching `DashNavHelper`: Home, Alerts, Usage, Lock. Milo is intentionally omitted.

The connected dashboard reads the existing Firestore records:
- `ShareCodes/{childUid}`: `sender_name`, `lastupdated`, `battery_pct`, `location_data`, `apptrackingdata`, `applocks`
- `ChildProfiles/{childUid}`: `gradeLevelLabel`
- `Notifications` where `uid == childUid`; non-premium view filters to `f1Free == true`

Firebase security rules must authorize the signed-in parent to read only the linked child's records. The website does not bypass Firestore rules. Ensure the pairing backend's `childUid` matches the `ShareCodes` document ID. If not, the dashboard intentionally shows a missing-data message rather than fabricated values.

App Lock is currently a read-only view of the existing `applocks` values. Remote writes are not enabled until the existing child-side update authorization path is confirmed.

## Environment

Set `VITE_API_BASE_URL` to the existing Spring Boot API base URL in `.env`.
