# GLITCH 36 ADMIN REFERENCE COMPARISON

| Route / Feature | Reference Behavior | Local Editable Behavior (Before) | Proposed/Executed Repair |
| :--- | :--- | :--- | :--- |
| `ClassroomManager` (`/workspace/classrooms`) | Contains "Auto-Assign PAID Teams" button next to "ADD CLASSROOM". | Missing the "Auto-Assign PAID Teams" button. | Added the button and linked it to a new `autoAssignPaidTeams` frontend wrapper method in `ClassroomService.ts`. |
| `TeamManager` (`/workspace/teams`) | Team deletion successfully calls the backend function. | Team deletion fails with `getFunctions() is not defined` because the wrapper function uses an unimported `getFunctions` instead of the initialized `functions` instance. | Removed `getFunctions()` call in `TeamService.adminDeleteTeam` and used the properly imported `functions` object. |
| Global Favicon | Uses `favicon.jpg` for the browser tab icon. | Uses `favicon.svg` (default Vite icon). | Copied `favicon.jpg` from reference and updated `apps/admin-web/index.html` to reference it. |
