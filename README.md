# TODOS Logistics

Static website for TODOS Logistics with a public marketing site and a private browser-based admin workspace for RG Logistics quotes and invoices.

## Structure

- `index.html` - public multi-section site
- `styles.css` - public site styling
- `Assets/` - public site images and video
- `admin/index.html` - private quote and invoice workspace entry page
- `admin/css/styles.css` - admin app styling
- `admin/js/app.js` - admin app logic
- `admin/assets/` - RG document export assets
- `CNAME` - custom domain configuration for GitHub Pages

## Public Site

The main site is served from:

- `https://www.todoslogistics.com/`

It is a static single-page marketing site with internal section navigation.

## Admin Workspace

The integrated private workspace is served from:

- `https://www.todoslogistics.com/admin/`

Notes:

- It is not linked from the public navigation.
- It includes `noindex` metadata to discourage search engine indexing.
- It is hidden by URL path, not protected by real authentication.
- Quotes, invoices, and saved clients are stored in the browser's `localStorage`, so data stays on the device/browser being used.

## Admin Features

- Create quotes and invoices
- Save and edit documents locally in the browser
- Convert quotes into invoices
- Search and filter saved documents
- Save reusable client records
- Export branded RG Logistics PDF-ready documents using included letterhead, footer, and signature assets

## Deployment

This repo is compatible with GitHub Pages static hosting.

- Root site: `https://www.todoslogistics.com/`
- Admin route: `https://www.todoslogistics.com/admin/`

The `CNAME` file is configured for the custom domain currently used by the project.
