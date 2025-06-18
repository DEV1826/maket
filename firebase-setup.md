# Firebase Setup Instructions

## 1. Firebase Configuration Files

### Android Configuration
- ✅ `android/app/google-services.json` - Already configured
- Project ID: `market-c0fa5`
- Package Name: `com.market`

### Firebase Admin SDK
- ✅ `Database/firebase_upload/market-c0fa5-firebase-adminsdk-fbsvc-d42907b0fd.json` - Service account key

## 2. Firestore Security Rules

The project includes `firestore.rules` with the following permissions:

```javascript
// Public collections (read-only)
- public_plats: ✅ Read access for all users
- ingredients: ✅ Read access for all users

// User-specific collections (authenticated users only)
- users/{userId}/stock: ✅ Read/Write for owner only
- users/{userId}/lists: ✅ Read/Write for owner only  
- users/{userId}/plats: ✅ Read/Write for owner only
```

## 3. Deploy Security Rules

To deploy the security rules to Firebase:

```bash
# Install Firebase CLI if not already installed
npm install -g firebase-tools

# Login to Firebase
firebase login

# Initialize Firebase in your project
firebase init firestore

# Deploy the rules
firebase deploy --only firestore:rules
```

## 4. Common Permission Issues & Solutions

### Error: "Permission denied"
**Cause**: User not authenticated or accessing wrong collection
**Solution**: 
- Ensure user is logged in with Firebase Auth
- Check collection path matches security rules
- Verify user is accessing their own data under `/users/{userId}/`

### Error: "Insufficient permissions"
**Cause**: Security rules blocking access
**Solution**:
- Deploy the provided `firestore.rules`
- Ensure authenticated user is accessing correct path
- Check Firebase Console > Firestore > Rules

### Error: "Service unavailable"
**Cause**: Network issues or Firebase service down
**Solution**:
- Check internet connection
- Verify Firebase project is active
- Check Firebase Status page

## 5. Testing Permissions

Use Firebase Console > Firestore > Rules playground to test:

```javascript
// Test reading public_plats
Path: /public_plats/someDocId
Method: get
Auth: Unauthenticated ✅ Should allow

// Test reading user stock
Path: /users/USER_ID/stock/someStockId  
Method: get
Auth: USER_ID ✅ Should allow
Auth: OTHER_USER_ID ❌ Should deny
```

## 6. Environment Variables

Ensure these are set in your React Native app:

```javascript
// Already configured in google-services.json
PROJECT_ID=market-c0fa5
STORAGE_BUCKET=market-c0fa5.firebasestorage.app
```

## 7. Troubleshooting

1. **Clear app data** if permissions seem cached
2. **Restart Metro bundler** after config changes
3. **Check Firebase Console logs** for detailed error messages
4. **Verify user authentication** before accessing Firestore
5. **Use FirebaseService** helper class for better error handling

## 8. Firebase Service Helper

The project includes `src/utils/firebaseConfig.ts` with:
- ✅ Proper error handling for permission issues
- ✅ Fallback mechanisms for data access
- ✅ User authentication checks
- ✅ Retry logic for network issues
