# Auth email templates

Supabase Auth sends the portal invite and password emails, not the app. These
templates replace its plain defaults with FXMed-branded ones. Each one changes
its wording for patients, ambassadors and team members, based on the
`account_type` the invite routes store on the user.

| File | Supabase template | Suggested subject |
| --- | --- | --- |
| `invite.html` | Invite user | Your FXMed account is ready |
| `recovery.html` | Reset password | Set your FXMed password |

## Install

1. Supabase dashboard → **Authentication → Emails → Templates**.
2. Open **Invite user**, set the subject, and paste all of `invite.html` into the message body. Save.
3. Do the same for **Reset password** with `recovery.html`.

Patients who already had an FXMed login receive the reset email rather than
the invite, so both templates matter.

## Allowed redirect URLs

Under **Authentication → URL Configuration → Redirect URLs**, add:

- `https://www.fxmed.ng/patient-portal/setup`
- `https://www.fxmed.ng/ambassador-portal/setup`
- `http://localhost:3000/**` for local testing

If a setup page is missing from this list, Supabase sends people to the site
URL (the homepage) instead. The homepage forwards them to the right setup page
as a fallback (`components/AuthLinkRedirect.tsx`), but the list should still be
correct.

## Sending service

With no custom SMTP configured, Supabase sends from its own shared mail
service. That service is meant for testing: it has a very low hourly limit
and a generic sender address, and it is more likely to land in spam. For
production, set up a custom SMTP provider (for example Resend, Postmark or
Amazon SES) under **Authentication → Emails → SMTP Settings**, sending from
an `fxmed.ng` address such as `care@fxmed.ng`, and add the provider's SPF and
DKIM records to the domain's DNS.
