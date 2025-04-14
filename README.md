7.  [ ] Basic Vercel project setup for CI/CD.

**Phase 2: Database Schema & Core Models**

1.  [ ] Design PostgreSQL schema in Supabase:
    - `users` (linked to `auth.users`, stores profile info like `name`, `major`, `profile_picture_url`, `role` ['student', 'ra', 'admin']).
    - `floors` (`id`, `name`, `building_name`).
    - `floor_memberships` (`user_id`, `floor_id`, `join_date`).
    - `chat_messages` (`id`, `floor_id`, `user_id`, `content`, `created_at`).
    - `posts` (`id`, `floor_id`, `user_id`, `title`, `content`, `created_at`, `expires_at`, `is_pinned`).
    - `post_upvotes` (`post_id`, `user_id`).
    - `post_comments` (`id`, `post_id`, `user_id`, `content`, `created_at`).
    - `bulletin_posts` (`id`, `user_id` (creator: RA/Admin), `title`, `content`, `created_at`, `event_date` (optional)).
    - `bulletin_likes` (`bulletin_post_id`, `user_id`).
    - `bulletin_comments` (`id`, `bulletin_post_id`, `user_id`, `content`, `created_at`).
2.  [ ] Implement Row Level Security (RLS) policies in Supabase for data access control (e.g., users can only see messages/posts for their own floor, RAs have broader access within their floor, only RAs/Admins can write to `bulletin_posts`).

**Phase 3: Authentication & User Profiles**

1.  [ ] Build Login/Registration UI components.
2.  [ ] Connect UI to NextAuth.js for sign-in/sign-up flows.
3.  [ ] Implement logic to assign users to a `floor` upon registration or via an RA/Admin interface (this needs careful design - how is floor assigned initially?).
4.  [ ] Create User Profile page (`pages/profile/`) allowing users to view/edit their `name`, `major`, `profile_picture`.
5.  [ ] Ensure user `role` (student, RA, admin) is correctly managed and reflected in the UI and permissions. Store role in the `users` table.

**Phase 4: Floor Chat Implementation**

1.  [ ] Set up Socket.IO server:
    - Install `socket.io` and `socket.io-client`.
    - Option 1: Integrate into Next.js API route (`pages/api/socket.js`) - good for simple cases, might have limitations with scaling/serverless.
    - Option 2: Run a separate Node.js Socket.IO server.
    - Configure Socket.IO server to handle connections, disconnections, message broadcasting, and room logic (each floor = a room).
    - _Alternative consideration:_ Leverage Supabase Realtime subscriptions for chat messages instead of Socket.IO. This simplifies backend infrastructure but might offer less flexibility than a dedicated Socket.IO server. Choose based on complexity needs.
2.  [ ] Create Chat UI component (`features/chat/ChatInterface.js`): Message display area, input field.
3.  [ ] Implement client-side Socket.IO (or Supabase Realtime subscription) logic in the Chat UI to connect, join the correct floor room, send messages, and receive messages.
4.  [ ] Fetch initial chat history via REST API (`pages/api/chat/history.js`) when component mounts.
5.  [ ] Display user name/picture with messages.
6.  [ ] Implement logic to show profile details on click (fetch user data via API).
7.  [ ] Display RA tags based on user role.
8.  [ ] Implement RA Moderation API endpoints (`pages/api/chat/moderation.js`) and UI controls (delete message, remove user - requires updating `floor_memberships` or adding a 'banned' status). Ensure proper authorization checks.

**Phase 5: Floor Posts Implementation**

1.  [ ] Create Post List UI (`features/posts/PostList.js`) and Post Detail/Comment UI.
2.  [ ] Create Post Creation Form/Modal (`features/posts/CreatePostForm.js`).
3.  [ ] Implement REST API Endpoints (`pages/api/posts/`) for:
    - `GET /api/posts?floorId=...` (Fetch posts for a floor, order by upvotes/pinned status, filter expired).
    - `POST /api/posts` (Create new post, set `expires_at`).
    - `DELETE /api/posts/:postId` (Delete post - RA/Admin only).
    - `POST /api/posts/:postId/upvote` (Add/remove user from `post_upvotes`).
    - `GET /api/posts/:postId/comments` (Fetch comments for a post).
    - `POST /api/posts/:postId/comments` (Create a comment).
    - `DELETE /api/comments/:commentId` (Delete comment - RA/Admin or comment author).
    - `PUT /api/posts/:postId/pin` (Pin/unpin post - RA only).
4.  [ ] Implement frontend logic to interact with these APIs using Redux for state management (fetching posts, handling loading/error states, updating UI after actions).
5.  [ ] Implement upvoting UI and logic (update count optimistically/refetch).
6.  [ ] Implement commenting UI and logic.
7.  [ ] Implement RA Pinning UI (display pinned post prominently).
8.  [ ] Implement post expiration (backend query filters, potentially a cleanup job using Supabase Edge Functions if needed).

**Phase 6: Bulletin Board Implementation**

1.  [ ] Create Bulletin Board UI component (`features/bulletin/BulletinBoard.js`).
2.  [ ] Implement REST API Endpoints (`pages/api/bulletin/`) for:
    - `GET /api/bulletin` (Fetch all bulletin posts - accessible to all logged-in users).
    - `POST /api/bulletin` (Create bulletin post - RA/Admin only).
    - `DELETE /api/bulletin/:postId` (Delete bulletin post - RA/Admin only).
    - Implement liking and commenting APIs similar to Floor Posts.
3.  [ ] Implement frontend logic to display posts, handle likes/comments.
4.  [ ] Implement authorization checks on API routes to ensure only RAs/Admins can create/delete bulletin posts.
5.  [ ] Consider how students "suggest additions" - maybe a simple feedback form or contact link for RAs.

**Phase 7: Styling, Refinement & Deployment**

1.  [ ] Apply consistent styling using Tailwind CSS utility classes.
2.  [ ] Ensure responsive design for various screen sizes.
3.  [ ] Refine Redux state management, ensuring efficient data flow and minimal re-renders.
4.  [ ] Add error handling and loading states throughout the application.
5.  [ ] Write tests (Unit, Integration, potentially E2E with tools like Cypress or Playwright).
6.  [ ] Configure Vercel deployment:
    - Set up environment variables in Vercel project settings.
    - Ensure build process runs correctly.
    - Set `NEXTAUTH_URL` to the production URL.
7.  [ ] Optimize database queries and Supabase RLS policies.
8.  [ ] Optimize real-time connection handling.
