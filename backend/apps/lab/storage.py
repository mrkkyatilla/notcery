import uuid

from apps.indexer.storage import (
    _s3_client,
    delete_file,
    download_file_bytes,
    generate_presigned_upload_url,
)

__all__ = [
    "build_lab_file_key",
    "generate_presigned_upload_url",
    "download_file_bytes",
    "delete_file",
    "upload_text_content",
]


def build_lab_file_key(workspace_id: uuid.UUID, filename: str) -> str:
    safe_name = filename.replace("/", "_").strip() or "file"
    return f"workspaces/{workspace_id}/lab/{uuid.uuid4()}/{safe_name}"


def upload_text_content(file_key: str, content: str, mime_type: str = "text/plain") -> None:
    client = _s3_client()
    from django.conf import settings

    client.put_object(
        Bucket=settings.AWS_STORAGE_BUCKET_NAME,
        Key=file_key,
        Body=content.encode("utf-8"),
        ContentType=mime_type,
    )
