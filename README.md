## USER API

POST /user/send-signup-code
Body
{
"email": "string"
}

POST /user/resend-signup-code
Body
{
"email": "string"
}

POST /user/verify-email
Body
{
"email": "string",
"verificationCode": "string"
}

POST /user/register
Form-Data
full_name: string
email: string
gender: male | female | other
dateOfBirth: string
password: string
role: student | faculty | recruiter | pro_partner
profile: file (optional)

GET /user/profile
Headers → Authorization: Bearer <token>

POST /user/reset-password-code
Body
{
"email": "string"
}

POST /user/verify-reset-code
Body
{
"email": "string",
"verificationCode": "string"
}

PATCH /user/reset-password
Body
{
"email": "string",
"password": "string"
}

## AUTH API

POST /auth/login
Body
{
"email": "string",
"password": "string"
}

GET /auth/active-devices
Headers → Authorization: Bearer <token>

POST /auth/remove-all-session
Headers → Authorization: Bearer <token>

POST /auth/remove-session/:id
Headers → Authorization: Bearer <token>

GET /auth/google
(No data)

GET /auth/google/callback
(No data)

## CONVERSATION API

POST /conversaton/create
Headers → Authorization: Bearer <token>
Body
{
"senderId": "string",
"receiverId": "string"
}

GET /conversaton/:id
Headers → Authorization: Bearer <token>
(No body)

POST /conversaton/create-group
Headers → Authorization: Bearer <token>
Body
{
"name": "string",
"groupMenmbers": ["string", "string"]
}

## MESSAGE API

POST /message/create
Headers → Authorization: Bearer <token>
Body
{
"conversationId": "string",
"senderId": "string",
"message": "string"
}

GET /message/get-messages
Headers → Authorization: Bearer <token>:
Body
{
"conversationId": "string"
}

GET /message/get-conversation-participants?conversationId=ID
Headers → Authorization: Bearer <token>
Query:
conversationId=string

Here is the pure WebSocket API documentation for your ChatGateway — only events + required payloads, clean and ready to share.

## 🔌 WebSocket API (Socket.io)
Connection
To connect, the client must send JWT token in one of these:
Option 1 → Header
authorization: Bearer <token>

Option 2 → Auth
auth: { token: "<token>" }

Option 3 → Query
ws://localhost:3000?token=<token>

If token is invalid → connection refused.

## 📌 EVENTS

1. join-conversation
   Join a direct conversation room.
   Client → Server
   Event: join-conversation
   Payload:
   {
   "conversationId": "string"
   }

2. send-message
   Send a message to a direct conversation.
   Client → Server
   Event: send-message
   Payload:
   {
   "conversationId": "string",
   "message": "string"
   }

Server → Client (Room)
Event: receive-message
Payload:
Message object returned from backend
{
"id": "string",
"message": "string",
"senderId": "string",
"conversationId": "string",
"createdAt": "date"
}

## GROUP CHAT EVENTS

3. join-group
   Join a group conversation room.
   Client → Server
   Event: join-group
   Payload:
   {
   "conversation": "string"
   }

4. send-group-message
   Send message to a group conversation.
   Client → Server
   Event: send-group-message
   Payload:
   {
   "conversationId": "string",
   "message": "string"
   }

Server → Client (Room)
Event: receive-group-message
Payload:
{
"id": "string",
"message": "string",
"senderId": "string",
"conversationId": "string",
"createdAt": "date"
}
# authentication-system-nest
