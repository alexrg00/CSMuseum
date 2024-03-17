const X_AXIS = 'x_axis'
const Y_AXIS = 'y_axis'

const rootStyles = getComputedStyle(document.documentElement);

const gridCellScaler = rootStyles.getPropertyValue('--grid-cell-scaler');
const mapWidth = rootStyles.getPropertyValue('--min-map-width-ratio');
const mapHeight = rootStyles.getPropertyValue('--min-map-height-ratio');



/** 
 * Direction key state 
 */ 

const directions = {
   up: "up",
   down: "down",
   left: "left",
   right: "right",
}

const keys = {
   "ArrowUp": directions.up,
   "ArrowLeft": directions.left,
   "ArrowRight": directions.right,
   "ArrowDown": directions.down
}

const character = document.querySelector(".character");
const map = document.querySelector(".map");

async function getImageFromSource(src) {
   // convert the image onload into a promise to use it outside of the function block
  return new Promise((resolve, reject) => {
    let img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

const speed = 1; 

async function main() {
   /**
    * Get map image source width and height
    */
   const computedStyle = window.getComputedStyle(map);
   const backgroundImage = computedStyle.getPropertyValue('background-image');
   console.log(backgroundImage)
   // remove 'url()' from the image src string
   const imageUrl = backgroundImage.match(/url\("([^"]+)"\)/)[1];
   mapSource = await getImageFromSource(imageUrl)

   console.log(mapSource.width, mapSource.height)

   console.log(`gridScaler: ${gridCellScaler * mapHeight}`)
   let map_ratios = {
      // render browser/original
      'x_axis': (gridCellScaler * mapWidth) / mapSource.width,
      'y_axis': (gridCellScaler * mapHeight) / mapSource.height
   }
   // position the players at 0, 0 based on where they're standing
   // TODO: future positions will need to account for the position of the player sprite adjustment. play position is not the top left of sprite, but where it's standing
   let char_coords = {
      // coordinates from the original * map_ratio[]
      'x_axis': (mapSource.width) * map_ratios[X_AXIS],
      'y_axis': (mapSource.height) * map_ratios[Y_AXIS]
   }

   // State of which arrow keys we are holding down
   let held_directions = []; 

   document.addEventListener("keydown", (e) => {
      let dir = keys[e.key];
      if (dir && held_directions.indexOf(dir) === -1) {
         held_directions.unshift(dir)
      }
   })

   document.addEventListener("keyup", (e) => {
      let dir = keys[e.key];
      let index = held_directions.indexOf(dir);
      if (index > -1) {
         held_directions.splice(index, 1)
      }
   });

   // collision detection:
   let impassableTerrains = [{
         left: 79 * map_ratios[X_AXIS], 
         top: 100 * map_ratios[Y_AXIS], 
         width: 159  * map_ratios[X_AXIS],
         height: 140 * map_ratios[Y_AXIS] 
      }
   ];

   // Define impassable terrains using (left, top, width, height) coordinates
   // TODO: the 1026/ 316 and 1154/364 is what is rendered on the browser css
   // this is only to display the collisions, but not create them  
   // TODO: make the pixel conversion automatic in the game loop even if the size of the map changes

   // collision visuals:
   let showCollisions = false;

   document.addEventListener('keydown', function(event) {
      if (event.key === 'd') {
         showCollisions = !showCollisions;
         console.log('pressed key')
      }
   });

   //Set up the game loop
   const step = () => {
      // this needs to be updated every frame because the browser window may be resized by the user 
      let impassableTerrainsVisual = [{
         // getting map width/height to convert coordinates from original to browser render
            left: 79 * map.offsetWidth / mapSource.width, 
            top: 100 * map.offsetHeight / mapSource.height, 
            width: 159  * map.offsetWidth / mapSource.width,
            height: 140 * map.offsetHeight / mapSource.height
         }
      ];

      drawImpassableTerrains(showCollisions, map, impassableTerrainsVisual);
      
      placeCharacter(held_directions, directions, char_coords, X_AXIS, speed, Y_AXIS, character, map, impassableTerrains);
      window.requestAnimationFrame(() => {
         // call itself every frame
         step();
      })
   }

   // start game loop
   step(); 

   /* Dpad functionality for mouse and touch */

   let isPressed = false;
   const removePressedAll = () => {
      document.querySelectorAll(".dpad-button").forEach(d => {
         d.classList.remove("pressed")
      })
   }

   const handleDpadPress = (direction, click) => {   
      if (click) {
         isPressed = true;
      }
      held_directions = (isPressed) ? [direction] : []
      
      if (isPressed) {
         removePressedAll();
         document.querySelector(".dpad-"+direction).classList.add("pressed");
      }
   }

   document.body.addEventListener("mousedown", () => {
      console.log('mouse is down')
      isPressed = true;
   })

   document.body.addEventListener("mouseup", () => {
      console.log('mouse is up')
      isPressed = false;
      held_directions = [];
      removePressedAll();
   })

   //Bind a ton of events for the dpad
   document.querySelector(".dpad-left").addEventListener("touchstart", (e) => handleDpadPress(directions.left, true));
   document.querySelector(".dpad-up").addEventListener("touchstart", (e) => handleDpadPress(directions.up, true));
   document.querySelector(".dpad-right").addEventListener("touchstart", (e) => handleDpadPress(directions.right, true));
   document.querySelector(".dpad-down").addEventListener("touchstart", (e) => handleDpadPress(directions.down, true));

   document.querySelector(".dpad-left").addEventListener("mousedown", (e) => handleDpadPress(directions.left, true));
   document.querySelector(".dpad-up").addEventListener("mousedown", (e) => handleDpadPress(directions.up, true));
   document.querySelector(".dpad-right").addEventListener("mousedown", (e) => handleDpadPress(directions.right, true));
   document.querySelector(".dpad-down").addEventListener("mousedown", (e) => handleDpadPress(directions.down, true));

   document.querySelector(".dpad-left").addEventListener("mouseover", (e) => handleDpadPress(directions.left));
   document.querySelector(".dpad-up").addEventListener("mouseover", (e) => handleDpadPress(directions.up));
   document.querySelector(".dpad-right").addEventListener("mouseover", (e) => handleDpadPress(directions.right));
   document.querySelector(".dpad-down").addEventListener("mouseover", (e) => handleDpadPress(directions.down));
}

main()

function placeCharacter(held_directions, directions, char_coords, x_axis, speed, y_axis, character, map, impassableTerrains) {
   let pixelSize = parseInt(
      getComputedStyle(document.documentElement).getPropertyValue('--pixel-size')
   );

   const held_direction = held_directions[0];
   if (held_direction) {
      // depending on the direction adjust the x and y coordinates
      if (held_direction === directions.right) { char_coords[x_axis] += speed; }
      if (held_direction === directions.left) { char_coords[x_axis] -= speed; }
      if (held_direction === directions.down) { char_coords[y_axis] += speed; }
      if (held_direction === directions.up) { char_coords[y_axis] -= speed; }
      character.setAttribute("facing", held_direction);
   }
   character.setAttribute("walking", held_direction ? "true" : "false");

   // map position on the screen
   let camera_left = pixelSize * 66 * 2;
   let camera_top = pixelSize * 42 * 2;

   map.style.transform = `translate3d( ${-char_coords[x_axis] * pixelSize + camera_left}px, ${-char_coords[y_axis] * pixelSize + camera_top}px, 0 )`;
   character.style.transform = `translate3d( ${char_coords[x_axis] * pixelSize}px, ${char_coords[y_axis] * pixelSize}px, 0 )`;

   // use this to get the size of the map for the player collisions
   console.log(`${char_coords[x_axis]}, ${char_coords[y_axis]}`)
   let collision = checkCollision(char_coords[x_axis], char_coords[y_axis], impassableTerrains);

   if (collision) {
      console.log('collision detected')
      // simply counter the speed!
      if (held_direction === directions.right) { char_coords[x_axis] -= speed; }
      if (held_direction === directions.left) { char_coords[x_axis] += speed; }
      if (held_direction === directions.down) { char_coords[y_axis] -= speed; }
      if (held_direction === directions.up) { char_coords[y_axis] += speed; }
   } 
}

function drawImpassableTerrains(showCollisions, map, impassableTerrains) {
   let canvas = document.getElementById("terrainCanvas");
   let ctx = canvas.getContext("2d");

   // Get the size of the map container
   let width = map.offsetWidth;
   let height = map.offsetHeight;

   // Set canvas size to match the map container
   canvas.width = width;
   canvas.height = height;

   // Clear canvas
   //ctx.clearRect(0, 0, canvas.width, canvas.height); 

   if (showCollisions) {
      ctx.fillStyle = "rgba(255, 0, 0, 0.5)"; // Color for impassable terrains
      for (let i = 0; i < impassableTerrains.length; i++) {
         let terrain = impassableTerrains[i];
         ctx.fillRect(terrain.left, terrain.top, terrain.width, terrain.height);
      }
   }
}


// Check if character intersects with any impassable terrain
function checkCollision(x_char, y_char, impassableTerrains) {
   for (let i = 0; i < impassableTerrains.length; i++) {
      let terrain = impassableTerrains[i];
      if (x_char >= terrain.left && x_char <= terrain.left + terrain.width &&
            y_char >= terrain.top && y_char <= terrain.top + terrain.height) {
            return true;  // Collision detected
      }
   }
   return false;  // No collision with any impassable terrain
}