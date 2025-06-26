import { ShoppingList, ShoppingListItem } from '../types/shoppingList';

interface Recipe {
  name: string;
  ingredients: {
    name: string;
    quantity: string;
    unit: string;
  }[];
}

export class ShoppingListService {
  static generateFromRecipe(recipe: Recipe): ShoppingList {
    const list: ShoppingList = {
      id: Date.now().toString(),
      name: `Liste pour ${recipe.name}`,
      items: recipe.ingredients.map(ingredient => ({
        id: Date.now().toString() + Math.random().toString(),
        name: ingredient.name,
        quantity: `${ingredient.quantity} ${ingredient.unit}`,
        purchased: false,
        createdAt: new Date(),
        updatedAt: new Date()
      })),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return list;
  }
}
