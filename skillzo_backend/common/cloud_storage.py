import os
import logging
from decouple import config

logger = logging.getLogger(__name__)

# Check if Cloudinary credentials are provided via environment variables or decouple
CLOUDINARY_CLOUD_NAME = config('CLOUDINARY_CLOUD_NAME', default=os.getenv('CLOUDINARY_CLOUD_NAME', ''))
CLOUDINARY_API_KEY = config('CLOUDINARY_API_KEY', default=os.getenv('CLOUDINARY_API_KEY', ''))
CLOUDINARY_API_SECRET = config('CLOUDINARY_API_SECRET', default=os.getenv('CLOUDINARY_API_SECRET', ''))
CLOUDINARY_URL = config('CLOUDINARY_URL', default=os.getenv('CLOUDINARY_URL', ''))

_cloudinary_initialized = False

def is_cloudinary_configured() -> bool:
    """Returns True if valid Cloudinary credentials are present."""
    if CLOUDINARY_URL and CLOUDINARY_URL.startswith('cloudinary://'):
        return True
    return bool(CLOUDINARY_CLOUD_NAME and CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET)

def init_cloudinary():
    global _cloudinary_initialized
    if _cloudinary_initialized:
        return True
    if not is_cloudinary_configured():
        return False

    try:
        import cloudinary
        if CLOUDINARY_URL:
            cloudinary.config(cloudinary_url=CLOUDINARY_URL)
        else:
            cloudinary.config(
                cloud_name=CLOUDINARY_CLOUD_NAME,
                api_key=CLOUDINARY_API_KEY,
                api_secret=CLOUDINARY_API_SECRET,
                secure=True,
            )
        _cloudinary_initialized = True
        logger.info("Cloudinary storage successfully initialized for remote video storage.")
        return True
    except Exception as e:
        logger.warning(f"Could not initialize Cloudinary: {e}")
        return False

def upload_media_to_cloud(file_obj, resource_type: str = 'video', folder: str = 'interview_recordings') -> str | None:
    """
    Uploads a video or audio file to Cloudinary cloud CDN.
    Returns secure HTTPS URL if uploaded, or None if Cloudinary is not configured or fails.
    """
    if not init_cloudinary():
        return None

    try:
        import cloudinary.uploader
        # Reset file pointer if seekable
        if hasattr(file_obj, 'seek'):
            file_obj.seek(0)

        res = cloudinary.uploader.upload(
            file_obj,
            resource_type=resource_type,
            folder=folder,
            overwrite=True,
        )
        secure_url = res.get('secure_url') or res.get('url')
        if secure_url:
            logger.info(f"Uploaded {resource_type} to Cloudinary: {secure_url}")
            return secure_url
    except Exception as e:
        logger.error(f"Cloudinary upload failed: {e}")

    return None
