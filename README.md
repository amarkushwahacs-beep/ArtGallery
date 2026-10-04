# ArtGallery

## Deploy on Render

1. Push this project to a GitHub repository.
2. In Render, choose **New +** then **Blueprint**, and connect the repository.
3. Enter a strong value for `ADMIN_PASSWORD` when prompted. Keep it private.
4. Deploy the `art-gallery` service and open its generated `onrender.com` URL.

The blueprint configures a persistent disk for uploaded paintings. It uses Render's
Starter web-service plan because persistent disks are not available on the free plan.
The gallery can be viewed publicly; adding or deleting paintings requires the admin
password. Uploaded files are stored separately from the application deployment.

## Run locally

Run `python server.py` and open `http://localhost:8000`. To use upload/delete locally,
set the `ADMIN_PASSWORD` environment variable before starting the server.
