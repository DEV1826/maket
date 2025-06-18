#!/usr/bin/env python3
"""
Excel Reader for B1 REPAS FINAL.xlsm

This script reads the Excel file and prints out the structure of each sheet
to understand the data that needs to be uploaded to Firebase.
"""

import pandas as pd
import os
import sys

def read_excel_structure(excel_path):
    """Read and print the structure of each sheet in the Excel file."""
    try:
        # Check if file exists
        if not os.path.exists(excel_path):
            print(f"Error: Excel file {excel_path} does not exist.")
            return False
            
        print(f"Reading Excel file: {excel_path}")
        
        # Read all sheets
        excel_file = pd.ExcelFile(excel_path)
        sheet_names = excel_file.sheet_names
        
        print(f"Found {len(sheet_names)} sheets: {', '.join(sheet_names)}")
        
        # Read each sheet and print structure
        for sheet_name in sheet_names:
            print(f"\n--- Sheet: {sheet_name} ---")
            try:
                df = pd.read_excel(excel_file, sheet_name=sheet_name)
                print(f"Number of rows: {len(df)}")
                print(f"Columns: {', '.join(df.columns)}")
                print("First 5 rows:")
                print(df.head())
            except Exception as e:
                print(f"Error reading sheet {sheet_name}: {e}")
        
        return True
    except Exception as e:
        print(f"Error reading Excel file: {e}")
        return False

def main():
    """Main function to execute the script."""
    # Default path to the Excel file
    default_path = "../VBA B1 FINAL/B1 REPAS FINAL.xlsm"
    
    # Check if path is provided as argument
    if len(sys.argv) > 1:
        excel_path = sys.argv[1]
    else:
        excel_path = os.path.abspath(default_path)
    
    read_excel_structure(excel_path)

if __name__ == "__main__":
    main()
