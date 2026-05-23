// 🔊 PLAY SOUND FUNCTION
function playSound(name){
  let sound = new Audio("sounds/" + name + ".mp3");
  sound.volume = 0.5; // volume control
  sound.play();
}