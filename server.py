from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse
from email.parser import BytesParser
from email.policy import default
import json
import hmac
import os
import random
import shutil
import time

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
UPLOAD_DIR = os.environ.get("UPLOAD_DIR", os.path.join(PROJECT_ROOT, "Upload_Painting"))
UPLOAD_DIR = os.path.abspath(UPLOAD_DIR)
GALLERY_DATA_PATH = os.path.join(PROJECT_ROOT, "assets", "js", "gallery-data.js")
os.makedirs(UPLOAD_DIR, exist_ok=True)


def generate_random_price():
    return f"${random.randint(120, 250)}"


class GalleryHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PROJECT_ROOT, **kwargs)

    def do_GET(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/paintings":
            self.send_json(self.list_saved_paintings())
            return

        if parsed.path.startswith("/Upload_Painting/"):
            safe_path = os.path.normpath(os.path.join(PROJECT_ROOT, parsed.path.lstrip("/")))
            if os.path.commonpath([PROJECT_ROOT, safe_path]) != PROJECT_ROOT:
                self.send_response(403)
                self.end_headers()
                return
            self.path = parsed.path.lstrip("/")
            return super().do_GET()

        return super().do_GET()

    def do_POST(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/upload":
            if not self.require_admin():
                return
            self.upload_painting()
            return

        self.send_response(404)
        self.end_headers()

    def do_DELETE(self):
        parsed = urlparse(self.path)

        if parsed.path == "/api/delete":
            if not self.require_admin():
                return
            self.delete_painting()
            return

        self.send_response(404)
        self.end_headers()

    def is_localhost_request(self):
        host = self.headers.get("Host", "").split(":", 1)[0].lower()
        remote_host = self.client_address[0].lower() if self.client_address else ""
        localhost_hosts = {"localhost", "127.0.0.1", "::1", "[::1]"}
        if host in localhost_hosts:
            return True
        if remote_host in {"127.0.0.1", "::1", "0.0.0.0"}:
            return True
        return False

    def require_admin(self):
        if not self.is_localhost_request():
            body = json.dumps({"error": "Painting management is only enabled on localhost"}).encode("utf-8")
            self.send_response(403)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)
            return False

        expected_password = os.environ.get("ADMIN_PASSWORD")
        if not expected_password:
            return True

        supplied_password = self.headers.get("X-Admin-Password", "")
        if hmac.compare_digest(supplied_password, expected_password):
            return True

        body = json.dumps({"error": "Admin password required"}).encode("utf-8")
        self.send_response(401)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)
        return False

    def send_json(self, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def metadata_path_for(self, filename):
        stem, _ = os.path.splitext(filename)
        return os.path.join(UPLOAD_DIR, f"{stem}.json")

    def save_painting_metadata(self, filename, metadata):
        meta_path = self.metadata_path_for(filename)
        with open(meta_path, "w", encoding="utf-8") as meta_file:
            json.dump(metadata, meta_file)

    def sync_gallery_data_file(self, payload):
        if not os.path.exists(GALLERY_DATA_PATH):
            return

        with open(GALLERY_DATA_PATH, "r", encoding="utf-8") as gallery_file:
            gallery_content = gallery_file.read()

        const_index = gallery_content.find("const paintings = [")
        if const_index == -1:
            return

        start_index = const_index + len("const paintings = [")
        closing_index = gallery_content.rfind("];")
        if closing_index == -1 or closing_index <= start_index:
            return

        existing_items = gallery_content[start_index:closing_index].strip()
        entry_text = json.dumps(payload, ensure_ascii=False, indent="\t")

        if existing_items:
            updated_items = existing_items.rstrip().rstrip(",")
            updated_body = f"\n{updated_items},\n{entry_text}\n"
        else:
            updated_body = f"\n{entry_text}\n"

        updated_content = (
            gallery_content[:start_index]
            + updated_body
            + gallery_content[closing_index:]
        )

        with open(GALLERY_DATA_PATH, "w", encoding="utf-8") as gallery_file:
            gallery_file.write(updated_content)

    def remove_gallery_data_entry(self, image_path):
        if not os.path.exists(GALLERY_DATA_PATH):
            return

        with open(GALLERY_DATA_PATH, "r", encoding="utf-8") as gallery_file:
            gallery_content = gallery_file.read()

        needle = f'"image": "{image_path}"'
        if needle not in gallery_content:
            return

        start_index = gallery_content.rfind("{", 0, gallery_content.index(needle))
        if start_index == -1:
            return

        depth = 0
        end_index = -1
        for index in range(start_index, len(gallery_content)):
            char = gallery_content[index]
            if char == "{":
                depth += 1
            elif char == "}":
                depth -= 1
                if depth == 0:
                    end_index = index
                    break

        if end_index == -1:
            return

        before = gallery_content[:start_index]
        after = gallery_content[end_index + 1:]

        if before.rstrip().endswith(","):
            before = before.rstrip()[:-1]
        if after.lstrip().startswith(","):
            after = after.lstrip()[1:]

        with open(GALLERY_DATA_PATH, "w", encoding="utf-8") as gallery_file:
            gallery_file.write(before + after)

    def read_painting_metadata(self, filename):
        meta_path = self.metadata_path_for(filename)
        if not os.path.exists(meta_path):
            return {}

        try:
            with open(meta_path, "r", encoding="utf-8") as meta_file:
                return json.load(meta_file)
        except (json.JSONDecodeError, OSError):
            return {}

    def list_saved_paintings(self):
        saved = []
        seen_images = set()
        if not os.path.isdir(UPLOAD_DIR):
            return saved

        for filename in sorted(os.listdir(UPLOAD_DIR), key=lambda x: os.path.getmtime(os.path.join(UPLOAD_DIR, x)), reverse=True):
            if not filename.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif")):
                continue

            image_path = f"./Upload_Painting/{filename}"
            if image_path.lower() in seen_images:
                continue

            seen_images.add(image_path.lower())
            metadata = self.read_painting_metadata(filename)
            price_value = metadata.get("price")
            if not price_value or price_value == "Contact for pricing" or price_value == "Contact for Pricing":
                price_value = generate_random_price()

            saved.append({
                "id": f"saved-{os.path.splitext(filename)[0]}",
                "title": metadata.get("title") or os.path.splitext(filename)[0],
                "artist": metadata.get("artist") or "Saved Artist",
                "date": metadata.get("date") or "2026-10-03",
                "description": metadata.get("description") or "Uploaded painting saved to the gallery folder.",
                "price": price_value,
                "wall": "left" if len(saved) % 2 == 0 else "right",
                "image": image_path
            })

        return saved

    def upload_painting(self):
        try:
            content_type = self.headers.get("Content-Type", "")
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)

            if "multipart/form-data" not in content_type:
                self.send_response(400)
                self.end_headers()
                return

            message = BytesParser(policy=default).parsebytes(
                (f"Content-Type: {content_type}\r\n\r\n").encode("utf-8") + body
            )

            form_data = {}
            uploaded_file = None
            uploaded_filename = None

            for part in message.iter_parts():
                name = part.get_param("name", header="content-disposition")
                filename = part.get_filename()
                payload = part.get_payload(decode=True)

                if name is not None and filename is None:
                    form_data[name] = payload.decode("utf-8", errors="ignore") if payload else ""
                elif filename:
                    uploaded_file = payload or b""
                    uploaded_filename = filename

            artist = form_data.get("artist", "Artist").strip()
            title = form_data.get("title", "Untitled Painting").strip()
            date_value = form_data.get("date", "2026-10-03").strip()
            description = form_data.get("description", "Uploaded artwork").strip()
            price = form_data.get("price", "").strip()
            if not price or price in {"Contact for pricing", "Contact for Pricing"}:
                price = generate_random_price()

            if uploaded_file is None or uploaded_filename is None:
                self.send_response(400)
                self.end_headers()
                return

            existing_images = [
                name for name in os.listdir(UPLOAD_DIR)
                if name.lower().endswith((".png", ".jpg", ".jpeg", ".webp", ".gif"))
            ]
            next_wall = "left" if len(existing_images) % 2 == 0 else "right"

            safe_name = f"{int(time.time() * 1000)}-{uploaded_filename.replace(' ', '-') }"
            save_path = os.path.join(UPLOAD_DIR, safe_name)

            with open(save_path, "wb") as saved_file:
                saved_file.write(uploaded_file)

            payload = {
                "id": f"saved-{os.path.splitext(safe_name)[0]}",
                "title": title,
                "artist": artist,
                "date": date_value,
                "description": description,
                "price": price,
                "wall": next_wall,
                "image": f"./Upload_Painting/{safe_name}"
            }

            self.save_painting_metadata(safe_name, payload)
            self.sync_gallery_data_file(payload)
            self.send_json(payload)
            return

        except Exception as exc:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))

    def delete_painting(self):
        try:
            content_length = int(self.headers.get("Content-Length", "0"))
            body = self.rfile.read(content_length)
            payload = json.loads(body.decode("utf-8")) if body else {}
            image_path = payload.get("image", "")
            filename = os.path.basename(image_path)

            if not filename:
                self.send_response(400)
                self.end_headers()
                return

            file_path = os.path.join(UPLOAD_DIR, filename)
            if os.path.exists(file_path):
                os.remove(file_path)

            meta_path = self.metadata_path_for(filename)
            if os.path.exists(meta_path):
                os.remove(meta_path)

            self.remove_gallery_data_entry(image_path)
            self.send_json({"status": "deleted", "image": filename})
        except Exception as exc:
            self.send_response(500)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": str(exc)}).encode("utf-8"))


if __name__ == "__main__":
    import time
    PORT = int(os.environ.get("PORT", "8000"))
    server = ThreadingHTTPServer(("0.0.0.0", PORT), GalleryHandler)
    print(f"Art Gallery server running on port {PORT}")
    server.serve_forever()
