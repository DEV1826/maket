#!/usr/bin/env python3
import pandas as pd
import firebase_admin
from firebase_admin import credentials, firestore, storage
import os
import argparse
import time
import concurrent.futures
import threading
import json
import sys

# Constants
SERVICE_ACCOUNT_FILE = 'market-c0fa5-firebase-adminsdk-fbsvc-d42907b0fd.json'
BUCKET_NAME = 'market-c0fa5.appspot.com'
EXCEL_FILE_PATH = '../VBA B1 FINAL/B1 REPAS FINAL.xlsm'
IMAGE_DIR = '../VBA B1 FINAL/IMAGE'

# Global variables
db = None
bucket = None
uploaded_images = {}  # Cache to avoid re-uploading the same image
image_upload_lock = threading.Lock()
progress_lock = threading.Lock()
progress_counter = {"current": 0, "total": 0, "last_percent": -1}

def setup_firebase():
    """Initialize Firebase app with the service account key file."""
    try:
        if not firebase_admin._apps:
            cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
            firebase_admin.initialize_app(cred, {
                'storageBucket': BUCKET_NAME
            })
        global db, bucket
        db = firestore.client()
        bucket = storage.bucket()
        return True
    except Exception as e:
        print(f"Error setting up Firebase: {e}")
        return False

def upload_image(image_path, destination_folder):
    """Upload an image to Firebase Storage and return the public URL."""
    global uploaded_images
    
    # Check if we've already uploaded this image (thread-safe)
    with image_upload_lock:
        if image_path in uploaded_images:
            return uploaded_images[image_path]
    
    try:
        # Make sure the file exists
        full_path = os.path.abspath(image_path)
        if not os.path.exists(full_path):
            # Try to find the image with case-insensitive search
            dir_path = os.path.dirname(full_path)
            filename = os.path.basename(full_path)
            
            if os.path.exists(dir_path):
                # List all files in the directory
                files = os.listdir(dir_path)
                
                # Try to find a case-insensitive match
                for file in files:
                    if file.lower() == filename.lower():
                        full_path = os.path.join(dir_path, file)
                        break
            
            # If still not found
            if not os.path.exists(full_path):
                return None
        
        # Upload to Firebase Storage with timestamp to avoid overwriting
        filename = os.path.basename(full_path)
        name_part, ext_part = os.path.splitext(filename)
        timestamp = int(time.time())
        destination_path = f"{destination_folder}/{name_part}_{timestamp}{ext_part}"
        
        blob = bucket.blob(destination_path)
        blob.upload_from_filename(full_path)
        blob.make_public()
        
        # Cache the URL (thread-safe)
        with image_upload_lock:
            uploaded_images[image_path] = blob.public_url
        
        return blob.public_url
    except Exception as e:
        print(f"Error uploading image {image_path}: {e}")
        return None

def read_excel_data(file_path):
    """Read Excel data and return a dictionary with all necessary dataframes."""
    try:
        # Read Excel sheets with the correct names from the file
        ingredients_df = pd.read_excel(file_path, sheet_name='ingredient')
        plats_df = pd.read_excel(file_path, sheet_name='plat')
        plat_ingredient_df = pd.read_excel(file_path, sheet_name='plat_ingredient')
        photos_df = pd.read_excel(file_path, sheet_name='photos')
        
        # Return with consistent keys for the rest of the script
        return {
            'BDD INGREDIENTS': ingredients_df,
            'BDD PLATS': plats_df,
            'PLATS_INGREDIENTS': plat_ingredient_df,
            'PHOTOS': photos_df
        }
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return None

def update_progress():
    """Print progress message showing current count and total."""
    with progress_lock:
        current = progress_counter["current"]
        total = progress_counter["total"]
        
        # Print only at certain intervals (every 10% but without showing percentage)
        milestone = total // 10 if total > 10 else 1
        if current % milestone == 0 or current == total:
            print(f"Processing: {current}/{total}")

def increment_progress():
    """Thread-safe increment of progress counter."""
    with progress_lock:
        progress_counter["current"] += 1
        update_progress()

