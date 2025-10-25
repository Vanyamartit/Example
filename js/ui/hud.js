export let hotbarItems = [];
export let selectedHotbarIndex = 0;

export function updateHotbarUI() {
    hotbarItems.forEach((item, index) => {
        const slot = document.getElementById(`slot-${index + 1}`);
        if (slot) {
            if (item && item.icon) {
                slot.style.backgroundImage = `url(${item.icon})`;
            } else {
                slot.style.backgroundImage = 'none';
            }

            if (index === selectedHotbarIndex) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        }
    });
}

export function initHotbar(items) {
    hotbarItems = items;
    updateHotbarUI();
}

export function setSelectedHotbarIndex(index) {
    selectedHotbarIndex = index;
    updateHotbarUI();
}

export function getSelectedHotbarIndex() {
    return selectedHotbarIndex;
}

export function getHotbarItems() {
    return hotbarItems;
}

let fpsCounter;

export function initHUD() {
    fpsCounter = document.createElement('div');
    fpsCounter.style.position = 'absolute';
    fpsCounter.style.top = '10px';
    fpsCounter.style.left = '10px';
    fpsCounter.style.color = 'white';
    fpsCounter.style.fontFamily = 'monospace';
    fpsCounter.style.fontSize = '14px';
    fpsCounter.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
    fpsCounter.style.padding = '5px';
    fpsCounter.style.borderRadius = '5px';
    document.body.appendChild(fpsCounter);
    updateFPSCounter.last = performance.now(); // Initialize last update time for FPS counter
}

export function updateFPSCounter(flightMode) {
    const now = performance.now();
    const fps = (1000 / (now - (updateFPSCounter.last || now))).toFixed(1);
    updateFPSCounter.last = now;
    fpsCounter.textContent = `FPS: ${fps}` + (flightMode ? ' (Flight)' : '');
}
