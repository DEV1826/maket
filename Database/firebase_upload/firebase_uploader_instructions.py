#!/usr/bin/env python3
"""
Firebase Storage File Uploader with Instructions

This script explains how to get a proper service account key file and then
upload files to Firebase Storage.
"""

import os
import sys
from datetime import datetime
import webbrowser
import json

def print_instructions():
    """Print instructions for getting a service account key."""
    print("=========================================================")
    print("FIREBASE STORAGE UPLOADER - GETTING STARTED")
    print("=========================================================")
    print("\nYour google-services.json file is a Firebase configuration file for client apps,")
    print("not a service account key file which is needed for server-side operations.")
    print("\nFollow these steps to get a service account key file:")
    print("\n1. Go to the Firebase Console: https://console.firebase.google.com/")
    print("2. Select your project: market-c0fa5")
    print("3. Go to Project Settings (gear icon) > Service accounts")
    print("4. Click on 'Generate new private key'")
    print("5. Save the JSON file in this directory")
    print("\nWould you like to open the Firebase Console now? (y/n)")
    
    response = input().strip().lower()
    if response == 'y':
        try:
            webbrowser.open('https://console.firebase.google.com/project/market-c0fa5/settings/serviceaccounts/adminsdk')
            print("\nOpened Firebase Console in your browser.")
        except:
            print("\nCouldn't open browser automatically. Please go to:")
            print("https://console.firebase.google.com/project/market-c0fa5/settings/serviceaccounts/adminsdk")
    
    print("\nAfter downloading the service account key file, save it in this directory.")
    print("Then, you can use the uploader script to upload files.")
    print("\nTo run the uploader once you have the service account key file:")
    print("1. Make sure you're in the virtual environment: source venv/bin/activate")
    print("2. Run: python uploader.py <service-account-key-file.json> <file-to-upload>")
    print("\nFor example:")
    print("python uploader.py service-account-key.json Python.jpg")

def main():
    """Main function to run the instructions."""
    print_instructions()
    
    # Create the uploader script for future use
    create_uploader_script()
    print("\nCreated 'uploader.py' script that you can use once you have the service account key file.")

def create_uploader_script():
    """Create the uploader script for use with the service account key."""
    script = """#!/usr/bin/env python3
\"\"\"
Firebase Storage File Uploader

Upload files to Firebase Storage using a service account key file.
Usage: python uploader.py <service-account-key-file.json> <file-to-upload>
\"\"\"

import os
import sys
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage

def upload_file(service_account_path, file_path):
    \"\"\"Upload a file to Firebase Storage.\"\"\"
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
    \"\"\"Main function to parse arguments and upload file.\"\"\"
    if len(sys.argv) != 3:
        print("Usage: python uploader.py <service-account-key-file.json> <file-to-upload>")
        return
    
    service_account_path = sys.argv[1]
    file_path = sys.argv[2]
    
    upload_file(service_account_path, file_path)

if __name__ == "__main__":
    main()
"""
    with open('uploader.py', 'w') as f:
        f.write(script)
    os.chmod('uploader.py', 0o755)  # Make executable

if __name__ == "__main__":
    main()
