#!/usr/bin/env python3
"""
Firebase Database Structure Explorer

This script connects to your Firebase Firestore database using your service account
credentials and recursively explores the entire database structure, outputting
a hierarchical representation of all collections, documents, and their fields.
"""

import firebase_admin
from firebase_admin import credentials, firestore
import json
import os
from datetime import datetime
import argparse

def initialize_firebase():
    """Initialize Firebase Admin SDK with service account credentials."""
    # Path to service account key
    service_account_path = "market-c0fa5-firebase-adminsdk-fbsvc-d42907b0fd.json"
    
    if not os.path.exists(service_account_path):
        print(f"Error: Service account file not found at {service_account_path}")
        return None
    
    try:
        cred = credentials.Certificate(service_account_path)
        firebase_admin.initialize_app(cred)
        db = firestore.client()
        print("Successfully connected to Firebase Firestore")
        return db
    except Exception as e:
        print(f"Error initializing Firebase: {e}")
        return None

def explore_document(doc_ref, depth=0, max_depth=10, output_file=None):
    """Explore a document and output its fields."""
    indent = "  " * depth
    try:
        doc = doc_ref.get()
        if not doc.exists:
            print(f"{indent}Document does not exist")
            if output_file:
                output_file.write(f"{indent}Document does not exist\n")
            return
        
        data = doc.to_dict()
        print(f"{indent}Document ID: {doc.id}")
        if output_file:
            output_file.write(f"{indent}Document ID: {doc.id}\n")

        # Print document fields
        for field, value in data.items():
            field_type = type(value).__name__
            if isinstance(value, (dict, list)):
                value_repr = f"{field_type} with {len(value)} items"
            else:
                value_repr = str(value)
                if len(value_repr) > 100:
                    value_repr = value_repr[:97] + "..."
            
            print(f"{indent}  Field: {field} ({field_type}) = {value_repr}")
            if output_file:
                output_file.write(f"{indent}  Field: {field} ({field_type}) = {value_repr}\n")
        
        # If we haven't reached max depth, explore subcollections
        if depth < max_depth:
            subcollections = doc_ref.collections()
            for subcol in subcollections:
                print(f"{indent}  Subcollection: {subcol.id}")
                if output_file:
                    output_file.write(f"{indent}  Subcollection: {subcol.id}\n")
                explore_collection(subcol, depth + 2, max_depth, output_file)
    except Exception as e:
        print(f"{indent}Error exploring document: {e}")
        if output_file:
            output_file.write(f"{indent}Error exploring document: {e}\n")

def explore_collection(collection_ref, depth=0, max_depth=10, output_file=None):
    """Explore a collection and all its documents."""
    indent = "  " * depth
    try:
        print(f"{indent}Collection: {collection_ref.id}")
        if output_file:
            output_file.write(f"{indent}Collection: {collection_ref.id}\n")
        
        # Get all documents in the collection
        docs = collection_ref.limit(100).stream()  # Limit to avoid huge queries
        doc_count = 0
        
        for doc in docs:
            doc_count += 1
            if doc_count <= 10:  # Only fully explore first 10 docs to avoid excessive output
                explore_document(collection_ref.document(doc.id), depth + 1, max_depth, output_file)
            else:
                print(f"{indent}  ... and {doc_count - 10} more documents (limited output)")
                if output_file:
                    output_file.write(f"{indent}  ... and {doc_count - 10} more documents (limited output)\n")
                break
                
    except Exception as e:
        print(f"{indent}Error exploring collection: {e}")
        if output_file:
            output_file.write(f"{indent}Error exploring collection: {e}\n")

def explore_firebase_structure(output_path=None, max_depth=10):
    """Main function to explore the entire Firebase structure."""
    db = initialize_firebase()
    if not db:
        return
    
    output_file = None
    if output_path:
        try:
            output_file = open(output_path, "w", encoding="utf-8")
            output_file.write(f"Firebase Database Structure - Generated on {datetime.now()}\n\n")
        except Exception as e:
            print(f"Error opening output file: {e}")
            output_path = None
    
    try:
        # Get root collections
        collections = db.collections()
        
        # Explore each collection
        for collection in collections:
            explore_collection(collection, max_depth=max_depth, output_file=output_file)
            
    except Exception as e:
        print(f"Error exploring Firebase structure: {e}")
    
    finally:
        if output_file:
            output_file.close()
            print(f"\nStructure output saved to {output_path}")

def explore_users_collections(user_id=None, output_path=None, max_depth=10):
    """Explore collections under a specific user or list all users."""
    db = initialize_firebase()
    if not db:
        return
    
    output_file = None
    if output_path:
        try:
            output_file = open(output_path, "w", encoding="utf-8")
            output_file.write(f"Firebase User Collections - Generated on {datetime.now()}\n\n")
        except Exception as e:
            print(f"Error opening output file: {e}")
            output_path = None
    
    try:
        users_ref = db.collection('users')
        
        if user_id:
            # Explore specific user
            user_doc = users_ref.document(user_id)
            print(f"Exploring collections for user: {user_id}")
            if output_file:
                output_file.write(f"Exploring collections for user: {user_id}\n")
            
            # List subcollections for this user
            subcollections = user_doc.collections()
            for subcol in subcollections:
                explore_collection(subcol, depth=1, max_depth=max_depth, output_file=output_file)
        else:
            # List all users and summary of their collections
            users = users_ref.limit(50).stream()  # Limit to avoid huge queries
            
            for user in users:
                print(f"User ID: {user.id}")
                if output_file:
                    output_file.write(f"User ID: {user.id}\n")
                
                # Get user's subcollections
                user_doc = users_ref.document(user.id)
                subcollections = user_doc.collections()
                
                for subcol in subcollections:
                    print(f"  Collection: {subcol.id}")
                    if output_file:
                        output_file.write(f"  Collection: {subcol.id}\n")
                    
                    # Count documents in this collection
                    try:
                        docs = subcol.limit(1000).stream()
                        doc_count = sum(1 for _ in docs)
                        print(f"    Documents: {doc_count}")
                        if output_file:
                            output_file.write(f"    Documents: {doc_count}\n")
                    except Exception as e:
                        print(f"    Error counting documents: {e}")
                        if output_file:
                            output_file.write(f"    Error counting documents: {e}\n")
            
    except Exception as e:
        print(f"Error exploring user collections: {e}")
    
    finally:
        if output_file:
            output_file.close()
            print(f"\nOutput saved to {output_path}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Firebase Database Structure Explorer')
    parser.add_argument('--output', type=str, default='firebase_structure.txt', 
                        help='Output file path (default: firebase_structure.txt)')
    parser.add_argument('--max-depth', type=int, default=10,
                        help='Maximum depth to explore (default: 10)')
    parser.add_argument('--mode', choices=['full', 'users'], default='full',
                        help='Exploration mode: full database or users only (default: full)')
    parser.add_argument('--user-id', type=str, default=None,
                        help='Specific user ID to explore (only used with --mode=users)')
    
    args = parser.parse_args()
    
    if args.mode == 'users':
        explore_users_collections(user_id=args.user_id, output_path=args.output, max_depth=args.max_depth)
    else:
        explore_firebase_structure(output_path=args.output, max_depth=args.max_depth)
