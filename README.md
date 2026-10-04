# ArtGallery

## Deploy on GitHub Pages

1. Push this project to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and the `/(root)` folder, then save.
5. Open the published URL shown in the Pages settings after deployment completes.

This is a static, read-only gallery. To add or update artwork, put its image in
`Upload_Painting/` and add its details to `assets/js/gallery-data.js`, then commit
and push the changes. GitHub Pages does not run the Python API, so online uploads
and deletes are disabled. The inquiry form opens the visitor's email application.

## Run locally

Run `python server.py` and open `http://localhost:8000`. The local Python server
is retained for backend development; the gallery UI in this Pages version is
read-only. Edit `assets/js/gallery-data.js` and add images under `Upload_Painting/`
to update the static gallery.
