#!/usr/bin/env python3
"""
Firebase Users Structure Explorer

This script focuses specifically on finding user data in your Firebase database,
even if the main users collection appears empty.
"""

import os
import sys
import json
import firebase_admin
from firebase_admin import credentials, firestore, auth
from datetime import datetime

# Constants
SERVICE_ACCOUNT_FILE = 'market-c0fa5-firebase-adminsdk-fbsvc-d42907b0fd.json'

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    try:
        # Check if app is already initialized
        try:
            return firebase_admin.get_app()
        except ValueError:
            # Not initialized, so initialize
            cred = credentials.Certificate(SERVICE_ACCOUNT_FILE)
            firebase_admin.initialize_app(cred)
            print("Successfully connected to Firebase")
            return firebase_admin.get_app()
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

def find_user_ids_from_references(db):
    """Find potential user IDs from documents that reference users."""
    user_ids = set()
    
    try:
        # Check shopping lists for owner IDs
        shopping_lists = db.collection('shoppingLists').limit(50).stream()
        for doc in shopping_lists:
            data = doc.to_dict()
            if 'ownerId' in data:
                user_ids.add(data['ownerId'])
            if 'sharedWith' in data and isinstance(data['sharedWith'], list):
                for user_id in data['sharedWith']:
                    if user_id:
                        user_ids.add(user_id)
                        
        # Check public_plats for user references
        plats = db.collection('public_plats').limit(50).stream()
        for doc in plats:
            data = doc.to_dict()
            if 'userId' in data:
                user_ids.add(data['userId'])
                
        print(f"Found {len(user_ids)} potential user IDs from references")
        return list(user_ids)
    except Exception as e:
        print(f"Error finding user IDs from references: {e}")
        return []

def explore_user_document(db, user_id):
    """Explore a specific user document and its subcollections."""
    result = {
        "profile": None,
        "subcollections": {}
    }
    
    try:
        # Check if user document exists
        user_doc = db.collection('users').document(user_id).get()
        if user_doc.exists:
            result["profile"] = user_doc.to_dict()
            print(f"Found user document for {user_id}")
        else:
            print(f"No main document found for user {user_id}")
            
        # Check for common subcollections
        potential_subcollections = [
            'plats', 'ingredients', 'weeklyMeals', 'shoppingLists',
            'profile', 'settings', 'stock'
        ]
        
        for subcol_name in potential_subcollections:
            subcol_ref = db.collection('users').document(user_id).collection(subcol_name)
            try:
                docs = list(subcol_ref.limit(5).stream())
                if docs:
                    print(f"Found {len(docs)} documents in users/{user_id}/{subcol_name}")
                    result["subcollections"][subcol_name] = {}
                    
                    for doc in docs:
                        result["subcollections"][subcol_name][doc.id] = doc.to_dict()
                        
                        # Check for nested subcollections (2 levels max for performance)
                        nested_subcols = list(doc.reference.collections())
                        if nested_subcols:
                            result["subcollections"][subcol_name][doc.id]["__subcollections__"] = {}
                            for nested_subcol in nested_subcols:
                                nested_name = nested_subcol.id
                                nested_docs = list(nested_subcol.limit(3).stream())
                                if nested_docs:
                                    result["subcollections"][subcol_name][doc.id]["__subcollections__"][nested_name] = {}
                                    for nested_doc in nested_docs:
                                        result["subcollections"][subcol_name][doc.id]["__subcollections__"][nested_name][nested_doc.id] = nested_doc.to_dict()
            except Exception as e:
                print(f"Error exploring subcollection {subcol_name} for user {user_id}: {e}")
                
        return result
    except Exception as e:
        print(f"Error exploring user {user_id}: {e}")
        return result

def explore_all_user_paths(db):
    """Look for user data in all possible locations in the database."""
    results = {
        "users_collection": {},
        "user_references": {},
        "potential_user_ids": []
    }
    
    try:
        # 1. First check the main users collection
        print("Checking main users collection...")
        users_ref = db.collection('users')
        users = list(users_ref.limit(50).stream())
        
        if not users:
            print("Main users collection is empty or doesn't exist")
        else:
            print(f"Found {len(users)} documents in main users collection")
            for user in users:
                results["users_collection"][user.id] = user.to_dict()
        
        # 2. Find potential user IDs from references
        user_ids = find_user_ids_from_references(db)
        results["potential_user_ids"] = user_ids
        
        # 3. For each user ID, explore the user document and subcollections
        print(f"Exploring {len(user_ids)} potential user documents...")
        for user_id in user_ids:
            print(f"Checking user ID: {user_id}")
            user_data = explore_user_document(db, user_id)
            results["user_references"][user_id] = user_data
            
        return results
    except Exception as e:
        print(f"Error exploring user paths: {e}")
        return results

def try_list_firebase_users():
    """Attempt to list Firebase Authentication users if permissions allow."""
    try:
        print("Attempting to list Firebase Authentication users...")
        # This requires additional permissions and might not work with your service account
        page = auth.list_users()
        users = []
        
        for user in page.users:
            user_info = {
                "uid": user.uid,
                "email": user.email,
                "display_name": user.display_name,
                "phone_number": user.phone_number,
                "provider_data": [{"provider_id": provider.provider_id} for provider in user.provider_data]
            }
            users.append(user_info)
            
        print(f"Found {len(users)} authentication users")
        return users
    except Exception as e:
        print(f"Cannot list authentication users: {e}")
        print("This is normal - your service account likely doesn't have permissions for this.")
        return []

