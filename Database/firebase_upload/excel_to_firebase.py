#!/usr/bin/env python3
"""
Excel to Firebase Uploader

This script reads data from the B1 REPAS FINAL.xlsm Excel file and uploads:
1. All dish and ingredient data to Firestore
2. All images to Firebase Storage
3. Creates proper relationships between dishes, ingredients, and images

Usage: python excel_to_firebase.py [--test]
       Adding --test will only upload the first 5 entries from each table
"""

import os
import sys
import pandas as pd
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, storage, firestore
import time
import re
import argparse
import concurrent.futures
import threading
import json
import sys
import time # Ensure time is imported for timestamping filenames

# Constants
SERVICE_ACCOUNT_FILE = 'market-c0fa5-firebase-adminsdk-fbsvc-d42907b0fd.json'
BUCKET_NAME = 'market-c0fa5.firebasestorage.app'
EXCEL_FILE_PATH = '../VBA B1 FINAL/B1 REPAS FINAL.xlsm'
IMAGE_DIR = '../VBA B1 FINAL/IMAGE'

# Global variables
db = None
bucket = None
uploaded_images = {}  # Cache to avoid re-uploading the same image
image_upload_lock = threading.Lock() # Lock for thread-safe operations on shared resources like the image cache
progress_lock = threading.Lock() # Lock for reading/writing progress file
processed_ingredients_set = set()
processed_dishes_set = set()
PROGRESS_FILE = 'upload_progress.json'

def setup_firebase():
    """Initialize Firebase app with the service account key file."""
    global db, bucket
    
    try:
        # Get the absolute path to the service account file
        service_account_path = os.path.abspath(SERVICE_ACCOUNT_FILE)
        
        if not os.path.exists(service_account_path):
            print(f"Error: Service account file {service_account_path} not found.")
            return False
            
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred, {
            'storageBucket': BUCKET_NAME
        })
        
        # Initialize Firestore and Storage
        db = firestore.client()
        bucket = storage.bucket()
        
        print("Firebase initialized successfully")
        return True
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return False

def upload_image(image_path, destination_folder):
    global uploaded_images
    normalized_image_path = os.path.normpath(image_path)

    with image_upload_lock:
        if normalized_image_path in uploaded_images:
            return uploaded_images[normalized_image_path]
    
    try:
        full_path = normalized_image_path
        print(f"upload_image: Attempting to locate {full_path}")

        if not os.path.exists(full_path):
            print(f"upload_image: Initial path {full_path} not found. Attempting case-insensitive search.")
            dir_path = os.path.dirname(full_path)
            filename_to_match_lower = os.path.basename(full_path).lower()
            
            print(f"upload_image: Searching in directory: '{dir_path}' for filename (case-insensitive): '{filename_to_match_lower}'")

            found_match = False
            if os.path.exists(dir_path):
                files_in_dir = os.listdir(dir_path)
                print(f"upload_image: Files in '{dir_path}': {files_in_dir}") # Log files in directory
                for file_in_dir in files_in_dir:
                    if file_in_dir.lower() == filename_to_match_lower:
                        full_path = os.path.join(dir_path, file_in_dir)
                        print(f"upload_image: Case-insensitive match found: {full_path}")
                        found_match = True
                        break
            else:
                print(f"upload_image: Directory '{dir_path}' does not exist for case-insensitive search.")

            if not found_match:
                print(f"Warning: Image {normalized_image_path} does not exist after all checks.")
                return None
        else:
            print(f"upload_image: Initial path {full_path} found.")

        actual_filename = os.path.basename(full_path)
        name_part, ext_part = os.path.splitext(actual_filename)
        timestamp = int(time.time())
        destination_path = f"{destination_folder}/{name_part}_{timestamp}{ext_part}"
        
        
        # Get the filename from the path
        filename = os.path.basename(full_path)
        
        # Create a storage reference with a unique timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        destination_path = f"{destination_folder}/{timestamp}_{filename}"
        blob = bucket.blob(destination_path)
        
        print(f"Uploading file {full_path} to {destination_path}")
        
        # Upload the file
        blob.upload_from_filename(full_path)
        
        # Make the file publicly accessible
        blob.make_public()
        
        # Get and print the public URL
        public_url = blob.public_url
        print(f"Successfully uploaded image: {filename}")
        print(f"Public URL: {public_url}")
        
        # Cache the URL (thread-safe)
        with image_upload_lock:
            uploaded_images[image_path] = public_url
        
        return public_url
    except Exception as e:
        print(f"Error uploading image {image_path}: {e}")
        # Print full exception traceback for more details
        import traceback
        traceback.print_exc()
        return None

