const olho = document.getElementById("olho");
const senha = document.getElementById("senha");

olho.addEventListener("click", () => {

    if (senha.type === "password") {

        senha.type = "text";
        olho.classList.remove("fa-eye");
        olho.classList.add("fa-eye-slash");

    } else {

        senha.type = "password";
        olho.classList.remove("fa-eye-slash");
        olho.classList.add("fa-eye");

    }

});