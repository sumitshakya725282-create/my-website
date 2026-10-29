# Fixify

Fixify is a bilingual Hindi/English Expo mobile demo for booking household services.

## Run locally

Install Node.js 20.19.4 or newer, open a terminal in this folder, then run:

```sh
npm install
npm run web
```

This opens the app in a browser. To run it on a phone instead, use `npm start`
and scan the terminal's QR code with Expo Go, or run `npm run android` /
`npm run ios` with the corresponding development environment installed.

## Demo scope

The app demonstrates login/sign-up, customer profile, electrician/plumber/AC
repair/cleaning service discovery, booking, address entry, simulated payment,
booking status updates, reviews, notifications, customer support, and admin and
service-partner dashboards.

Sign-up creates a customer account in the app's local SQLite database. Passwords
are stored as salted PBKDF2 hashes. Accounts and profile changes stay on the
device (or browser) where they were created; they are not shared across devices
and this is not a substitute for a production authentication backend. The
database created by the app is separate from `database/fixify.db`.

Location lookup, payment, partner assignment, notifications, bookings, and
reviews are still local simulations. No real payment is processed. A backend
and provider credentials are required before using this for real customers.
