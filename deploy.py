import os
import sys
import argparse
import mimetypes
from azure.storage.blob import BlobServiceClient, ContentSettings

CONTAINER_NAME = "$web"


def load_env_file(env_file: str) -> dict:
  env_vars = {}
  with open(env_file, "r") as f:
    for line in f:
      line = line.strip()
      if not line or line.startswith("#"):
        continue
      if "=" in line:
        key, _, value = line.partition("=")
        env_vars[key.strip()] = value.strip().strip('"').strip("'")
  return env_vars

MIME_MAP = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".map": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".txt": "text/plain",
  ".xml": "application/xml",
  ".webp": "image/webp",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".ttf": "font/ttf",
}

def detect_mime_type(file_path: str) -> str:
  ext = os.path.splitext(file_path)[1].lower()
  if ext in MIME_MAP:
    return MIME_MAP[ext]
  mime, _ = mimetypes.guess_type(file_path)
  if mime:
    return mime
  return "application/octet-stream"



def upload_file(blob_service_client, local_path: str, blob_path: str):
  blob_client = blob_service_client.get_blob_client(
  container=CONTAINER_NAME,
  blob=blob_path
  )
  mime_type = detect_mime_type(local_path)
  with open(local_path, "rb") as data:
    blob_client.upload_blob(
    data,
    overwrite=True,
    content_settings=ContentSettings(
    content_type=mime_type
    )
    )
  print(f"Uploaded: {blob_path} --> {mime_type}")

def clear_web_container(blob_service_client):
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)
    print("Deleting existing files from $web container...")
    blobs = list(container_client.list_blobs())
    if not blobs:
        print("No existing files found.")
        return
    # Delete deepest paths first to avoid DirectoryNotEmpty on HNS-enabled accounts
    blobs.sort(key=lambda b: b.name.count("/"), reverse=True)
    for blob in blobs:
        container_client.delete_blob(blob.name)
        print(f"Deleted: {blob.name}")
    print("✅ $web container cleaned.")

def upload_static_website(local_folder: str, env_file: str):
  if not os.path.isdir(local_folder):
    print(f"❌ Build folder '{local_folder}' does not exist. Run the build first.")
    sys.exit(1)

  if not os.path.isfile(env_file):
    print(f"❌ Env file '{env_file}' not found.")
    sys.exit(1)

  env_vars = load_env_file(env_file)
  connection_string = env_vars.get("AZURE_CONNECTION_STRING")
  if not connection_string:
    print(f"❌ AZURE_CONNECTION_STRING not found in '{env_file}'.")
    sys.exit(1)

  blob_service_client = BlobServiceClient.from_connection_string(connection_string)
  clear_web_container(blob_service_client)
  for root, _, files in os.walk(local_folder):
    for file in files:
      full_path = os.path.join(root, file)
      blob_path = os.path.relpath(full_path, local_folder).replace("\\", "/")
      upload_file(blob_service_client, full_path, blob_path)


if __name__ == "__main__":
  parser = argparse.ArgumentParser(description="Deploy static site to Azure Blob Storage.")
  parser.add_argument("--folder", default="./dist", help="Local build folder to deploy (e.g. ./dist-uat)")
  parser.add_argument("--env-file", required=True, help="Path to the .env file containing AZURE_CONNECTION_STRING (e.g. .env.uat)")
  args = parser.parse_args()

  try:
    print(f"Deploying '{args.folder}' using '{args.env_file}' to Azure Blob Storage ($web)...")
    upload_static_website(args.folder, args.env_file)
    print("✅ Upload completed successfully.")
  except Exception as e:
    print(f"❌ Deployment failed: {e}")
    sys.exit(1)