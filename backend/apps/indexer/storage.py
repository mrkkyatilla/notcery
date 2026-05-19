import uuid

import boto3
from botocore.client import Config
from django.conf import settings


def _s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=Config(signature_version="s3v4"),
        region_name=settings.AWS_S3_REGION_NAME,
    )


def build_file_key(workspace_id: uuid.UUID, filename: str) -> str:
    safe_name = filename.replace("/", "_").strip() or "upload"
    return f"workspaces/{workspace_id}/{uuid.uuid4()}/{safe_name}"


def generate_presigned_upload_url(file_key: str, mime_type: str, expires: int = 3600) -> str:
    client = _s3_client()
    return client.generate_presigned_url(
        ClientMethod="put_object",
        Params={
            "Bucket": settings.AWS_STORAGE_BUCKET_NAME,
            "Key": file_key,
            "ContentType": mime_type,
        },
        ExpiresIn=expires,
    )


def download_file_bytes(file_key: str) -> bytes:
    client = _s3_client()
    response = client.get_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=file_key)
    return response["Body"].read()


def delete_file(file_key: str) -> None:
    client = _s3_client()
    client.delete_object(Bucket=settings.AWS_STORAGE_BUCKET_NAME, Key=file_key)


def ensure_bucket_exists() -> None:
    client = _s3_client()
    bucket = settings.AWS_STORAGE_BUCKET_NAME
    try:
        client.head_bucket(Bucket=bucket)
    except client.exceptions.ClientError:
        client.create_bucket(Bucket=bucket)
