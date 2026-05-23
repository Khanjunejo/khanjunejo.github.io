// ===== PASSWORD TOGGLE =====
function togglePassword(id){
  let input = document.getElementById(id);
  input.type = input.type === "password" ? "text" : "password";
}

// ===== HELPERS =====
function showError(id,msg){
  document.getElementById(id).textContent = msg;
}
function clearError(id){
  document.getElementById(id).textContent = "";
}
function isValidEmail(email){
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// 🔥 PASSWORD VALIDATION
function isStrongPassword(password){
  return /^(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[^\s]{6,}$/.test(password);
}


// =======================
// ===== SIGNUP =====
// =======================
document.getElementById("signupForm")?.addEventListener("submit",(e)=>{
e.preventDefault();

let username = document.getElementById("username").value.trim();
let email = document.getElementById("email").value.trim();
let password = document.getElementById("password").value;

clearError("signupError");

// VALIDATIONS
if(username.length < 3){
  return showError("signupError","Username must be at least 3 characters");
}

if(!isValidEmail(email)){
  return showError("signupError","Enter valid email");
}

if(!isStrongPassword(password)){
  return showError("signupError",
  "Password must have: 1 capital, 1 number, 1 special char, no spaces");
}

// USERS
let users = JSON.parse(localStorage.getItem("users")||"[]");

if(users.find(u=>u.email===email)){
  return showError("signupError","Email already exists");
}

// SAVE
let user = {username,email,password};
users.push(user);

localStorage.setItem("users",JSON.stringify(users));
localStorage.setItem("currentUser",JSON.stringify(user));

alert("Signup successful! 🎉");

// REDIRECT
let redirectGame = localStorage.getItem("redirectGame");

if(redirectGame){
  localStorage.removeItem("redirectGame");
  window.location.href = redirectGame;
}else{
  window.location.href="index.html";
}

});


// =======================
// ===== LOGIN =====
// =======================
document.getElementById("loginForm")?.addEventListener("submit",(e)=>{
e.preventDefault();

let email = document.getElementById("loginEmail").value.trim();
let password = document.getElementById("loginPassword").value;

clearError("loginError");

// VALIDATIONS
if(!isValidEmail(email)){
  return showError("loginError","Enter valid email");
}

if(password.includes(" ")){
  return showError("loginError","Password cannot contain spaces");
}

// USERS
let users = JSON.parse(localStorage.getItem("users")||"[]");

let user = users.find(u=>u.email===email && u.password===password);

if(!user){
  return showError("loginError","Wrong email or password");
}

// LOGIN SUCCESS
localStorage.setItem("currentUser",JSON.stringify(user));

alert("Login successful! 🎉");

// REDIRECT
let redirectGame = localStorage.getItem("redirectGame");

if(redirectGame){
  localStorage.removeItem("redirectGame");
  window.location.href = redirectGame;
}else{
  window.location.href="index.html";
}

});