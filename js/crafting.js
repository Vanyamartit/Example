const craftingContainer = document.getElementById('crafting-container');

export function showCraftingUI() {
  // Crafting is disabled
}

export function hideCraftingUI() {
  if (craftingContainer) {
    craftingContainer.style.display = 'none';
  }
}

export function getCraftingGrid() {
  return [];
}

export function setCraftingOutput(item) {
  // Crafting is disabled
}

export function checkCrafting() {
  // Crafting is disabled
}