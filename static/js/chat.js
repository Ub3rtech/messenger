const socket = io("http://127.0.0.1:5001");

let myToken = null;
let friendToken = null;
let privateKey= null
const e = 65537n;
let N = null;
let P = null;
let Q = null;
let d = null;




socket.on("new_message", (data) => {
    console.log("📩 Новое сообщение:", data);

    if (data.receiver_token === myToken) {
        displayMessage(data.username, data.text, data.date);
    } else {
        console.log("⚠️ Сообщение отфильтровано (не для текущего собеседника).");
    }
});


async function startChat() {
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

    try {
        const publicKey = await generateRSAKeys();
        //console.log("🔑 Сгенерированный публичный ключ:", publicKey);

        fetch("/add_key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                token: myToken,
                public_key: publicKey
            })
        });

        socket.emit("join", { token: myToken, public_key: publicKey });
    } catch (error) {
        console.error("❌ Ошибка генерации ключа:", error);
    }
}



function sendMessage() {
    const message = document.getElementById("message").value.trim();
    const username = document.getElementById("username").value.trim();
    const time = new Date().toLocaleTimeString("ru-RU", {hour: "2-digit", minute: "2-digit"});
    //console.log("d от",username,":",d);
    //console.log("N от",username,":",N.toString());
    //console.log("P от",username,":",P.toString());
    //console.log("Q от",username,":",Q.toString());
    if (!message) {
        alert("Ошибка: Сообщение не может быть пустым!");
        return;
    }

    console.log("✉️ Отправка сообщения:", { username, message, myToken, friendToken });

    fetch("/send_message", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username,
            sender_token: myToken,
            receiver_token: friendToken,
            message: message,
            date: new Date().toISOString()
        })
    })
    .then(response => response.json())
    .then(data => {
        console.log("🔹 Ответ сервера:", data);
        if (data.status === "success") {
            displayMessage(username, message, time);
            document.getElementById("message").value = "";
        } else {
            alert("Ошибка: " + data.error);
        }
    })
    .catch(error => {
        console.error("❌ Ошибка при отправке сообщения:", error);
    });
}


function displayMessage(sender, message, date) {
    const chatBox = document.getElementById("chat-messages");
    const myUsername = document.getElementById("Token").getAttribute("data-username");
    const isMyMessage = sender === myUsername;

    const messageDiv = document.createElement("div");
    messageDiv.classList.add("chat-message", isMyMessage ? "my-message" : "friend-message");

    let decryptedMessage;

    if (isMyMessage) {
        decryptedMessage = message;
    } else {
        try {
            decryptedMessage = rsaDecrypt(message, d, N);
        } catch (e) {
            console.error("❌ Ошибка при расшифровке:", e);
            decryptedMessage = "[Ошибка дешифровки]";
        }
    }

    messageDiv.innerHTML = `
        <p style="font-size: 25px">${sender}</p>
        <p class="decrypted-message" style="font-size: 30px">${decryptedMessage}</p>
        <p style="font-size: 20px; color: #bbb;">${date}</p>
    `;

    chatBox.appendChild(messageDiv);
    scrollToBottom();
}




function scrollToBottom() {
    const chatMessages = document.getElementById("chat-messages");
    chatMessages.scrollTop = chatMessages.scrollHeight;
}


function check_token() {
    const tokenElement = document.getElementById("Token");
    const arrow = document.getElementById("arrow-indicator");

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

/** 🔹 Скрытие стрелки-подсказки */
function hide_arrow() {
    document.getElementById("arrow-indicator").style.display = "none";
}

/** 🔹 Обработчик изменений в токене (автоматическое определение пользователя) */
document.addEventListener("DOMContentLoaded", function () {
    const tokenElement = document.getElementById("Token");

    if (!tokenElement) {
        console.error("⚠️ Элемент #Token не найден!");
        return;
    }

    const observer = new MutationObserver(() => {
        const myUsername = tokenElement.textContent.split(":")[0].trim();
        if (!myUsername || myUsername === "Your Token") return;

        console.log("🟢 Определённый myUsername:", myUsername);
        observer.disconnect();

        document.querySelectorAll(".chat-message").forEach(msg => {
            const sender = msg.getAttribute("data-sender")?.trim();
            msg.classList.add(sender === myUsername ? "my-message" : "friend-message");
        });
    });

    observer.observe(tokenElement, { childList: true, subtree: true });
});

/** 🔹 Отправка сообщений при нажатии Enter */
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("message").addEventListener("keydown", (event) => {
        if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            sendMessage();
        }
    });
});

/** 🔹 Очистка чата при закрытии модального окна */
document.addEventListener("DOMContentLoaded", function () {
    const clearButton = document.getElementById("clear-chat-btn");

    if (clearButton) {
        clearButton.addEventListener("click", () => {
            if (!confirm("❗ Вы уверены, что хотите очистить чат и ключи?")) return;

            console.log("🗑️ Кнопка очистки нажата, отправляем запрос...");
            fetch("/clear_messages", { method: "POST" })
                .then(response => response.json())
                .then(data => {
                    console.log("✅ База очищена:", data);
                    document.getElementById("chat-messages").innerHTML = "";
                })
                .catch(error => console.error("❌ Ошибка очистки базы:", error));
        });
    }
});



