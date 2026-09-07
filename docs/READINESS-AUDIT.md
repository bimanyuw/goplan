# GoPlan: implementation and release audit

Reviewed 7 September 2026. Scope: free Indonesian student competition project. This is an implementation review, not a legal opinion or a WCAG certification.

| Request | Implementation / finding |
| --- | --- |
| 1. Contrast, Gojek palette | Asphalt green #00AA13 for decorative accents; darker #007A16 with white for text buttons; dark body/muted text and visible focus. Automated axe checks target WCAG 2.2 AA. |
| 2. Image alt text | No informative raster images in active UI. Decorative icons use aria-hidden and visible labels; original SVG favicon is browser chrome. |
| 3. Refund | /refund states the service is free, does not collect money, and deleting a record is not a bank refund. |
| 4. Privacy | /privacy describes actual fields, consent, providers, cross-border hosting, deletion, export, and operational gaps. |
| 5. Accessibility | Indonesian language, headings, landmarks, skip link, native forms/dialogs, focus restoration, errors/status, and reduced motion. |
| 6. Fake reviews | None found in the original site; no testimonials, ratings, or user-count claims introduced. |
| 7. Terms | /terms explains user obligations, free service, limitations, termination, and preservation of statutory rights. |
| 8. Embeds | No iframe/social/map/media embeds. frame-src none; frame-ancestors none. |
| 9. Image copyright | No stock/photo assets. Lucide license notice retained; original CSS and favicon. No Gojek logo or claim of endorsement. |
| 10. Cookies policy | /cookies documents Supabase session storage and temporary PKCE verifier in localStorage. |
| 11. Tracking | No analytics SDK or tracking pixel. Necessary Supabase requests and hosting/security logs are disclosed. Deployment-level integrations still require inspection after deployment. |
| 12. Form consent | Separate unchecked terms/privacy checkboxes and age 18+ confirmation; server-side signup trigger validates consent metadata and records time/version. |
| 13. Local laws | Preliminary Indonesia review below; operator/PSE assessment and provider arrangements remain operational work. |
| 14. Button labels | Explicit Indonesian labels for creating, saving, editing, deleting, exporting, signing in/out and retrying. Icon-only actions avoided. |
| 15. Cookie consent | No optional trackers loaded; no fictitious accept-all banner. Any future optional tracking must be gated before loading and support withdrawal. |
| 16. Business details | User confirmed competition-only/free/Indonesia and declined business details. Pages state this honestly. No invented company, address, email, or affiliation; real operator/contact can be supplied using server environment variables. |
| 17. Minimization | Email/password only for identity; no name, student ID, DOB, bank credentials, phone, GPS, or uploads required. Goal name optional. Free text cautions against sensitive identifiers. |
| 18. Keyboard forms | Native controls, visible focus, paste/password-manager support, dialog containment, Escape and focus return. |
| 19. Unsupported claims | Active app removes AI/ML scores, guaranteed savings, seeded balances and protected-funds promises. Forecast is explicitly a simple calculation. |
| 20. Real student app | Empty accounts, current Jakarta dates, user budgets, income/expense/transfer CRUD, monthly filters, durable storage, export and account deletion. Email delivery setup remains required for public signups. |
| 21. Supabase | New hosted project qkpfxpzezwgdvaoyjyep in Singapore; migration applied; RLS and RPC validation; confirmation enabled and 12-character passwords. No changes to other projects. |

## Indonesia: preliminary regulatory review

- [UU 27/2022, Pelindungan Data Pribadi](https://peraturan.go.id/id/uu-no-27-tahun-2022): relevant to identity and personal financial records. The implementation supports explicit consent, recorded policy version, access/export/correction/deletion, and avoids unnecessary fields. Hosting in Singapore requires the operator to assess cross-border processing, provider agreements and protection arrangements. A competition context is not treated as a blanket exemption.
- [PP 71/2019, Penyelenggaraan Sistem dan Transaksi Elektronik](https://www.peraturan.go.id/id/pp-no-71-tahun-2019) and [Permenkominfo 5/2020](https://jdih.komdigi.go.id/index.php/produk_hukum/view/id/759/t/peraturan%2Bmenteri%2Bkomunikasi%2Bdan%2Binformatika%2Bnomor%2B5%2Btahun%2B2020): an operator needs to assess applicable PSE registration and electronic-system obligations before public operation, including subsequent amendments. No registration or compliance status is claimed here.
- [UU 8/1999, Perlindungan Konsumen](https://www.peraturan.go.id/id/uu-no-8-tahun-1999): terms/refund text avoids false prices, unsupported promises, or a blanket waiver of statutory rights. GoPlan does not process payments.

These sources identify the relevant legal framework. Classification, applicable registration obligations, incident procedures, provider retention, and any necessary guardian-consent workflow are not resolved by adding policy pages. Version one restricts registration to self-declared adults aged 18+ instead of collecting children's financial data without a guardian workflow.

## Sources for implementation

- [Gojek Asphalt colors](https://asphalt.gojek.io/pages/foundations_colors.html).
- [WCAG 2.2](https://www.w3.org/TR/WCAG22/) and [contrast minimum](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html).
- [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [password auth](https://supabase.com/docs/guides/auth/passwords), [SMTP limitations and setup](https://supabase.com/docs/guides/auth/auth-smtp).

## Remaining operational work

1. Configure a verified SMTP sender for confirmations and recovery to ordinary student email addresses; test real delivery with an address controlled by the operator. Built-in Supabase email is limited to project team addresses.
2. Supply real operator/privacy contact before public use; competition-only labeling does not fulfill every operator disclosure obligation.
3. Confirm log/backup retention and provider arrangements; document a response procedure for privacy requests and incidents.
4. Assess PSE obligations for the actual operating model with qualified Indonesian advice where needed.
5. Deploy to Vercel, set environment values and exact Supabase production callback URLs, then recheck actual network traffic, cookies, and platform integrations.
6. Test representative screen readers and devices manually; automated checks alone cannot certify accessibility.

## Verification boundaries

PGlite tests execute the actual migration with simulated Supabase auth roles. Hosted tests use real Supabase Auth and PostgreSQL, create disposable example.invalid users, and clean up only those users. They do not send real email or prove SMTP delivery. Historical demo components/tests are retained but not served by the production entry point.
