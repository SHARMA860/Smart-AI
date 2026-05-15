# Smart AI Security Specification

## 1. Data Invariants
- A Chat cannot exist without a valid User ID.
- A Message must belong to a Chat.
- Users can only read/write their own data.
- System-only collections like `otps` must be protected.

## 2. The "Dirty Dozen" Payloads (Denial Tests)
1. **Identity Spoofing**: Attempt to create a Chat for another user's ID.
2. **Path Poisoning**: Create a Chat with a 2KB junk string as chatId.
3. **Ghost Fields**: Add an `isAdmin: true` field to a user profile.
4. **Relationship Bypass**: Create a Message for a Chat that doesn't exist.
5. **PII Leak**: Attempt to list all User documents as an unauthenticated user.
6. **Immutable Violation**: Change the `createdAt` timestamp on an existing Message.
7. **Action Gap**: Update a chat title and its `userId` simultaneously.
8. **Resource Exhaustion**: Send a 1MB string as a message content.
9. **Role Escalation**: Change message role from `user` to `assistant` on an existing message.
10. **Orphaned Writes**: Create a Message without a valid `chatId`.
11. **Spoofed Verification**: Update a user profile with `email_verified: true` without server verification.
12. **Recursive Cost**: Large batch write to non-existent subcollections.

## 3. Test Runner (Mock Tests)
- `PERMISSION_DENIED` expected for all above cases.
