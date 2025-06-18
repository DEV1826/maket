# Firebase Upload Tools

This directory contains scripts for uploading data and files to Firebase.

## Prerequisites

1. Python 3.x
2. A Firebase project with Storage enabled
3. A service account key file (JSON) with appropriate permissions

## Setup Instructions

### 1. Obtain a Firebase Service Account Key

1. Go to the [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Navigate to Project Settings > Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file securely (this contains sensitive credentials)

### 2. Install Dependencies

The script requires the following Python packages:
- firebase-admin
- google-cloud-storage

They can be installed using pip:

```bash
# Using the virtual environment
source venv/bin/activate
pip install firebase-admin google-cloud-storage
```

## Available Scripts

### 1. Firebase Storage Uploader (`firebase_uploader.py`)

Uploads individual files to Firebase Storage.

```bash
source venv/bin/activate
python firebase_uploader.py [path_to_service_account_key.json]
```

### 2. Simple Uploader (`simple_uploader.py`)

A simplified version that uploads files from the current directory.

```bash
source venv/bin/activate
python simple_uploader.py
```

### 3. Command-line Uploader (`uploader.py`)

A command-line tool for quick uploads.

```bash
source venv/bin/activate
python uploader.py <service-account-key-file.json> <file-to-upload>
```

### 4. Excel to Firebase Uploader (`excel_to_firebase.py`)

Uploads data from the Excel file to Firebase Firestore and images to Firebase Storage.

```bash
source venv/bin/activate
python excel_to_firebase.py [--test]
```

Options:
- `--test`: Only upload the first 5 entries from each table (for testing)

## Excel to Firebase Uploader Details

The `excel_to_firebase.py` script reads data from the `B1 REPAS FINAL.xlsm` Excel file and:

1. Uploads all dish and ingredient data to Firestore
2. Uploads all images to Firebase Storage
3. Creates proper relationships between dishes, ingredients, and images

### Data Structure

The script creates the following collections in Firestore:

- `ingredients`: Contains all ingredients with their details and image URLs
- `plats`: Contains all dishes with their details, image URLs, and ingredient relationships
- `public_dishes`: A copy of the dishes collection that all users can access

### Image Handling

- Images are uploaded to Firebase Storage in either the `plats` or `ingredients` folder
- Each image is made publicly accessible and its URL is stored in the corresponding Firestore document
- The script avoids re-uploading the same image multiple times

### Test Mode

Use the `--test` flag to only upload the first 5 entries from each table. This is useful for verifying that everything works correctly before doing a full upload.

```bash
python excel_to_firebase.py --test
```

## Notes

- Files are uploaded with timestamps to avoid name collisions
- By default, uploaded files are made publicly accessible
- The script maintains all relationships between dishes and ingredients from the Excel file

## Troubleshooting

- If you encounter permission errors, make sure your service account has the necessary permissions for Firebase Storage and Firestore operations
- Verify that the Firebase Storage bucket name in the code matches your actual bucket name
- For Excel upload issues, check that the Excel file structure matches what the script expects
- If images aren't being found, verify the paths in the Excel file and the actual location of the image files
- Use the `--test` flag with `excel_to_firebase.py` to test with a small subset of data first
