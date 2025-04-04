function scrollToEndPage() {
    const chatMessages = document.getElementById("chat-messages");
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
        console.log("📜 Чат прокручен вниз");
    }
}


document.addEventListener("DOMContentLoaded", function () {
    const startButton = document.getElementById("openModal");
    if (startButton) {
        startButton.addEventListener("click", function () {
            console.log("🔹 Нажата кнопка 'Start'");
            setTimeout(scrollToEndPage, 500);
        });
    }
});