def process_single_ingredient(args):
    index, row, photos_df = args
    code = row['code_ingredient']

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
        
        # Find ingredient photos - check all possible paths
        image_paths = []
        
        # 1. Check direct paths in the ingredients sheet
        if pd.notna(row.get('chemin_photo_1')) and isinstance(row['chemin_photo_1'], str) and row['chemin_photo_1'].strip():
            image_path = os.path.join(IMAGE_DIR, row['chemin_photo_1'].replace('IMAGE/', ''))
            image_paths.append(image_path)
        
        if pd.notna(row.get('chemin_photo_2')) and isinstance(row['chemin_photo_2'], str) and row['chemin_photo_2'].strip():
            image_path = os.path.join(IMAGE_DIR, row['chemin_photo_2'].replace('IMAGE/', ''))
            image_paths.append(image_path)
        
        # 2. Check in the photos sheet if provided
        if photos_df is not None:
            ingredient_photos = photos_df[photos_df['code'] == code]
            for _, photo_row in ingredient_photos.iterrows():
                if pd.notna(photo_row.get('Unnamed: 2')) and photo_row['Unnamed: 2'].strip():
                    image_path = os.path.join(IMAGE_DIR, photo_row['Unnamed: 2'].replace('IMAGE/', ''))
                    image_paths.append(image_path)
        
        # 3. Try a default pattern based on ingredient code if no images were found
        if not image_paths:
            possible_patterns = [
                f"{IMAGE_DIR}/Ingredients/{code}.jpg",
                f"{IMAGE_DIR}/Ingredients/{code.lower()}.jpg",
                f"{IMAGE_DIR}/Ingredients/INGREDIENT{code[1:]}.jpg",
                f"{IMAGE_DIR}/Ingredients/ingredient{code[1:]}.jpg",
            ]
            
            for pattern in possible_patterns:
                abs_pattern_path = os.path.abspath(pattern)
                if os.path.exists(abs_pattern_path):
                    image_paths.append(abs_pattern_path)
                    break
        
        # Upload each image and save its URL
        for image_path in image_paths:
            image_url = upload_image(image_path, 'ingredients')
            if image_url:
                ingredient_data['imageUrls'].append(image_url)
        
        # Upload to Firestore
        doc_ref = db.collection('ingredients').document(code)
        doc_ref.set(ingredient_data)
        
        increment_progress()  # Update progress
        return code  # Return code for ingredient_map
    
    except Exception as e:
        increment_progress()  # Still increment progress even on error
        return None  # Indicate failure

def process_single_dish(args):
    index, row, photos_df, plat_ingredient_df, ingredient_map = args
    code = row['code_plat']

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
        dish_photos = photos_df[photos_df['code'] == code]
        image_paths = []
        
        # Collect all valid image paths
        for _, photo_row in dish_photos.iterrows():
            if photo_row['Unnamed: 2'] and isinstance(photo_row['Unnamed: 2'], str) and photo_row['Unnamed: 2'].strip():
                image_path = os.path.join(IMAGE_DIR, photo_row['Unnamed: 2'].replace('IMAGE/', ''))
                image_paths.append(image_path)
        
        # Upload each image and collect URLs
        for image_path in image_paths:
            image_url = upload_image(image_path, 'plats')
            if image_url:
                dish_data['imageUrls'].append(image_url)
        
        # Find dish ingredients
        dish_ingredients = plat_ingredient_df[plat_ingredient_df['code_plat'] == code]
        for _, ingredient_row in dish_ingredients.iterrows():
            ingredient_code = ingredient_row['code_ingredient']
            if ingredient_code in ingredient_map:
                ingredient_ref_data = {
                    'code': ingredient_code,
                    'quantite': ingredient_row['quantite'],
                    'unite': ingredient_row['unite'],
                    'commentaire': ingredient_row['commentaire']
                }
                dish_data['ingredients'].append(ingredient_ref_data)

        doc_ref = db.collection('plats').document(code)
        doc_ref.set(dish_data)
        
        increment_progress()  # Update progress
        return code  # Return code for tracking

    except Exception as e:
        increment_progress()  # Still increment progress even on error
        return None  # Indicate failure

