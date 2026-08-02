'use strict';

const catalog = require('../recipes/catalog.json');

const recipeMap = new Map(catalog.recipes.map((recipe) => [recipe.id, recipe]));

function getRecipe(id) {
  return recipeMap.get(id) || null;
}

function listRecipes() {
  return catalog.recipes.map((recipe) => ({ ...recipe }));
}

module.exports = {
  version: catalog.version,
  getRecipe,
  listRecipes,
  recipeIds: Object.freeze(catalog.recipes.map((recipe) => recipe.id))
};
