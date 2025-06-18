#!/usr/bin/env python3
"""
Simple Firebase Storage File Uploader

This script uploads files to Firebase Storage. It prompts the user only for the file name
and uploads it to the specified Firebase Storage bucket.
"""

import os
import sys
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage

# Constants
SERVICE_ACCOUNT_FILE = 'google-services.json'
STORAGE_BUCKET = 'market-c0fa5.firebasestorage.app'

def setup_firebase():
    """Initialize Firebase app with the service account key file in the current directory."""
    try:
        # Get the absolute path to the service account file
        service_account_path = os.path.abspath(SERVICE_ACCOUNT_FILE)
        
        if not os.path.exists(service_account_path):
            print(f"Error: Service account file {service_account_path} not found.")
            return False
            
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': STORAGE_BUCKET
        })
        print("Firebase initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return False

def upload_file(file_name):
    """Upload a file to Firebase Storage."""
    try:
        # Get the full path to the file in the current directory
        file_path = os.path.abspath(file_name)
        
        # Make sure the file exists
        if not os.path.exists(file_path):
            print(f"Error: File {file_path} does not exist.")
            return False
        
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
        print(f"Error uploading file: {e}")
        return False

def main():
    """Main function to execute the script."""
    print("Simple Firebase Storage Uploader")
    print("==============================")
    
    # Initialize Firebase
    if not setup_firebase():
        print("Failed to initialize Firebase. Please check your service account key file.")
        return
    
    # Ask for file to upload
    file_name = input("Enter the name of the file to upload (in the current directory): ").strip()
    
    # Upload the file
    upload_file(file_name)

if __name__ == "__main__":
    main()
