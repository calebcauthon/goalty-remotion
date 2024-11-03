from b2sdk.v2 import *
import os

info = InMemoryAccountInfo()
b2_api = B2Api(info)

# Add your B2 credentials - you'll want to move these to environment variables
B2_KEY_ID = os.getenv('B2_KEY_ID')
B2_APPLICATION_KEY = os.getenv('B2_APP_KEY')
B2_BUCKET_NAME = 'remotion-videos'

# Initialize B2 connection
b2_api.authorize_account("production", B2_KEY_ID, B2_APPLICATION_KEY)
bucket = b2_api.get_bucket_by_name(B2_BUCKET_NAME)
