#!/usr/bin/env python3
"""
Firebase Database Structure Explorer

This script provides a detailed view of your Firebase Firestore database structure
including collection names, document structures, and field types.
"""

import os
import sys
import json
from datetime import datetime
import firebase_admin
from firebase_admin import credentials, firestore

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

def get_field_schema(value):
    """Extract schema information from a field value."""
    if value is None:
        return {"type": "null"}
    
    if isinstance(value, dict):
        schema = {"type": "object", "properties": {}}
        for k, v in value.items():
            schema["properties"][k] = get_field_schema(v)
        return schema
    elif isinstance(value, list):
        if not value:
            return {"type": "array", "items": {"type": "unknown"}}
        # Get schema of first item as representative
        return {"type": "array", "items": get_field_schema(value[0])}
    elif isinstance(value, bool):
        return {"type": "boolean"}
    elif isinstance(value, int):
        return {"type": "integer"}
    elif isinstance(value, float):
        return {"type": "number"}
    elif isinstance(value, str):
        return {"type": "string"}
    else:
        return {"type": str(type(value).__name__)}

def explore_collection(db, path, structure_dict, max_docs=5):
    """Explore a collection and build its structure."""
    print(f"Exploring collection: {path}")
    
    try:
        collection_ref = db.collection(path)
        docs = list(collection_ref.limit(max_docs).stream())
        
        if not docs:
            structure_dict[path] = {"__info__": "Empty collection"}
            return
        
        structure_dict[path] = {}
        structure_dict[path]["__documents__"] = {}
        
        # Process documents
        for doc in docs:
            doc_id = doc.id
            doc_data = doc.to_dict()
            
            structure_dict[path]["__documents__"][doc_id] = {}
            doc_structure = structure_dict[path]["__documents__"][doc_id]
            
            # Process fields
            for field_name, field_value in doc_data.items():
                doc_structure[field_name] = get_field_schema(field_value)
            
            # Process subcollections
            subcollections = doc.reference.collections()
            for subcollection in subcollections:
                subcol_path = f"{path}/{doc_id}/{subcollection.id}"
                explore_collection(db, subcol_path, structure_dict)
    
    except Exception as e:
        structure_dict[path] = {"__error__": str(e)}
        print(f"Error exploring {path}: {e}")

def explore_root_collections(db):
    """Explore all root collections in Firestore."""
    print("Getting root collections...")
    db_structure = {}
    
    try:
        collections = list(db.collections())
        print(f"Found {len(collections)} root collections")
        
        for collection in collections:
            explore_collection(db, collection.id, db_structure)
            
        return db_structure
    except Exception as e:
        print(f"Error getting root collections: {e}")
        return {"__error__": str(e)}

def main():
    # Initialize Firebase
    app = initialize_firebase()
    if not app:
        print("Failed to initialize Firebase.")
        return 1
        
    db = firestore.client()
    
    # Explore the database
    print("Starting database exploration...")
    db_structure = explore_root_collections(db)
    
    # Save the structure to a file
    output_file = "firebase_db_structure.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(db_structure, f, indent=2, default=str)
    
    print(f"Database structure written to {output_file}")
    
    # Also create a text summary
    summary_file = "firebase_db_summary.txt"
    with open(summary_file, "w", encoding="utf-8") as f:
        f.write(f"Firebase Database Structure Summary - {datetime.now()}\n\n")
        
        # Write root collections
        f.write("Root Collections:\n")
        for collection_path in db_structure:
            f.write(f"• {collection_path}\n")
            
            # Collection might have error
            if "__error__" in db_structure[collection_path]:
                f.write(f"  Error: {db_structure[collection_path]['__error__']}\n")
                continue
                
            # Collection might be empty
            if "__info__" in db_structure[collection_path]:
                f.write(f"  {db_structure[collection_path]['__info__']}\n")
                continue
            
            # Write document examples
            if "__documents__" in db_structure[collection_path]:
                documents = db_structure[collection_path]["__documents__"]
                doc_count = len(documents)
                f.write(f"  {doc_count} document examples:\n")
                
                for doc_id, doc_structure in documents.items():
                    f.write(f"  • Document ID: {doc_id}\n")
                    
                    # Write fields
                    for field_name, field_schema in doc_structure.items():
                        field_type = field_schema.get("type", "unknown")
                        f.write(f"    - {field_name}: {field_type}\n")
                        
                        # For objects, show nested fields
                        if field_type == "object" and "properties" in field_schema:
                            for nested_field, nested_schema in field_schema["properties"].items():
                                nested_type = nested_schema.get("type", "unknown")
                                f.write(f"      • {nested_field}: {nested_type}\n")
            
            f.write("\n")
    
    print(f"Summary written to {summary_file}")
    return 0

if __name__ == "__main__":
    sys.exit(main())
