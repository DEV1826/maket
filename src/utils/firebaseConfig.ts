import firestore from '@react-native-firebase/firestore';
import auth from '@react-native-firebase/auth';
import storage from '@react-native-firebase/storage';

// Enable Firestore persistence for offline capabilities
firestore().settings({
  persistence: true,
  cacheSizeBytes: firestore.CACHE_SIZE_UNLIMITED
});

// Firebase configuration and helper functions
export class FirebaseService {
  
  // Check if user is authenticated
  static isUserAuthenticated(): boolean {
    return auth().currentUser !== null;
  }

  // Get current user ID
  static getCurrentUserId(): string | null {
    return auth().currentUser?.uid || null;
  }

  // Safe Firestore operation with error handling
  static async safeFirestoreOperation<T>(
    operation: () => Promise<T>,
    errorMessage: string = 'Erreur Firebase'
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const data = await operation();
      return { success: true, data };
    } catch (error: any) {
      console.error(`Firebase Error: ${errorMessage}`, error);
      
      // Handle specific Firebase errors
      if (error?.code === 'permission-denied') {
        return { 
          success: false, 
          error: 'Permissions insuffisantes. Vérifiez votre connexion.' 
        };
      } else if (error?.code === 'unavailable') {
        return { 
          success: false, 
          error: 'Service temporairement indisponible. Réessayez plus tard.' 
        };
      } else if (error?.code === 'unauthenticated') {
        return { 
          success: false, 
          error: 'Vous devez être connecté pour effectuer cette action.' 
        };
      }
      
      return { 
        success: false, 
        error: 'Une erreur est survenue. Vérifiez votre connexion.' 
      };
    }
  }

  // Get user's stock collection reference
  static getUserStockRef(userId: string) {
    return firestore()
      .collection('users')
      .doc(userId)
      .collection('stock');
  }

  // Get public collections with fallback
  static async getPublicPlats(limit: number = 10) {
    return this.safeFirestoreOperation(
      async () => {
        const snapshot = await firestore()
          .collection('public_plats')
          .limit(limit)
          .get();
        
        const items: any[] = [];
        snapshot.forEach(doc => {
          const data = doc.data();
          if (data.imageUrl) {
            items.push({
              id: doc.id,
              nom: data.nom || 'Plat',
              imageUrl: data.imageUrl
            });
          }
        });
        return items;
      },
      'Erreur lors du chargement des plats'
    );
  }

  // Search ingredients with fallback to public_plats
  static async searchIngredients(query: string, limit: number = 10) {
    return this.safeFirestoreOperation(
      async () => {
        // First try ingredients collection
        let snapshot = await firestore()
          .collection('ingredients')
          .where('nom', '>=', query.toLowerCase())
          .where('nom', '<=', query.toLowerCase() + '\uf8ff')
          .limit(limit)
          .get();

        let results: any[] = [];
        snapshot.forEach(doc => {
          results.push({
            id: doc.id,
            ...doc.data()
          });
        });

        // If no results, try public_plats as fallback
        if (results.length === 0) {
          snapshot = await firestore()
            .collection('public_plats')
            .where('nom', '>=', query.toLowerCase())
            .where('nom', '<=', query.toLowerCase() + '\uf8ff')
            .limit(Math.min(limit, 5))
            .get();

          snapshot.forEach(doc => {
            const data = doc.data();
            results.push({
              id: doc.id,
              nom: data.nom,
              imageUrls: data.imageUrl ? [data.imageUrl] : [],
              categorie: data.categorie || 'Plat'
            });
          });
        }

        return results;
      },
      'Erreur lors de la recherche d\'ingrédients'
    );
  }

  // Add stock item with proper error handling
  static async addStockItem(userId: string, itemData: any) {
    return this.safeFirestoreOperation(
      async () => {
        const docRef = await this.getUserStockRef(userId).add({
          ...itemData,
          createdAt: firestore.FieldValue.serverTimestamp(),
        });
        return docRef.id;
      },
      'Erreur lors de l\'ajout de l\'article'
    );
  }

  // Delete stock item
  static async deleteStockItem(userId: string, itemId: string) {
    return this.safeFirestoreOperation(
      async () => {
        await this.getUserStockRef(userId).doc(itemId).delete();
        return true;
      },
      'Erreur lors de la suppression de l\'article'
    );
  }

  // Subscribe to stock changes with error handling
  static subscribeToStock(
    userId: string,
    onSnapshot: (items: any[]) => void,
    onError: (error: string) => void
  ) {
    return this.getUserStockRef(userId)
      .orderBy('nom', 'asc')
      .onSnapshot(
        (querySnapshot) => {
          const items: any[] = [];
          querySnapshot.forEach((doc) => {
            items.push({
              id: doc.id,
              ...doc.data(),
            });
          });
          onSnapshot(items);
        },
        (error: any) => {
          console.error('Stock subscription error:', error);
          if (error?.code === 'permission-denied') {
            onError('Permissions insuffisantes pour accéder à vos données.');
          } else if (error?.code === 'unavailable') {
            onError('Service temporairement indisponible.');
          } else {
            onError('Erreur de connexion. Vérifiez votre réseau.');
          }
        }
      );
  }

  // Get user's plats collection reference
  static getUserPlatsRef(userId: string) {
    return firestore()
      .collection('users')
      .doc(userId)
      .collection('plats');
  }

  // Add plat with proper error handling
  static async addPlat(platData: any) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    return this.safeFirestoreOperation(
      async () => {
        const docRef = await this.getUserPlatsRef(userId).add({
          ...platData,
          createdAt: firestore.FieldValue.serverTimestamp(),
          updatedAt: firestore.FieldValue.serverTimestamp(),
          userId: userId,
        });
        return docRef.id;
      },
      'Erreur lors de l\'ajout du plat'
    );
  }

  // Update plat with proper error handling
  static async updatePlat(platId: string, platData: any) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    return this.safeFirestoreOperation(
      async () => {
        await this.getUserPlatsRef(userId).doc(platId).update({
          ...platData,
          updatedAt: firestore.FieldValue.serverTimestamp(),
        });
        return true;
      },
      'Erreur lors de la mise à jour du plat'
    );
  }

  // Get plat by ID with proper error handling
  static async getPlat(platId: string) {
    const userId = this.getCurrentUserId();
    if (!userId) {
      return { success: false, error: 'Utilisateur non connecté' };
    }

    return this.safeFirestoreOperation(
      async () => {
        const doc = await this.getUserPlatsRef(userId).doc(platId).get();
        if (doc.exists()) {
          return { id: doc.id, ...doc.data() };
        }
        throw new Error('Plat non trouvé');
      },
      'Erreur lors du chargement du plat'
    );
  }

  // Search public plats with autocomplete
  static async searchPublicPlats(searchTerm: string): Promise<{ success: boolean; data?: any[]; error?: string }> {
    return this.safeFirestoreOperation(async () => {
      const searchTermLower = searchTerm.toLowerCase();
      
      // Search in public_plats collection using the actual structure
      const publicPlatsRef = firestore().collection('public_plats');
      
      // Get all documents and filter client-side since Firestore doesn't support 
      // case-insensitive search or "contains" queries efficiently
      const snapshot = await publicPlatsRef.get();
      
      const results: any[] = [];
      
      snapshot.forEach(doc => {
        const data = doc.data();
        const nom = data.nom?.toLowerCase() || '';
        const autreNom = data.autre_nom?.toLowerCase() || '';
        
        // Search in both nom and autre_nom fields
        if (nom.includes(searchTermLower) || autreNom.includes(searchTermLower)) {
          results.push({
            id: doc.id,
            code: data.code,
            nom: data.nom,
            autre_nom: data.autre_nom,
            description: data.description,
            origine: data.origine,
            imageUrls: data.imageUrls || [],
            ingredients: data.ingredients || [],
            // Add a display name that combines both names
            displayName: data.autre_nom ? `${data.nom} (${data.autre_nom})` : data.nom,
            // Get the first image URL for display
            imageUrl: (data.imageUrls && data.imageUrls.length > 0) ? data.imageUrls[0] : null
          });
        }
      });
      
      // Sort results by relevance (exact matches first, then partial matches)
      results.sort((a, b) => {
        const aExact = a.nom.toLowerCase() === searchTermLower || a.autre_nom?.toLowerCase() === searchTermLower;
        const bExact = b.nom.toLowerCase() === searchTermLower || b.autre_nom?.toLowerCase() === searchTermLower;
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        return a.nom.localeCompare(b.nom);
      });
      
      return results.slice(0, 10); // Limit to 10 results
    });
  }
}

export default FirebaseService;
