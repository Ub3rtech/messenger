const socket = io("http://localhost:5000");

let myToken = null;
let friendToken = null;


function startChat() {
    friendToken = document.getElementById("interlocutor").value.trim();
    if (!friendToken) {
        alert("Введите токен собеседника!");
        return;
    }

    myToken = document.getElementById("Token").innerText.split(": ")[1];

    if (!myToken || myToken.trim() === "undefined") {
        alert("Ошибка: Ваш токен не найден! Сначала получите токен.");
        return;
    }

    console.log("🔹 myToken:", myToken);
    console.log("🔹 friendToken:", friendToken);

    socket.emit("join", { token: myToken });
}

function sendMessage() {
    const message = document.getElementById("message").value.trim();
    if (!message) {
        alert("Ошибка: Сообщение не может быть пустым!");
        return;
    }

    console.log("message:", message);
    console.log("myToken:", myToken);
    console.log("friendToken:", friendToken);

    fetch("/send_message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sender_token: myToken,
            receiver_token: friendToken,
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("🔹 Ответ сервера:", data);
        if (data.status === "success") {
            displayMessage(myToken, message);
            document.getElementById("message").value = "";
        } else {
            alert("Ошибка: " + data.error);
        }
    })
    .catch(error => {
        console.error(" Ошибка при отправке сообщения:", error);
    });
}



function scrollToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function displayChatHistory(messages) {
    const chatBox = document.getElementById("chat-messages");
    chatBox.innerHTML = "";

    messages.forEach(msg => {
        displayMessage(msg.sender, msg.message);
    });

    scrollToEndPage();
}

function displayMessage(sender, message) {
    const chatBox = document.getElementById("chat-messages");

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message");

    if (sender === myToken) {
        messageDiv.classList.add("my-message");
    } else {
        messageDiv.classList.add("friend-message");
    }

    messageDiv.innerHTML = `<p style="font-size: 25px">${sender}</p> <p style="font-size: 30px">${message}</p>`;
    chatBox.appendChild(messageDiv);

    scrollToEndPage();
}
document.addEventListener("DOMContentLoaded", function () {
    const chatModal = document.getElementById("modal");

    chatModal.addEventListener("hidden.bs.modal", function () {
        console.log("Закрытие окна, очищаем базу данных...");

        fetch("/clear_messages", { method: "POST" })
            .then(response => response.json())
            .then(data => console.log("База очищена:", data))
            .catch(error => console.error("Ошибка очистки базы:", error));
    });
});
function check_token() {
    var tokenElement = document.getElementById("Token");
    var arrow = document.getElementById("arrow-indicator");

    if (!tokenElement || tokenElement.textContent.trim() === "Your Token") {
        alert("Before moving on to communication, get your token. In the panel at the top, press the 'get token'");


        arrow.style.display = "block";
        arrow.style.top = "80px";


        setTimeout(() => { arrow.style.top = "70px"; }, 200);


        setTimeout(() => { arrow.style.top = "110px"; }, 600);

        setTimeout(() => { arrow.style.top = "70px"; }, 1000);

        setTimeout(() => { arrow.style.top = "90px"; }, 1400);

        setTimeout(() => { hide_arrow(); }, 2000);
    }
}

function hide_arrow() {
    var arrow = document.getElementById("arrow-indicator");
    arrow.style.display = "none";
}