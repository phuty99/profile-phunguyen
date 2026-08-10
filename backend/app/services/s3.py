import uuid

import boto3
from fastapi import UploadFile

from app.core.config import settings

_s3_client = boto3.client(
    "s3",
    region_name=settings.aws_region,
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}


def upload_image(file: UploadFile, folder: str) -> str:
    ext = file.filename.rsplit(".", 1)[-1] if file.filename and "." in file.filename else "bin"
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    _s3_client.upload_fileobj(
        file.file,
        settings.s3_bucket_name,
        key,
        ExtraArgs={"ContentType": file.content_type or "application/octet-stream"},
    )

    return key


def upload_bytes(data: bytes, folder: str, ext: str, content_type: str) -> str:
    key = f"{folder}/{uuid.uuid4()}.{ext}"

    _s3_client.put_object(
        Bucket=settings.s3_bucket_name,
        Key=key,
        Body=data,
        ContentType=content_type,
    )

    return key


def get_presigned_url(key: str, expires_in: int = 3600) -> str:
    return _s3_client.generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.s3_bucket_name, "Key": key},
        ExpiresIn=expires_in,
    )


def delete_object(key: str) -> None:
    _s3_client.delete_object(Bucket=settings.s3_bucket_name, Key=key)


def delete_image(key: str) -> None:
    delete_object(key)
