let currentMapCoordinates = {};

const mapaContent = {
  x11: {
    red: { x: -1050, y: 0 },
    blue: { x: 1050, y: 0 }
  },
  x7: {
    red: { x: -1000, y: 0 },
    blue: { x: 1000, y: 0 }
  },
  x5: {
    red: { x: -750, y: 0 },
    blue: { x: 750, y: 0 }
  }
};

function setCurrentMapCoordinates(mapType) {
  currentMapCoordinates = mapaContent[mapType];
}

function getCurrentMapCoordinates() {
  return currentMapCoordinates;
}
module.exports = { setCurrentMapCoordinates, getCurrentMapCoordinates };
