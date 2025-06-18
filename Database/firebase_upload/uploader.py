#!/usr/bin/env python3
"""
Firebase Storage File Uploader

Upload files to Firebase Storage using a service account key file.
Usage: python uploader.py <service-account-key-file.json> <file-to-upload>
"""

import os
import sys
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage

def upload_file(service_account_path, file_path):
    """Upload a file to Firebase Storage."""
    try:
        # Make sure the files exist
        if not os.path.exists(service_account_path):
            print(f"Error: Service account file {service_account_path} does not exist.")
            return False
            
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} does not exist.")
            return False
        
        # Initialize Firebase
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': 'market-c0fa5.firebasestorage.app'
        })
        
        # Get the filename from the path
        filename = os.path.basename(file_path)
        
        # Get a reference to the storage bucket
        bucket = storage.bucket()
        
        # Create a storage reference
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        destination_path = f"uploads/{timestamp}_{filename}"
        blob = bucket.blob(destination_path)
        
        # Upload the file
        blob.upload_from_filename(file_path)
        
        # Make the file publicly accessible
        blob.make_public()
        
        print(f"File {filename} uploaded successfully!")
        print(f"Public URL: {blob.public_url}")
        return True
    except Exception as e:
        print(f"Error: {e}")
        return False

def main():
    """Main function to parse arguments and upload file."""
    if len(sys.argv) != 3:
        print("Usage: python uploader.py <service-account-key-file.json> <file-to-upload>")
        return
    
    service_account_path = sys.argv[1]
    file_path = sys.argv[2]
    
    upload_file(service_account_path, file_path)

if __name__ == "__main__":
    main()
