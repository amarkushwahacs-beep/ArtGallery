# ArtGallery

## Deploy on GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/(root)` folder, then save.
5. Open the published URL shown in the Pages settings after deployment completes.

This is a static read-only gallery on GitHub Pages. To add or update artwork,
put its image in `Upload_Painting/` and add its details to `assets/js/gallery-data.js`,
then commit and push the changes. GitHub Pages does not run the Python API, so
online uploads and deletes are disabled.

## Run locally

Run `python server.py` and open `http://localhost:8000`. On localhost, the gallery
shows the Add painting and Delete painting controls. The API is restricted to local
requests only, so uploaded or deleted works stay local to the development environment.
If `ADMIN_PASSWORD` is set, the request must include the matching `X-Admin-Password`
header.

## Email inquiries

Submitting the artwork inquiry form opens a draft in the visitor's default email
app. It is addressed to `xxxxxxxx@outlook.com`, copies the visitor's email,
and includes the artwork and form details. The visitor reviews and sends the email
from their email app; no SMTP configuration is required.