def read_excel_data(file_path):
    """Read all sheets from the Excel file and return as DataFrames."""
    try:
        # Read Excel file
        excel_path = os.path.abspath(file_path)
        print(f"Reading Excel file: {excel_path}")
        
        if not os.path.exists(excel_path):
            print(f"Error: Excel file {excel_path} not found.")
            return None
        
        # Read all sheets with the correct names from the file
        ingredients_df = pd.read_excel(excel_path, sheet_name='ingredient')
        plats_df = pd.read_excel(excel_path, sheet_name='plat')
        plat_ingredient_df = pd.read_excel(excel_path, sheet_name='plat_ingredient')
        photos_df = pd.read_excel(excel_path, sheet_name='photos')
        
        # Fill NaN values with empty strings
        ingredients_df = ingredients_df.fillna('')
        plats_df = plats_df.fillna('')
        plat_ingredient_df = plat_ingredient_df.fillna('')
        photos_df = photos_df.fillna('')
        
        print(f"Read {len(plats_df)} dishes, {len(ingredients_df)} ingredients, {len(photos_df)} photos, and {len(plat_ingredient_df)} dish-ingredient relationships")
        
        return {
            'ingredient': ingredients_df, 
            'plat': plats_df,
            'plat_ingredient': plat_ingredient_df,
            'photos': photos_df
        }
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

def process_single_ingredient(args):
    """Process and upload a single ingredient with its images."""
    index, row, photos_df, total = args
    code = row['code_ingredient']
    
    # Only print progress periodically to avoid console spam
    if index % 25 == 0:
        print(f"Processing ingredient {index+1}/{total}: {code}")
    
    try:

        # Prepare ingredient data
        ingredient_data = {
            'code': code,
            'nom': row['nom_ingredient'],
            'autre_nom': row['autre_nom'],
            'description': row['description '],
            'origine': row['origine'],
            'imageUrls': []
        }
        
        image_paths = []
        # 1. Check direct paths in the ingredients sheet
        if pd.notna(row.get('chemin_photo_1')) and isinstance(row['chemin_photo_1'], str) and row['chemin_photo_1'].strip():
            image_path = os.path.join(IMAGE_DIR, row['chemin_photo_1'].replace('IMAGE/', ''))
            # print(f"Found image path for ingredient {code}: {image_path}")
            image_paths.append(image_path)
        
        if pd.notna(row.get('chemin_photo_2')) and isinstance(row['chemin_photo_2'], str) and row['chemin_photo_2'].strip():
            image_path = os.path.join(IMAGE_DIR, row['chemin_photo_2'].replace('IMAGE/', ''))
            # print(f"Found image path for ingredient {code}: {image_path}")
            image_paths.append(image_path)
        
        # 2. Check in the photos sheet if provided
        if photos_df is not None:
            ingredient_photos = photos_df[photos_df['code'] == code]
            for _, photo_row in ingredient_photos.iterrows():
                if pd.notna(photo_row.get('Unnamed: 2')) and photo_row['Unnamed: 2'].strip():
                    image_path = os.path.join(IMAGE_DIR, photo_row['Unnamed: 2'].replace('IMAGE/', ''))
                    # print(f"Found image path in photos sheet for ingredient {code}: {image_path}")
                    image_paths.append(image_path)
        
        # 3. Try a default pattern based on ingredient code if no images were found
        if not image_paths:
            possible_patterns = [
                f"../VBA B1 FINAL/IMAGE/Ingredients/{code}.jpg",
                f"../VBA B1 FINAL/IMAGE/Ingredients/{code.lower()}.jpg",
                f"../VBA B1 FINAL/IMAGE/Ingredients/INGREDIENT{code[1:]}.jpg",
                f"../VBA B1 FINAL/IMAGE/Ingredients/ingredient{code[1:]}.jpg",
            ]
            for pattern in possible_patterns:
                # Construct absolute path for pattern checking
                abs_pattern_path = os.path.abspath(os.path.join(os.path.dirname(__file__), pattern))
                if os.path.exists(abs_pattern_path):
                    # print(f"Found image using pattern match for ingredient {code}: {abs_pattern_path}")
                    image_paths.append(abs_pattern_path) # Use absolute path for upload_image
                    break
        
        # Upload each image and save its URL
        for image_path in image_paths:
            # print(f"Uploading image for ingredient {code}: {image_path}")
            image_url = upload_image(image_path, 'ingredients')
            if image_url:
                ingredient_data['imageUrls'].append(image_url)
                # print(f"Added image URL for ingredient {code}: {image_url}")
        
        if not ingredient_data['imageUrls']:
            print(f"Warning: No images found for ingredient {code} - {row['nom_ingredient']}")
        
        # Create ingredient document reference and set data
        doc_ref = db.collection('ingredients').document(code)
        doc_ref.set(ingredient_data)
        print(f"Ingredient {code} - {row['nom_ingredient']} uploaded with {len(ingredient_data['imageUrls'])} images.")
        
        # Mark as processed and save progress
        with progress_lock:
            processed_ingredients_set.add(code)
            save_progress()
        return code # Return code for ingredient_map

    except Exception as e:
        print(f"Error processing ingredient {code}: {e}")
        # import traceback
        # traceback.print_exc()
        return None # Indicate failure

