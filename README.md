# notes-api

REST API for a note-taking app with user and admin roles. NestJS, MongoDB (Mongoose), JWT, bcrypt.

Frontend: [notes-web](https://github.com/imransid/notes-web) (separate repo).

## Setup

Requires Node 22 and MongoDB 5.0+ (the `$lookup` with both `localField` and `pipeline` needs 5.0).

```bash
cp .env.example .env        # then edit MONGODB_URI and JWT_SECRET
npm install
npm run seed                # admin + 5 demo users with notes and posts
npm run start:dev
```

Swagger UI: `http://localhost:3000/docs`. Use the Authorize button with the `accessToken` from `/auth/login`.

The hosted API runs on Render's free tier. It sleeps when idle, so the first request can take up to a minute.

## Environment

| Variable | Example | Purpose |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/notes` | Connection string, including the database name |
| `JWT_SECRET` | long random string | Signs access tokens |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `CORS_ORIGIN` | `http://localhost:5173` | Allowed frontend origin(s), comma-separated |
| `PORT` | `3000` | HTTP port |
| `ADMIN_EMAIL` | `admin@notes.dev` | Seed only |
| `ADMIN_PASSWORD` | `Admin123!` | Seed only |

## Demo accounts

| Role | Email | Password |
|---|---|---|
| admin | `admin@notes.dev` | `Admin123!` |
| user | `alice@example.com` (also bob, carol, dave, erin) | `Password123` |

`npm run seed` exits without changes if the admin already exists. It never deletes data.

## Endpoints

Every route requires a Bearer token except register and login. Admin routes return 403 for normal users.

| Method | Path | Access | Notes |
|---|---|---|---|
| POST | `/auth/register` | public | Always creates role `user`. Returns `{ accessToken, user }` |
| POST | `/auth/login` | public | Returns `{ accessToken, user }` |
| GET | `/users/me` | user | Current profile |
| GET | `/users` | admin | Paginated |
| POST | `/users` | admin | Can set role |
| GET | `/users/by-interest` | admin | Interest groups, paginated |
| GET | `/users/:id` | admin | |
| GET | `/users/:id/posts` | user | That user's posts, paginated |
| PATCH | `/users/:id` | admin | Re-hashes the password if sent |
| DELETE | `/users/:id` | admin | Not yourself. Also deletes their notes and posts |
| POST | `/notes` | user | |
| GET | `/notes` | user | My notes, paginated |
| GET | `/notes/all` | admin | Everyone's notes with owner name and email, paginated |
| GET | `/notes/:id` | user | Own note; admins can read any |
| PATCH | `/notes/:id` | user | Own note only |
| DELETE | `/notes/:id` | user | Own note only |
| POST | `/posts` | user | Author is the current user |

Lists take `?page=1&limit=10` (limit max 50) and return `{ data, page, limit, hasNext }`. The API fetches `limit + 1` documents to compute `hasNext`, so there is no count query.

Errors: invalid ObjectId 400, not found or not yours 404, duplicate email 409.

## Indexes

All are declared with `schema.index()` in the schema files.

| Collection | Index | Query it serves | Why |
|---|---|---|---|
| users | `{ email: 1 }` unique | Login `findOne({ email })` | Point lookup. Uniqueness is enforced by the index (duplicate key 11000 is mapped to 409), so there is no racy pre-check. |
| users | `{ interests: 1 }` | First `$match` of the group-by-interest pipeline | Multikey, so it skips users without interests. `$unwind` and `$group` cannot use an index. |
| notes | `{ owner: 1, _id: -1 }` | `find({ owner }).sort({ _id: -1 })` (my notes), `deleteMany({ owner })` | Equality, then sort, so results come back in order without an in-memory sort. |
| posts | `{ author: 1, _id: -1 }` | `$lookup` on `author` plus its `$sort: { _id: -1 }`, `deleteMany({ author })` | The `$lookup` runs this query once per user, so it needs an index on `foreignField`. |

Everything else uses the built-in `_id` index: get by id, `/users/me`, the admin lists (`find().sort({ _id: -1 })`), the ownership check `{ _id, owner }`, and `populate`. Sorting by `_id` instead of `createdAt` gives newest-first order and stable pages with no extra index, because ObjectIds are unique and roughly increase with creation time. No index on `createdAt`, `role` or `title`.

`explain('executionStats')` was run on every read path: no `COLLSCAN`, and no in-memory `SORT` on find-based lists.

## Aggregations

Group users by interest, in one `userModel.aggregate()` call:

```
$match { interests: { $type: 'string' } }      users with at least one interest (multikey index)
$unwind '$interests'                           one doc per user per interest
$group { _id: interest, count, users[] }       users: { _id, name, email }
$sort { count: -1, _id: 1 } -> $skip -> $limit (limit + 1)
```

A user's posts, in one `userModel.aggregate()` call:

```
$match { _id }                                 _id index
$project { name: 1 }
$lookup { from: 'posts', localField: '_id', foreignField: 'author',
          pipeline: [$sort { _id: -1 }, $skip, $limit (limit + 1)] }   uses { author: 1, _id: -1 }
```

Returns `{ user, data, page, limit, hasNext }`, or 404 if the user does not exist.

## Known trade-offs

- Stateless JWT: a role change or deletion takes effect only when the old token expires (`JWT_EXPIRES_IN`). Revocation would need a denylist or short tokens plus refresh tokens.
- Skip-based pagination: deep pages scan and discard `skip` keys, and concurrent inserts can shift items between pages. A cursor on `_id` (`_id < lastSeen`) would fix both.
- `$push` in the interest groups is unbounded. A very popular interest could approach the 16 MB document limit. A real system would cap it (`$slice` / `$topN`) or page users per interest.
- Deleting a user and their notes and posts are separate writes, not a transaction.
- Mongoose `autoIndex` builds the indexes on startup. In production you would build them in a migration instead.
