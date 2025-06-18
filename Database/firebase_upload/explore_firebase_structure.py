#!/usr/bin/env python3
"""
Firebase Database Structure Explorer

This script connects to your Firebase Firestore database using your existing
service account credentials and recursively explores the database structure,
generating a complete hierarchical representation of all collections and documents.
"""

import os
import sys
import firebase_admin
from firebase_admin import credentials, firestore
import json
from datetime import datetime
import argparse

# Constants from your existing code
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

def get_field_description(value):
    """Get a readable description of a field value."""
    if value is None:
        return "null"
    
    if isinstance(value, (dict)):
        return f"Object with {len(value)} fields"
    elif isinstance(value, list):
        if not value:
            return "Empty array"
        return f"Array with {len(value)} items"
    elif isinstance(value, (int, float, bool)):
        return str(value)
    elif isinstance(value, str):
        if len(value) > 50:
            return f'"{value[:47]}..."'
        return f'"{value}"'
    elif hasattr(value, '__str__'):
        return str(value)
    else:
        return f"<{type(value).__name__}>"

def explore_collection(db, path, output_file, max_depth=5, current_depth=0):
    """Recursively explore a Firestore collection."""
    if current_depth >= max_depth:
        output_file.write(f"{'  ' * current_depth}[MAX DEPTH REACHED]\n")
        return

    try:
        # Get collection reference
        col_ref = db.collection(path)
        documents = list(col_ref.limit(25).stream())  # Limit to 25 docs to prevent huge dumps
        
        if not documents:
            output_file.write(f"{'  ' * current_depth}Collection '{path}': [EMPTY]\n")
            return
            
        output_file.write(f"{'  ' * current_depth}Collection '{path}': {len(documents)} documents (showing max 25)\n")
        
        # Process each document
        for doc in documents:
            doc_data = doc.to_dict()
            output_file.write(f"{'  ' * (current_depth + 1)}Document '{doc.id}':\n")
            
            # Process document fields
            for field_name, field_value in doc_data.items():
                field_desc = get_field_description(field_value)
                output_file.write(f"{'  ' * (current_depth + 2)}{field_name}: {field_desc}\n")
            
            # Check for subcollections
            subcollections = doc.reference.collections()
            for subcol in subcollections:
                subcol_path = f"{path}/{doc.id}/{subcol.id}"
                explore_collection(db, subcol_path, output_file, max_depth, current_depth + 2)
                
    except Exception as e:
        output_file.write(f"{'  ' * current_depth}Error exploring '{path}': {str(e)}\n")

def list_all_root_collections(db, output_file):
    """List all root collections in the Firestore database."""
    try:
        collections = db.collections()
        output_file.write("Root Collections:\n")
        for col in collections:
            output_file.write(f"  {col.id}\n")
        return [col.id for col in collections]
    except Exception as e:
        output_file.write(f"Error listing root collections: {str(e)}\n")
        return []

def explore_specific_path(db, start_path, output_file, max_depth=5):
    """Explore a specific path in the Firestore database."""
    parts = start_path.strip('/').split('/')
    
    if len(parts) % 2 == 0:  # Document path
        # Get the parent collection path
        collection_path = '/'.join(parts[:-1])
        document_id = parts[-1]
        
        try:
            doc_ref = db.document(f"{collection_path}/{document_id}")
            doc = doc_ref.get()
            
            if not doc.exists:
                output_file.write(f"Document at path '{start_path}' does not exist.\n")
                return
                
            doc_data = doc.to_dict()
            output_file.write(f"Document '{document_id}' at path '{collection_path}':\n")
            
            # Process document fields
            for field_name, field_value in doc_data.items():
                field_desc = get_field_description(field_value)
                output_file.write(f"  {field_name}: {field_desc}\n")
                
            # Check for subcollections
            subcollections = doc_ref.collections()
            output_file.write(f"\nSubcollections of '{start_path}':\n")
            for subcol in subcollections:
                subcol_path = f"{start_path}/{subcol.id}"
                output_file.write(f"  {subcol.id}\n")
                explore_collection(db, subcol_path, output_file, max_depth, 1)
                
        except Exception as e:
            output_file.write(f"Error exploring document at '{start_path}': {str(e)}\n")
            
    else:  # Collection path
        explore_collection(db, start_path, output_file, max_depth)

def explore_users_collection(db, output_file, max_depth=5):
    """Special function to explore the users collection which is common in Firebase apps."""
    try:
        # Check if users collection exists
        users_ref = db.collection('users')
        users = list(users_ref.limit(10).stream())  # Get first 10 users
        
        if not users:
            output_file.write("Users collection exists but is empty.\n")
            return
            
        output_file.write(f"Found {len(users)} users (showing max 10):\n")
        
        # Process each user
        for user in users:
            output_file.write(f"  User ID: {user.id}\n")
            
            # Get user's subcollections
            subcollections = user.reference.collections()
            subcol_list = list(subcollections)
            
            if not subcol_list:
                output_file.write("    No subcollections found for this user.\n")
                continue
                
            output_file.write(f"    Subcollections for user {user.id}:\n")
            for subcol in subcol_list:
                output_file.write(f"      {subcol.id}\n")
                
                # Explore specific user subcollection
                explore_collection(db, f"users/{user.id}/{subcol.id}", output_file, max_depth, 3)
                
    except Exception as e:
        output_file.write(f"Error exploring users collection: {str(e)}\n")

def main():
    parser = argparse.ArgumentParser(description='Firebase Database Structure Explorer')
    parser.add_argument('--output', '-o', type=str, default='firebase_structure.txt', 
                        help='Output file path (default: firebase_structure.txt)')
    parser.add_argument('--max-depth', '-d', type=int, default=10,
                        help='Maximum depth to explore (default: 10)')
    parser.add_argument('--path', '-p', type=str, default=None,
                        help='Specific Firestore path to explore (default: explore entire database)')
    parser.add_argument('--users-only', '-u', action='store_true',
                        help='Only explore the users collection')
    
    args = parser.parse_args()
    
    # Initialize Firebase
    app = initialize_firebase()
    if not app:
        print("Failed to initialize Firebase. Check your credentials and network connection.")
        return
    
    db = firestore.client()
    output_path = args.output
    max_depth = args.max_depth
    
    try:
        with open(output_path, 'w', encoding='utf-8') as output_file:
            output_file.write(f"Firebase Database Structure - Generated on {datetime.now()}\n\n")
            
            if args.path:
                output_file.write(f"Exploring specific path: {args.path}\n\n")
                explore_specific_path(db, args.path, output_file, max_depth)
            elif args.users_only:
                output_file.write("Exploring users collection only\n\n")
                explore_users_collection(db, output_file, max_depth)
            else:
                output_file.write("Exploring entire database\n\n")
                root_collections = list_all_root_collections(db, output_file)
                output_file.write("\nDetailed Database Structure:\n\n")
                for collection in root_collections:
                    explore_collection(db, collection, output_file, max_depth)
                    
        print(f"Database structure written to {output_path}")
        
    except Exception as e:
        print(f"Error exploring database: {e}")

if __name__ == "__main__":
    main()
