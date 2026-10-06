# ADR-0017: Profile photos cropped on the client and stored in PostgreSQL

**Status:** Accepted

## Context

Learners could only set an avatar by pasting an https URL. They need to pick a photo from their device (or take one
on mobile), adjust it inside a circle and save it. The project had no file storage: no blob service, no upload volume.

## Options considered

1. **PostgreSQL** (chosen): one `learning.user_avatars` row per user with the image bytes.
2. **A disk volume on the VPS** served by the API or Apache: needs its own volume and backup and does not work with
   more than one API instance.
3. **S3 / Azure Blob**: the most scalable, but brings new credentials, cost and a local emulator.

## Decision

- **The client does the image work.** Web/desktop crop with a canvas and mobile with `expo-image-manipulator`, using
  the same geometry from `@techrat/validation` (`checkAvatarFile`, `clampCrop`, `zoomCrop`, `cropRect`). They export
  a 512×512 square (WEBP, or JPEG where WEBP encoding is unavailable and always on mobile). So the server needs no
  image library.
- **The API checks and stores it.** `PUT /api/v1/users/me/avatar` (multipart `file`) accepts JPEG, PNG or WEBP
  detected from the file signature (the declared type is ignored) up to 1 MB, with a 2 MB request cap and a
  per-user rate limit (`RateLimiting:UploadsPerMinute`). The row is replaced on every upload, so the previous photo
  is gone. `DELETE` removes it and goes back to the initials.
- **A versioned public URL.** `users.avatar_url` becomes `/api/v1/users/{id}/avatar?v={upload time}`. The image is
  served anonymously (avatars appear on leaderboards) with `Cache-Control: public, max-age=31536000, immutable`: a new
  photo always has a new URL. Clients resolve API-relative media URLs with `resolveMediaUrl` (same origin on the web,
  the API host on desktop and mobile).
- Setting an external avatar URL through `PATCH /users/me` deletes the stored photo.

## Consequences

- No new infrastructure; photos are included in database backups. A photo costs ~20–80 KB per user.
- Moving to object storage later only changes `AvatarService` and the URL; clients already treat the URL as opaque.
- Mobile gained two Expo SDK packages (`expo-image-picker`, `expo-image-manipulator`) and the photo/camera permission
  texts in `app.json`. The crop uses React Native's `PanResponder`, so no gesture-handler root is needed.