def try_alternative_user_paths(db):
    """Check for user data in non-standard collections."""
    results = {}
    
    potential_collections = [
        'accounts', 'profiles', 'userProfiles', 'user_profiles', 'userdata', 'user_data'
    ]
    
    for collection_name in potential_collections:
        try:
            col_ref = db.collection(collection_name)
            docs = list(col_ref.limit(5).stream())
            if docs:
                print(f"Found {len(docs)} documents in alternative collection: {collection_name}")
                results[collection_name] = {}
                for doc in docs:
                    results[collection_name][doc.id] = doc.to_dict()
        except Exception as e:
            # Silently continue on errors
            pass
            
    return results

def main():
    # Initialize Firebase
    app = initialize_firebase()
    if not app:
        print("Failed to initialize Firebase.")
        return 1
        
    db = firestore.client()
    
    results = {
        "timestamp": str(datetime.now()),
        "auth_users": [],
        "firestore_users": {},
        "alternative_paths": {}
    }
    
    # Try to list auth users
    results["auth_users"] = try_list_firebase_users()
    
    # Explore all user data in Firestore
    results["firestore_users"] = explore_all_user_paths(db)
    
    # Try alternative paths
    results["alternative_paths"] = try_alternative_user_paths(db)
    
    # Write results to files
    json_file = "firebase_users_structure.json"
    with open(json_file, "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, default=str)
    print(f"Full user data written to {json_file}")
    
    # Create a more readable text summary
    txt_file = "firebase_users_summary.txt"
    with open(txt_file, "w", encoding="utf-8") as f:
        f.write(f"Firebase Users Structure Summary - {datetime.now()}\n\n")
        
        # Auth users
        f.write("FIREBASE AUTHENTICATION USERS:\n")
        if results["auth_users"]:
            for user in results["auth_users"]:
                f.write(f"• User ID: {user.get('uid', 'unknown')}\n")
                f.write(f"  Email: {user.get('email', 'not set')}\n")
                f.write(f"  Display Name: {user.get('display_name', 'not set')}\n")
                f.write("\n")
        else:
            f.write("No authentication users found or insufficient permissions.\n\n")
        
        # Main users collection
        f.write("FIRESTORE USERS COLLECTION:\n")
        users_collection = results["firestore_users"].get("users_collection", {})
        if users_collection:
            for user_id, user_data in users_collection.items():
                f.write(f"• User ID: {user_id}\n")
                for key, value in user_data.items():
                    f.write(f"  {key}: {value}\n")
                f.write("\n")
        else:
            f.write("Main users collection is empty or doesn't exist.\n\n")
        
        # Potential user IDs
        f.write("POTENTIAL USER IDs FOUND IN OTHER COLLECTIONS:\n")
        user_ids = results["firestore_users"].get("potential_user_ids", [])
        if user_ids:
            for user_id in user_ids:
                f.write(f"• {user_id}\n")
        else:
            f.write("No potential user IDs found in other collections.\n")
        f.write("\n")
        
        # User subcollections
        f.write("USER SUBCOLLECTIONS:\n")
        user_references = results["firestore_users"].get("user_references", {})
        if user_references:
            for user_id, user_data in user_references.items():
                f.write(f"• User ID: {user_id}\n")
                
                # Profile data
                profile = user_data.get("profile")
                if profile:
                    f.write("  Profile data:\n")
                    for key, value in profile.items():
                        f.write(f"    {key}: {value}\n")
                    f.write("\n")
                    
                # Subcollections
                subcollections = user_data.get("subcollections", {})
                if subcollections:
                    f.write("  Subcollections:\n")
                    for subcol_name, subcol_data in subcollections.items():
                        f.write(f"    - {subcol_name}: {len(subcol_data)} documents\n")
                        
                        # Show sample document
                        if subcol_data:
                            sample_doc_id = next(iter(subcol_data))
                            sample_doc = subcol_data[sample_doc_id]
                            f.write(f"      Sample document ({sample_doc_id}):\n")
                            
                            # Show fields excluding nested subcollections
                            for key, value in sample_doc.items():
                                if key != "__subcollections__":
                                    f.write(f"        {key}: {value}\n")
                                    
                            # Show nested subcollections if any
                            if "__subcollections__" in sample_doc:
                                f.write("        Nested subcollections:\n")
                                for nested_name in sample_doc["__subcollections__"]:
                                    f.write(f"          - {nested_name}\n")
                    f.write("\n")
                else:
                    f.write("  No subcollections found.\n\n")
        else:
            f.write("No user subcollections found.\n\n")
            
        # Alternative paths
        f.write("ALTERNATIVE USER COLLECTIONS:\n")
        alt_paths = results["alternative_paths"]
        if alt_paths:
            for col_name, col_data in alt_paths.items():
                f.write(f"• Collection: {col_name} ({len(col_data)} documents)\n")
        else:
            f.write("No alternative user collections found.\n")
    
    print(f"User summary written to {txt_file}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
