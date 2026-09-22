# GLITCH 36 ADMIN REPAIR LOG

## Repairs Executed (Safe Frontend Modifications)

1. **File:** `packages/shared/src/services/TeamService.ts`
   - **Change:** Modified `adminDeleteTeam(teamId: string)`.
   - **Reason:** The function contained a `getFunctions()` call that threw an undefined error because `getFunctions` was not imported. It now correctly uses the exported `functions` instance from the `../lib/firebase` module. This restores the Team Deletion logic to match the live reference behavior.

2. **File:** `packages/shared/src/services/ClassroomService.ts`
   - **Change:** Added `autoAssignPaidTeams()` method.
   - **Reason:** Provides the frontend wrapper logic to call the `autoAssignPaidTeams` Firebase httpsCallable endpoint, restoring the missing feature from the live site.

3. **File:** `apps/admin-web/src/pages/dashboards/admin/ClassroomManager.tsx`
   - **Change:** Added `Auto-Assign PAID Teams` Button and `handleAutoAssign` execution handler.
   - **Reason:** Restored the missing UI control discovered via the live admin reference screenshots. It integrates directly with the new `ClassroomService.autoAssignPaidTeams()` method.

4. **File:** `apps/admin-web/index.html` & `apps/admin-web/public/favicon.jpg`
   - **Change:** Copied `favicon.jpg` from the minified build to the public directory, and updated the `<link rel="icon">` in `index.html`.
   - **Reason:** Synchronized the app's branding identity with the live website.
