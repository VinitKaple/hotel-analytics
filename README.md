# Hotel Booking & Occupancy Analytics System

A localhost MERN application that feels like a real hotel operations platform: bookings, room management, guest management, check-in / check-out, occupancy analytics, reports and a built-in AI-style hotel assistant.

## Features
- **Dashboard** – live stats (total / available / occupied rooms, occupancy rate, today's check-ins and check-outs), 7-day trend, floor-wise availability, arrivals and departures, recent bookings, loading skeletons.
- **Rooms** – 70 seeded rooms across 5 floors (AC, Non-AC, Dormitory). Floor cards (click to filter), filters by floor / type / AC-Non-AC / status / capacity, grid and table views, add / edit / delete rooms, mark cleaned or send to maintenance.
- **Bookings** – validated booking form with live availability check, optional room picking or auto-assignment, multi-room bookings, booking confirmation modal, search, cancel, payment status change (with confirmation popups).
- **Guests** – 790 guest records (38 staying, 5 reserved, the rest history) with search, filters, sorting, pagination, details modal and check-out action.
- **Check-in / Check-out** – today's check-ins, currently staying, today's check-outs and checked-out tabs. Check-out asks for confirmation and lets you mark the room Available or Cleaning.
- **Occupancy Analytics** – gauge, AC / Non-AC / Dormitory distribution, floor-wise occupancy, occupancy trend, room-type donut, check-in vs check-out chart, guest movement tables; filters by date range, floor, category and room type.
- **AI Assistant** – chat interface that works with **no external API key**. It reads the same live room and guest data as the rest of the app, so answers change after bookings and check-outs. Understands variations such as "show empty rooms" or "who will checkout today?".
- **Reports** – daily / weekly / monthly occupancy, room utilisation, check-in and check-out statistics, room-type performance, CSV export and print.
- **Settings** – hotel info, booking times, room pricing and capacity per type, notification toggles.
- **Notification centre**, toast messages, confirmation dialogs, collapsible sidebar and admin menu.
- **Email notification** – every successful booking sends a short thank-you email (no guest name) through Nodemailer.

## Folder structure
```
project-root/
├── client/                 React (Vite) frontend
│   └── src/
│       ├── components/     Layout, UI primitives, FloorCard
│       ├── context/        HotelContext (shared rooms / guests / bookings state)
│       ├── pages/          Dashboard, Bookings, BookingForm, Rooms, Guests, ...
│       ├── assistantEngine.js   rule-based assistant logic
│       └── styles.css
├── server/                 Express + MongoDB backend
│   ├── models/             Room, Guest, Booking, Settings
│   ├── controllers/        business logic
│   ├── routes/             REST endpoints
│   ├── middleware/         async handler, error handler
│   ├── services/           availability, mailer, stats
│   ├── seed/               sample data (auto-loads on first start)
│   ├── server.js
│   └── .env
└── README.md
```

## Environment variables (`server/.env`)
| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string (required) |
| `PORT` | API port, default `5000` |
| `CLIENT_ORIGIN` | Allowed frontend origin, default `http://localhost:5173` |
| `SMTP_HOST`, `SMTP_PORT` | Mail server (Gmail: `smtp.gmail.com`, `465`) |
| `SMTP_USER`, `SMTP_PASS` | Mail account and password / app password |
| `MAIL_FROM` | Optional "from" address (defaults to `SMTP_USER`) |

## MongoDB setup
Use either:
- **Local MongoDB**: install MongoDB Community, start it, then set `MONGODB_URI=mongodb://127.0.0.1:27017/hotel_analytics`
- **MongoDB Atlas**: create a free cluster, add your IP to Network Access, create a database user and paste the connection string, e.g. `mongodb+srv://USER:PASS@cluster.mongodb.net/hotel_analytics`

On the first start with an empty database the server automatically loads the sample hotel data. To reset it at any time run `npm run seed` inside `server/`.

## Email configuration
Booking emails always go to the fixed notification address defined in `server/services/mailer.js`; it is not shown in the UI.
For Gmail: enable 2-Step Verification, create an **App Password**, then set `SMTP_USER` to your Gmail address and `SMTP_PASS` to the app password. If SMTP is not configured the booking still succeeds and the server logs that the email was skipped. Email can be turned off in Settings → Notification settings.

## Installation
```bash
cd server && npm install
cd ../client && npm install
```
(or from the root: `npm run install:all`)

## Run
Open two terminals.
```bash
# Terminal 1 – API on http://localhost:5000
cd server
npm run dev        # or: npm start

# Terminal 2 – app on http://localhost:5173
cd client
npm run dev
```
Open http://localhost:5173.

## API overview
`GET/POST /api/rooms`, `GET /api/rooms/available`, `GET/PUT/PATCH/DELETE /api/rooms/:id` ·
`GET/POST /api/bookings`, `GET/PATCH /api/bookings/:id`, `PATCH /api/bookings/:id/cancel` ·
`GET /api/guests`, `GET/PATCH /api/guests/:id` · `POST /api/checkin` · `POST /api/checkout` ·
`GET /api/analytics`, `GET /api/analytics/reports` · `GET/PUT /api/settings`, `PUT /api/settings/room-types`

## Demo workflow
1. **Dashboard** – note the numbers (e.g. Available, Occupied, Check-ins today).
2. **Rooms** – click a floor card to see which rooms are free on that floor.
3. **Guests** – browse the in-house guests; search, sort and paginate.
4. **Bookings → New booking** – fill the form, pick dates and a room type; the available rooms appear. Confirm and see the confirmation modal (an email is sent in the background).
5. Check **Rooms**, **Guests** and **Dashboard** – the room is now Reserved, the guest appears, and the stats changed.
6. **Check-In / Check-Out** – check the new guest in, then check out a guest from "Today's check-outs" and choose *Available*.
7. **Occupancy Analytics** – charts reflect the latest data; try the filters.
8. **AI Assistant** – ask "Which room is empty?" – the answer excludes the room you just booked and includes the one you just released.

## Notes
- Dates are stored as `YYYY-MM-DD` strings; sample data is generated relative to today's date.
- A booking for today marks the room *Reserved* until the guest is checked in (then *Occupied*). Future bookings keep the room bookable on other dates.
- Never commit `server/.env` with real credentials.