def upload_ingredients(ingredients_df, photos_df, num_threads=4, test_mode=False):
    """Upload all ingredients to Firestore using multiple threads and return a mapping of ingredient codes to their IDs."""
    ingredient_map = {}
    
    # If in test mode, only use the first 5 ingredients
    ingredients_to_process_df = ingredients_df
    if test_mode and len(ingredients_df) > 5:
        print("TEST MODE: Limiting to first 5 ingredients")
        ingredients_to_process_df = ingredients_df.head(5)
    
    tasks = []
    total_to_process = len(ingredients_to_process_df)
    
    # Set up progress counter
    with progress_lock:
        progress_counter["current"] = 0
        progress_counter["total"] = total_to_process
        progress_counter["last_percent"] = -1
    
    print(f"Starting upload of {total_to_process} ingredients using {num_threads} threads...")
    
    # Create tasks for each ingredient
    for index, row in ingredients_to_process_df.iterrows():
        task_index = ingredients_to_process_df.index.get_loc(index)
        tasks.append((task_index, row, photos_df))
    
    successful_uploads = 0
    print("Starting ingredient upload...")
    update_progress()  # Initialize progress bar
    
    # Process ingredients using thread pool
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        future_to_ingredient = {executor.submit(process_single_ingredient, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_to_ingredient):
            ingredient_code = future.result()
            if ingredient_code:
                ingredient_map[ingredient_code] = ingredient_code
                successful_uploads += 1
    
    print(f"\nSuccessfully processed {successful_uploads}/{total_to_process} ingredients.")
    return ingredient_map

def upload_dishes(plats_df, photos_df, plat_ingredient_df, ingredient_map, num_threads=4, test_mode=False):
    """Upload all dishes to Firestore using multiple threads."""
    
    # If in test mode, only use the first 5 dishes
    dishes_to_process_df = plats_df
    if test_mode and len(plats_df) > 5:
        print("TEST MODE: Limiting to first 5 dishes")
        dishes_to_process_df = plats_df.head(5)
    
    tasks = []
    total_to_process = len(dishes_to_process_df)
    
    # Set up progress counter
    with progress_lock:
        progress_counter["current"] = 0
        progress_counter["total"] = total_to_process
        progress_counter["last_percent"] = -1
    
    print(f"Starting upload of {total_to_process} dishes using {num_threads} threads...")
    
    # Create tasks for each dish
    for index, row in dishes_to_process_df.iterrows():
        task_index = dishes_to_process_df.index.get_loc(index)
        tasks.append((task_index, row, photos_df, plat_ingredient_df, ingredient_map))
    
    successful_uploads = 0
    print("Starting dish upload...")
    update_progress()  # Initialize progress bar
    
    # Process dishes using thread pool
    with concurrent.futures.ThreadPoolExecutor(max_workers=num_threads) as executor:
        future_to_dish = {executor.submit(process_single_dish, task): task for task in tasks}
        for future in concurrent.futures.as_completed(future_to_dish):
            dish_code = future.result()
            if dish_code:
                successful_uploads += 1
    
    print(f"\nSuccessfully processed {successful_uploads}/{total_to_process} dishes.")
    return successful_uploads

def create_public_dishes_collection(test_mode=False):
    """Create a public dishes collection that all users can access."""
    print("Creating public dishes collection...")
    plats_ref = db.collection('plats')
    public_plats_ref = db.collection('public_plats')
    
    # Get all dishes (or first 5 in test mode)
    if test_mode:
        query = plats_ref.limit(5)
        print("TEST MODE: Only creating the first 5 public dishes")
    else:
        query = plats_ref
    
    dishes = list(query.stream())
    total_dishes = len(dishes)
    
    # Set up progress counter
    with progress_lock:
        progress_counter["current"] = 0
        progress_counter["total"] = total_dishes
        progress_counter["last_percent"] = -1
    
    print(f"Preparing to process {total_dishes} dishes for public collection...")
    update_progress()  # Initialize progress bar
    
    processed_count = 0
    created_count = 0
    
    for dish_doc in dishes:
        try:
            dish_id = dish_doc.id
            dish_data = dish_doc.to_dict()
            
            public_dish_data = {
                'code': dish_data.get('code'),
                'nom': dish_data.get('nom'),
                'autre_nom': dish_data.get('autre_nom'),
                'description': dish_data.get('description'),
                'origine': dish_data.get('origine'),
                'imageUrls': dish_data.get('imageUrls', []),
                'createdAt': dish_data.get('createdAt', firestore.SERVER_TIMESTAMP)
            }
            
            public_plats_ref.document(dish_id).set(public_dish_data)
            created_count += 1
            
        except Exception as e:
            print(f"Error creating public dish for {dish_doc.id}: {e}")
        
        processed_count += 1
        increment_progress()  # Update progress
    
    print(f"\nProcessed {processed_count} dishes for public_plats collection. Created {created_count} entries.")
    return True

def delete_collection(collection_name, batch_size=500):
    """Delete an entire collection from Firestore in batches to avoid out-of-memory errors."""
    print(f"Deleting collection: {collection_name}...")
    coll_ref = db.collection(collection_name)
    docs = list(coll_ref.limit(batch_size).stream())
    deleted = 0
    
    # Set up progress counter for deletion
    total_docs = len(docs)
    if total_docs == 0:
        print(f"No documents found in {collection_name}. Collection may be empty.")
        return 0
    
    with progress_lock:
        progress_counter["current"] = 0
        progress_counter["total"] = total_docs
        progress_counter["last_percent"] = -1
    
    print(f"Starting deletion of {total_docs} documents from {collection_name}...")
    update_progress()
    
    while docs:
        for doc in docs:
            try:
                doc.reference.delete()
                deleted += 1
                increment_progress()
            except Exception as e:
                print(f"Error deleting document {doc.id}: {e}")
                increment_progress()
        
        # Get next batch
        docs = list(coll_ref.limit(batch_size).stream())
        
        if docs:
            # Update progress for the next batch
            with progress_lock:
                progress_counter["current"] = 0
                progress_counter["total"] = len(docs)
                progress_counter["last_percent"] = -1
            update_progress()
    
    print(f"\nDeleted {deleted} documents from {collection_name}")
    return deleted

def main():
    """Main function to execute the script."""
    print("Excel to Firebase Uploader with Progress Bar")
    print("===========================================")
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Upload Excel data to Firebase')
    parser.add_argument('--test', action='store_true', help='Test mode: only upload first 5 entries from each table')
    parser.add_argument('--num-threads', type=int, default=4, help='Number of threads for uploading (default: 4)')
    parser.add_argument('--clear-collections', action='store_true', help='Clear ingredients and public_plats collections before uploading')
    args = parser.parse_args()
    
    test_mode = args.test
    num_threads = args.num_threads
    clear_collections = args.clear_collections
    
    print(f"Running with settings: Test Mode: {test_mode}, Threads: {num_threads}, Clear Collections: {clear_collections}")
    
    # Initialize Firebase
    if not setup_firebase():
        print("Failed to initialize Firebase. Please check your service account key file.")
        return
    
    if clear_collections:
        delete_collection('ingredients')
        delete_collection('public_plats')
    
    # Read Excel data
    data_frames = read_excel_data(EXCEL_FILE_PATH)
    if not data_frames:
        print("Failed to read Excel data.")
        return
    
    # Upload ingredients first, then dishes
    print("\n--- STEP 1: Uploading Ingredients ---")
    ingredient_map = upload_ingredients(
        data_frames['BDD INGREDIENTS'], 
        data_frames['PHOTOS'],
        num_threads=num_threads,
        test_mode=test_mode
    )
    
    print("\n--- STEP 2: Uploading Dishes ---")
    upload_dishes(
        data_frames['BDD PLATS'],
        data_frames['PHOTOS'],
        data_frames['PLATS_INGREDIENTS'],
        ingredient_map,
        num_threads=num_threads,
        test_mode=test_mode
    )
    
    print("\n--- STEP 3: Creating Public Dishes Collection ---")
    create_public_dishes_collection(test_mode=test_mode)
    
    print("\nFirebase data upload process completed successfully!")

if __name__ == '__main__':
    main()