def upload_ingredients(ingredients_df, photos_df=None, test_mode=False, num_threads=4):
    """Upload all ingredients to Firestore using multiple threads and return a mapping of ingredient codes to their IDs."""
    ingredient_map = {}
    total_ingredients = len(ingredients_df)
    
    if test_mode:
        print(f"Test mode: only processing first 5 ingredients")
        ingredients_df = ingredients_df.head(5)
        total_ingredients = 5

    print(f"Preparing to upload {total_ingredients} ingredients to Firestore using {num_threads} threads...")
    
    tasks = []
    for index, row in ingredients_df.iterrows():
        tasks.append((index, row, photos_df, total_ingredients))

    successful_uploads = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        future_to_ingredient = {executor.submit(process_single_ingredient, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_to_ingredient):
            ingredient_code = future.result()
            if ingredient_code:
                ingredient_map[ingredient_code] = ingredient_code # Map to itself, or Firestore ID if different
                successful_uploads += 1
    
    print(f"Successfully processed {successful_uploads}/{total_ingredients} ingredients.")
    print(f"Total unique ingredients in map: {len(ingredient_map)}")
    return ingredient_map

def process_single_dish(args):
    index, row, photos_df, plat_ingredient_df, ingredient_map, total_dishes = args
    code = row['code_plat']
    
    # Print progress periodically
    if index % 10 == 0:
        print(f"Processing dish {index+1}/{total_dishes}: {code}")

    try:
        dish_data = {
            'code': code,
            'nom': row['nom_plat'],
            'autre_nom': row['autre_nom'],
            'description': row['description '],
            'origine': row['origine'],
            'imageUrls': [],
            'ingredients': [],
            'createdAt': firestore.SERVER_TIMESTAMP
        }

        # Find and upload dish photos
        dish_photos_from_sheet = photos_df[photos_df['code'] == code]
        image_paths = []
        for _, photo_row in dish_photos_from_sheet.iterrows():
            if photo_row['Unnamed: 2'] and isinstance(photo_row['Unnamed: 2'], str) and photo_row['Unnamed: 2'].strip():
                image_path = os.path.join(IMAGE_DIR, photo_row['Unnamed: 2'].replace('IMAGE/', ''))
                image_paths.append(image_path)
        
        for image_path in image_paths:
            image_url = upload_image(image_path, 'plats')
            if image_url:
                dish_data['imageUrls'].append(image_url)
                # print(f"Added image URL for dish {code}: {image_url}")

        # Find dish ingredients
        dish_ingredients_from_sheet = plat_ingredient_df[plat_ingredient_df['code_plat'] == code]
        for _, ingredient_row in dish_ingredients_from_sheet.iterrows():
            ingredient_code = ingredient_row['code_ingredient']
            if ingredient_code in ingredient_map: # Ensure ingredient was successfully processed/exists
                ingredient_ref_data = {
                    'code': ingredient_code,
                    'quantite': ingredient_row['quantite'],
                    'unite': ingredient_row['unite'],
                    'commentaire': ingredient_row['commentaire']
                }
                dish_data['ingredients'].append(ingredient_ref_data)
            else:
                print(f"Warning: Ingredient {ingredient_code} for dish {code} not found in ingredient_map. Skipping this ingredient linkage.")

        # Create dish document reference and set data
        doc_ref = db.collection('plats').document(code)
        doc_ref.set(dish_data)
        print(f"Dish {code} - {row['nom_plat']} uploaded with {len(dish_data['imageUrls'])} images and {len(dish_data['ingredients'])} ingredients.")

        # Mark as processed and save progress
        with progress_lock:
            processed_dishes_set.add(code)
            save_progress()
        return code # Return code for tracking

    except Exception as e:
        print(f"Error processing dish {code}: {e}")
        # import traceback
        # traceback.print_exc()
        return None # Indicate failure

def upload_dishes(plats_df, photos_df, plat_ingredient_df, ingredient_map, test_mode=False, num_threads=4):
    """Upload all dishes to Firestore using multiple threads."""
    total_dishes = len(plats_df)
    
    if test_mode:
        # For test mode, limit to first 5 dishes
        plats_df = plats_df.head(5)
        total_dishes = 5
    
    print(f"Preparing to upload {total_dishes} dishes to Firestore using {num_threads} threads...")
    
    # Prepare arguments for each dish processing
    tasks = []
    for index, (_, row) in enumerate(plats_df.iterrows()):
        tasks.append((index, row, photos_df, plat_ingredient_df, ingredient_map, total_dishes))

    successful_uploads = 0
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        future_to_dish = {executor.submit(process_single_dish, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_to_dish):
            dish_code = future.result()
            if dish_code:
                successful_uploads += 1
                # No map needed here unless we need to pass dish IDs elsewhere

    print(f"Successfully processed {successful_uploads}/{total_dishes} dishes.")
    return successful_uploads # Return count of successfully processed dishes

def create_public_dishes_from_excel(plats_df, photos_df, test_mode=False):
    """Create public dishes collection directly from Excel data with images."""
    print("Creating public dishes collection directly from Excel...")
    
    # Process only a subset in test mode
    if test_mode:
        plats_df = plats_df.head(5)
    
    total_plats = len(plats_df)
    print(f"Processing {total_plats} dishes for public dishes collection")
    
    # Create public_plats collection
    public_plats_ref = db.collection('public_plats')
    
    count = 0
    for index, row in plats_df.iterrows():
        # Show progress every 10 dishes
        if count % 10 == 0:
            print(f"Processing public dish {count + 1}/{total_plats}")
        
        code = row['code_plat']
        if not code or not isinstance(code, str):
            print(f"Skipping row {index} with invalid code: {code}")
            continue
        
        # Prepare dish data
        public_dish_data = {
            'code': code,
            'nom': row['nom_plat'] if isinstance(row.get('nom_plat'), str) else '',
            'autre_nom': row['autre_nom'] if isinstance(row.get('autre_nom'), str) else '',
            'description': row['description '] if isinstance(row.get('description '), str) else '',
            'origine': row['origine'] if isinstance(row.get('origine'), str) else '',
            'imageUrls': [],
            'ingredients': [],
            'createdAt': firestore.SERVER_TIMESTAMP
        }
        
        # Find and upload dish photos
        dish_photos_from_sheet = photos_df[photos_df['code'] == code]
        image_paths = []
        for _, photo_row in dish_photos_from_sheet.iterrows():
            if photo_row.get('Unnamed: 2') and isinstance(photo_row['Unnamed: 2'], str) and photo_row['Unnamed: 2'].strip():
                # Make sure it's pointing to a Plats image, not an Ingredients directory
                if 'Ingredients' not in photo_row['Unnamed: 2']:
                    image_path = os.path.join(IMAGE_DIR, photo_row['Unnamed: 2'].replace('IMAGE/', ''))
                    # Only include actual files, not directories
                    if os.path.isfile(image_path):
                        image_paths.append(image_path)
                    else:
                        print(f"Skipping path that is not a file: {image_path}")
        
        # Upload images to Firebase Storage directly to public_plats folder
        for image_path in image_paths:
            try:
                image_url = upload_image(image_path, 'public_plats')
                if image_url:
                    public_dish_data['imageUrls'].append(image_url)
                    print(f"Added image URL for public dish {code}: {image_url}")
            except Exception as e:
                print(f"Error uploading image {image_path}: {e}")
        
        try:
            # Add to public_plats collection
            public_plats_ref.document(code).set(public_dish_data)
            count += 1
            print(f"Public dish {code} - {public_dish_data['nom']} created with {len(public_dish_data['imageUrls'])} images")
        except Exception as e:
            print(f"Error creating public dish {code}: {e}")
            
    print(f"Public dishes collection created with {count} dishes.")
    return True
    
    print(f"Public dishes collection created with {count} dishes.")
    return True

# Commenting out the old function that reads from plats collection
# def create_public_dishes_collection(test_mode=False):
#     """Create a public dishes collection that all users can access."""
#     print("Creating public dishes collection...")
#     
#     # Get all dishes from the plats collection
#     plats_ref = db.collection('plats')
#     if test_mode:
#         # In test mode, only get a few dishes
#         plats = [doc for doc in plats_ref.limit(5).stream()]
#     else:
#         plats = [doc for doc in plats_ref.stream()]
#     
#     total_plats = len(plats)
#     print(f"Found {total_plats} dishes in the plats collection")
#     
#     # Create public_plats collection with the same content
#     public_plats_ref = db.collection('public_plats')
#     
#     count = 0
#     for plat in plats:
#         # Show progress every 10 dishes
#         if count % 10 == 0 or count == total_plats - 1:
#             print(f"Processing public dish {count + 1}/{total_plats}")
#         
#         plat_id = plat.id
#         plat_data = plat.to_dict()
#         public_dish_data = {
#             'code': plat_data.get('code'),
#             'nom': plat_data.get('nom'),
#             'autre_nom': plat_data.get('autre_nom'),
#             'description': plat_data.get('description'),
#             'origine': plat_data.get('origine'),
#             'imageUrls': plat_data.get('imageUrls', []),
#             'ingredients': plat_data.get('ingredients', []),
#             'createdAt': plat_data.get('createdAt', firestore.SERVER_TIMESTAMP)
#         }
#         
#         # Add to public_plats collection
#         public_plats_ref.document(plat_id).set(public_dish_data)
#         count += 1
#     print(f"Public dishes collection created with {count} dishes.")
#     return True

def delete_test_data():
    """Delete test data from Firestore."""
    try:
        print("Deleting test data from Firestore...")
        
        # Delete ingredients
        ingredients_ref = db.collection('ingredients')
        ingredients = ingredients_ref.limit(10).stream()
        for ingredient in ingredients:
            ingredient.reference.delete()
            print(f"Deleted ingredient {ingredient.id}")
        
        # Delete dishes
        dishes_ref = db.collection('plats')
        dishes = dishes_ref.limit(10).stream()
        for dish in dishes:
            dish.reference.delete()
            print(f"Deleted dish {dish.id}")
        
        # Delete public dishes
        public_dishes_ref = db.collection('public_plats')
        public_dishes = public_dishes_ref.limit(10).stream()
        for dish in public_dishes:
            dish.reference.delete()
            print(f"Deleted public dish {dish.id}")
            
        print("Test data deleted successfully")
        return True
    except Exception as e:
        print(f"Error deleting test data: {e}")
        return False

def load_progress():
    print("No progress tracking needed, running a fresh upload.")
    return

def save_progress():
    return

def main():
    """Main function to execute the script."""
    print("Excel to Firebase Uploader")
    print("="*25)
    print("PUBLIC DISHES UPLOAD ONLY MODE")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Upload Excel data to Firebase')
    parser.add_argument('--test', action='store_true', help='Test mode: only upload/process first 5 entries from each relevant table section')
    parser.add_argument('--delete-test', action='store_true', help='Delete test data (first 5 entries) before uploading')
    parser.add_argument('--num-threads', type=int, default=4, help='Number of threads for uploading (default: 4)')
    args = parser.parse_args()
    test_mode = args.test
    delete_test = args.delete_test
    num_threads = args.num_threads

    print(f"Running with Test Mode: {test_mode}, Delete Test Data: {delete_test}, Threads: {num_threads}")

    # Initialize Firebase Admin SDK
    if not firebase_admin._apps:
        cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
        firebase_admin.initialize_app(cred, {
            'storageBucket': BUCKET_NAME
        })
    global db, bucket
    db = firestore.client()
    bucket = storage.bucket()

    if delete_test:
        print("Deleting test data (first 5 entries)...")
        # Only delete public_plats since we're only focusing on public dishes
        delete_all_data(collection_name='public_plats', test_mode=True)
        global uploaded_images
        with image_upload_lock: 
            uploaded_images.clear()
        print("Test data deleted and image cache cleared.")

    # Read data from Excel
    data_frames = read_excel_data(EXCEL_FILE_PATH)
    if not data_frames:
        print("Failed to read Excel data. Exiting.")
        return

    plats_df = data_frames['plat']
    photos_df = data_frames['photos']

    print(f"Found {len(plats_df)} dishes in Excel.")
    print("SKIPPING INGREDIENTS UPLOAD as requested")
    print("SKIPPING REGULAR DISHES UPLOAD as requested")
    
    # Create public dishes collection directly from Excel data
    print("--- Starting Public Dishes Collection Creation ---")
    create_public_dishes_from_excel(plats_df, photos_df, test_mode=test_mode)
    print("--- Public Dishes Collection Creation Finished ---")

    print("Firebase data upload process completed.")
    if test_mode:
        print("Public dishes upload completed successfully!")
    else:
        print("Full public dishes upload completed successfully!")

if __name__ == "__main__":
    main()