document.addEventListener("DOMContentLoaded", async function () {
    if (!privateKey) {
        console.warn("❌ Закрытый ключ не найден! Расшифровка невозможна.");
        return;
    }

    const [N, d] = privateKey.split(":").map(BigInt);

    document.querySelectorAll(".chat-message").forEach(msg => {
        const encryptedText = BigInt(msg.dataset.encrypted);
        const decrypted = rsaDecrypt(encryptedText, d, N);
        msg.querySelector(".decrypted-message").innerText = decrypted;
    });
});

function rsaDecrypt(ciphertext, d, N) {
    try {
        const C = BigInt(ciphertext);
        const D = BigInt(d);
        const Nn = BigInt(N);

        if (C >= Nn) {
            console.error("❌ Шифротекст превышает N");
            return "[Ошибка дешифровки]";
        }

        const decryptedNum = modExp(C, D, Nn);
        return bigIntToUtf8(decryptedNum);
    } catch (e) {
        console.error("❌ Ошибка при расшифровке:", e);
        return "[Ошибка дешифровки]";
    }
}


function bigIntToUtf8(num) {
    let hex = num.toString(16);
    if (hex.length % 2) hex = "0" + hex;
    const bytes = new Uint8Array(hex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)));
    return new TextDecoder().decode(bytes);
}


async function generateStrongPrime(bits = 2048) {
    const prime = await generatePrime(bits / 2);
    return prime;
}

async function generateRSAKeys() {
    const e = 65537n;
    const p = await generateStrongPrime();
    const q = await generateStrongPrime();
    const n = p * q;

    const publicKeyBytes = bigIntToBytes(n);
    const publicKeyBase64 = btoa(String.fromCharCode(...publicKeyBytes));

    N = n;
    P = p;
    Q = q;
    d = computePrivateExponent(P, Q, e); // 📌 Теперь `d` инициализируется после `P` и `Q`
    //console.log("🔑 Приватный ключ d:", d);
    //console.log("n:", n.toString());
    //console.log("p:", p.toString());
    //console.log("q:", q.toString());

    return publicKeyBase64;
}


async function generatePrime(bits = 1024) {
    let prime;
    do {
        prime = randomBigInt(bits);
    } while (!isPrime(prime));
    return prime;
}


function randomBigInt(bits) {
    const bytes = new Uint8Array(bits / 8);
    crypto.getRandomValues(bytes);
    return BigInt('0x' + [...bytes].map(b => b.toString(16).padStart(2, '0')).join(''));
}

/** Проверка числа на простоту */
function isPrime(n, k = 10) {
    if (n < 2n) return false;
    if (n % 2n === 0n) return n === 2n;
    let r = 0n, d = n - 1n;
    while (d % 2n === 0n) { d /= 2n; r++; }

    for (let i = 0; i < k; i++) {
        const a = 2n + randomBigInt(64) % (n - 3n);
        let x = modExp(a, d, n);
        if (x === 1n || x === n - 1n) continue;
        for (let j = 0; j < r - 1n; j++) {
            x = modExp(x, 2n, n);
            if (x === n - 1n) break;
        }
        if (x !== n - 1n) return false;
    }
    return true;
}

/** Быстрое возведение в степень по модулю (modular exponentiation) */
function modExp(base, exp, mod) {
    let result = 1n;
    base %= mod;
    while (exp > 0) {
        if (exp % 2n === 1n) result = (result * base) % mod;
        base = (base * base) % mod;
        exp /= 2n;
    }
    return result;
}

/** Преобразование BigInt в массив байтов */
function bigIntToBytes(bigint) {
    let hex = bigint.toString(16);
    if (hex.length % 2) hex = '0' + hex;
    const bytes = [];
    for (let i = 0; i < hex.length; i += 2) {
        bytes.push(parseInt(hex.substr(i, 2), 16));
    }
    return new Uint8Array(bytes);
}


generateRSAKeys().then(({ publicKeyBase64 }) => {
    console.log("🔑 Public Key (Base64):", publicKeyBase64);
});

function modInverse(e, phi) {
    let [a, b, x0, x1] = [e, phi, 1n, 0n];
    let phi_original = phi;

    while (a !== 0n) {
        let q = b / a;
        [a, b] = [b % a, a];
        [x0, x1] = [x1 - q * x0, x0];
    }


    if (x1 < 0n) {
        x1 += phi_original;
    }

    return x1;
}

function computePrivateExponent(p, q, e) {
    p = BigInt(p);
    q = BigInt(q);
    e = BigInt(e);

    let phi = (p - 1n) * (q - 1n);
    //console.log("phi (JS):", phi.toString());

    let d = modInverse(e, phi);
    //console.log("d (JS):", d.toString());

    return d.toString();
}

function numberToBase64(num) {
    const hex = num.toString(16).padStart(16, "0");
    const bytes = new Uint8Array(hex.match(/.{2}/g).map(byte => parseInt(byte, 16)));
    return btoa(String.fromCharCode(...bytes));
}

function base64ToNumber(base64) {
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    return BigInt("0x" + Array.from(bytes, b => b.toString(16).padStart(2, "0")).join(""));
}
