const btnSair=document.getElementById("logOut");
btnSair.addEventListener("click", ()=>{
  localStorage.removeItem("usuario");
  localStorage.removeItem("token");
  window.location.href="../index.html"
});