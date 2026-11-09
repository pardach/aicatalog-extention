# Pardach Direct Uploader — Illustrator CEP panel (MVP)

A **separate, minimal panel** beside the existing Vector Catalog extension. It sends the
current Illustrator selection directly to the **Pardach site catalog** without requiring
the designer to export an SVG manually or upload through the browser.

## User flow (فارسی)

1. در Illustrator یک طرح یا چند شیء متعلق به یک طرح را انتخاب کنید.
2. پنل **Window → Extensions → Pardach | ارسال مستقیم طرح** را باز کنید.
3. به حساب سایت با دسترسی بارگذاری کاتالوگ وارد شوید.
4. «خواندن انتخاب فعلی» را بزنید؛ نام و ابعاد محاسبه می‌شوند.
5. نوع طرح و کد خانواده را انتخاب کنید (برای گل، خانواده الزامی است).
6. «ارسال طرح انتخاب‌شده» را بزنید. خروجی SVG موقت به‌طور خودکار
   در پوشهٔ Temp ساخته، به HTTPS ارسال و بلافاصله از روی سیستم پاک می‌شود.
7. شناسهٔ ثبت‌شده نمایش داده می‌شود؛ وضعیت طرح پیش‌فرض **pending** است.

اگر چند شیء هم‌زمان انتخاب کنید، همگی **یک طرح** محسوب می‌شوند؛
در این نسخه ارسال تک‌تک گروه‌های انتخاب‌شده به صورت batch وجود ندارد.

## Installation on Windows

1. Clone this GitHub repository or download its ZIP.
2. Run `direct-uploader/install-windows.bat` (without administrator privileges).
3. Restart Illustrator and open the panel under Window → Extensions.
4. If an **unsigned development extension** is blocked, follow Adobe CEP's
   developer-mode procedure for your installed CSXS version. Do NOT expose the
   debugging port in production. Production distribution should use a signed ZXP.

This component is isolated from the existing extension; installing it does not replace
the existing panel.

## Server requirements

- HTTPS with valid certificate. Default `https://pardach.ir`.
- JWT login `POST /api/auth/login/`.
- Permission `designs:bulk_upload` with business policy `can_upload_design_files`.
- `POST /api/designs/designs/check-duplicate/` receives `file`.
- `POST /api/designs/designs/batch-upload/` receives `files`, `design_kind`,
  `family_key`, `metadata`, `default_status=pending`, `insert_only=1`.
- **IMPORTANT:** A compatible backend must implement
  `GET /api/designs/designs/upload-capabilities/` returning
  `{"insert_only":true}` and atomically enforce insert-only duplicate behavior.
  The panel must not upload against an old server that silently updates duplicate
  records; use the paired backend PR for the `pardach/pardach` repo.

## Fidelity and limitations

- The source Illustrator document is not saved or changed; objects are duplicated
  into a temporary Illustrator document and automatically exported to SVG.
- Inline SVG can be edited as vectors. Fonts, Illustrator-only live effects,
  transparency, symbols, pattern brushes, clipping masks, and linked assets require
  real-app fidelity testing. For full round-tripping, a later phase should upload
  both SVG and an AI source, associated with the same design ID.
- Any external linked SVG references are rejected; embedded raster content is allowed.
- Bounds are from `visibleBounds` (actual appearance, including strokes where
  Illustrator reports them). If you need geometric bounds, extend the contract.
- Exact selection width/height are sent as float **centimetres** in metadata;
  the existing Django `Design.width/height` fields round to integer units, so
  catalog list size labels may be approximate pending a schema migration. The
  exported SVG retains its own vector dimensions.
- This is currently **one-design-at-a-time** with 20 MiB client-side SVG cap.

## Security

- The panel does not store passwords or JWTs in localStorage, files, or SQLite.
- Node HTTPS requests verify TLS certificates and never follow redirects.
- The server URL must be a clean HTTPS origin, without path, credentials, or query.
- No remote script loading, CDN dependency, exposed remote debugger, or HTTP fallback.
- A duplicate check prevents ordinary re-uploads; the backend `insert_only`
  guarantee is required to prevent time-of-check/time-of-use races.
- The app deliberately retains no refresh token; login is required again when
  the panel reloads.

## Acceptance tests (must be run on a real Illustrator + staging backend)

- Login succeeds for authorized uploader; unauthorized user gets 403 from upload API.
- One group, several selected paths, and an SVG with embedded image export correctly.
- 10 mm by 10 mm artwork arrives at the correct scale in Setoffline; no silent scaling.
- Network interruption never deletes local source artwork; temporary SVG is removed.
- Uploading identical SVG twice does not mutate or overwrite the first record.
- Uploaded family and design kind match the expected catalog.
- Illustrator visual output vs generated SVG vs Setoffline canvas are visually compared.
- No token or password appears in logs or on disk.

## Roadmap

1. MVP: one-click current selection → protected site catalog with metadata.
2. Batch: one design per Illustrator group/layer and queue with retry.
3. Preserve full native AI source and editable SVG; visual comparison and fingerprint.
4. Site/Setoffline sync status shown in the panel, no duplicate family drift.
5. Plan migration from CEP to Illustrator UXP when Adobe's Illustrator APIs are ready.
