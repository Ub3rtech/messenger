document.addEventListener("DOMContentLoaded", () => {
    const text = "Start chat with";
    const container = document.getElementById("text-container");

    function typeText(text, speed = 100, callback) {
        let index = 0;
        const span = document.createElement("span");
        const cursor = document.createElement("span");
        cursor.classList.add("cursor");
        container.appendChild(span);
        container.appendChild(cursor);

        function type() {
            if (index < text.length) {
                span.textContent += text[index];
                index++;
                setTimeout(type, speed);
            } else {
                cursor.remove();
                if (callback) callback();
            }
        }

        type();
    }

    typeText(text);
});

function modaltitlef(){
    var interlocutor_name = document.getElementById("interlocutor").value;
    var modaltitle = document.getElementById("modaltitle")
    modaltitle.textContent=interlocutor_name;
    modaltitle.style.display = "inline-block";
}

document.addEventListener("DOMContentLoaded", () => {
    const modal = document.getElementById("modal");
    const openBtn = document.querySelector("[data-bs-toggle='modal']");
    const closeBtns = modal.querySelectorAll("[data-bs-dismiss='modal'], .btn-close");




    openBtn?.addEventListener("click", () => {
        modal.classList.add("show");
        modal.style.display = "block";
        document.body.classList.add("modal-open");
    });


    closeBtns.forEach((btn) => {
        btn.addEventListener("click", () => {
            modal.classList.remove("show");
            modal.style.display = "none";
            document.body.classList.remove("modal-open");
        });
    });


    modal.addEventListener("click", (e) => {
        if (e.target === modal) {
            modal.classList.remove("show");
            modal.style.display = "none";
            document.body.classList.remove("modal-open");
        }
    });
});