# Vortx TG-Host

Modern Telegram-based file hosting platform powered by Cloudflare Pages, Cloudflare KV and Telegram Bot API.

## Features

- Secure Login & Signup System
- Password Protected Admin Dashboard
- User Authentication & Sessions
- Cloudflare KV Database
- Telegram File Storage
- Image / Video / Audio / ZIP Upload Support
- Public File Sharing
- Modern Dark UI
- Drag & Drop Uploads

---

## Tech Stack

- HTML
- CSS
- JavaScript
- Cloudflare Pages
- Cloudflare KV
- Telegram

---

## Deployment

### 1. Clone Repository

```bash
git clone https://github.com/your-username/vortx.git
```

### 2. Install Wrangler

```bash
npm install -g wrangler
```

### 3. Create KV Namespace

```bash
wrangler kv:namespace create "KV"
wrangler kv:namespace create "KV" --preview
```

---

## Environment Variables

Create a `.dev.vars` file locally:

```env
TG_BOT_TOKEN=your_bot_token
TG_CHAT_ID=your_chat_id
ADMIN_PASSWORD=your_admin_password
```

---

## Admin Dashboard

Admin panel is protected using:

```env
ADMIN_PASSWORD
```

Admin route example:

```txt
/admin
```

Without the correct admin password, the admin dashboard cannot be accessed.

---

## User Authentication

Users can:

- Create their own account
- Set their own password
- Login securely
- Access personal dashboard
- Upload and manage files

User sessions are stored securely using Cloudflare KV.

---

## Deploy To Cloudflare Pages

Connect GitHub repository with Cloudflare Pages and deploy.

Then add these environment variables inside Cloudflare Pages dashboard:

```env
TG_BOT_TOKEN
TG_CHAT_ID
ADMIN_PASSWORD
```

## Storage System

| Service | Usage |
|---|---|
| Cloudflare KV | Users & Sessions |
| Telegram | File Storage |
| Cloudflare Pages | Hosting |

---
## Author

Developed by Vortx
