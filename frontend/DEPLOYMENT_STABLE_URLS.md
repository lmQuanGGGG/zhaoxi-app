# Stable Vercel production URLs

Keep the existing Vercel projects connected to the same GitHub repository and root directories:

- Customer: `apps/customer`
- Partner: `apps/partner`
- Admin: `apps/admin`

Every push to the production branch updates the existing production domains automatically. Do not create a new Vercel project for each sprint. Preview deployment URLs may change, but the production domain assigned to each existing project remains stable.

Recommended workflow:

1. Copy the integrated sprint into the existing local repository.
2. Keep the existing `.git` directory and Vercel project settings.
3. Commit and push to `main`.
4. Wait until each existing Vercel project shows `Ready`.
5. Continue using the same production URLs and QR codes.
