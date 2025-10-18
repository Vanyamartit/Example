export function initMainMenu() {
  return new Promise((resolve) => {
    let gameMode = 'survival'; // creative or survival
    let worldType = 'default'; // default or flat

    const mainMenu = document.getElementById('main-menu');
    const worldSettings = document.getElementById('world-settings');
    const createWorldBtn = document.getElementById('create-world-btn');
    const startGameBtn = document.getElementById('start-game-btn');
    const worldTypeDefaultBtn = document.getElementById('world-type-default');
    const worldTypeFlatBtn = document.getElementById('world-type-flat');
    const gamemodeSurvivalBtn = document.getElementById('gamemode-survival');
    const gamemodeCreativeBtn = document.getElementById('gamemode-creative');

    mainMenu.style.display = 'block';

    createWorldBtn.addEventListener('click', () => {
      mainMenu.style.display = 'none';
      worldSettings.style.display = 'block';
    });

    worldTypeDefaultBtn.addEventListener('click', () => {
      worldType = 'default';
      worldTypeDefaultBtn.classList.add('selected');
      worldTypeFlatBtn.classList.remove('selected');
    });

    worldTypeFlatBtn.addEventListener('click', () => {
      worldType = 'flat';
      worldTypeFlatBtn.classList.add('selected');
      worldTypeDefaultBtn.classList.remove('selected');
    });

    gamemodeSurvivalBtn.addEventListener('click', () => {
      gameMode = 'survival';
      gamemodeSurvivalBtn.classList.add('selected');
      gamemodeCreativeBtn.classList.remove('selected');
    });

    gamemodeCreativeBtn.addEventListener('click', () => {
      gameMode = 'creative';
      gamemodeCreativeBtn.classList.add('selected');
      gamemodeSurvivalBtn.classList.remove('selected');
    });

    startGameBtn.addEventListener('click', () => {
      worldSettings.style.display = 'none';
      mainMenu.style.display = 'none';
      document.getElementById('app').style.display = 'block';
      document.querySelector('.crosshair').style.display = 'block';
      document.querySelector('.hud').style.display = 'block';
      document.getElementById('hotbar').style.display = 'flex';
      resolve({ gameMode, worldType });
    });
  });
}
