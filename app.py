from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime
import base64
from Crypto.Util.number import bytes_to_long, long_to_bytes


e = 65537

app = Flask(__name__, static_folder="static")

# Настройки базы данных
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///default.db"  # База по умолчанию
app.config["SQLALCHEMY_BINDS"] = {
    "messages": "sqlite:///messages.db",
    "keys": "sqlite:///keys.db"
}
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# Создаём объект SQLAlchemy после конфигурации
db = SQLAlchemy(app)

CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


class Key(db.Model):
    __bind_key__ = "keys"
    id = db.Column(db.Integer, primary_key=True)
    token = db.Column(db.String(50), unique=True, nullable=False)
    public_key = db.Column(db.Text, nullable=False)


class Message(db.Model):
    __bind_key__ = "messages"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), nullable=False)
    sender_token = db.Column(db.String(50), nullable=False)
    receiver_token = db.Column(db.String(50), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

# Создаём все таблицы
with app.app_context():
    db.create_all()

@app.route("/")
def home():
    messages = Message.query.order_by(Message.date).all()
    return render_template("index.html", messages=messages)


@app.route("/send_message", methods=["POST"])
def send_message():
    data = request.json
    print("📥 Полученные данные:", data)

    username = data.get("username")
    sender_token = data.get("sender_token")
    receiver_token = data.get("receiver_token")
    message_text = data.get("message")

    if not sender_token or not receiver_token or not message_text:
        print("❌ Ошибка: Недостаточно данных")
        return jsonify({"error": "Недостаточно данных"}), 400


    message_date = datetime.now()

    N = get_PubKey(receiver_token)

    if N is None:
        print("❌ Ошибка: Публичный ключ не найден, невозможно зашифровать сообщение!")
        return jsonify({"error": "Публичный ключ не найден"}), 400  # Возвращаем ошибку

    print(type(N), N)
    new_message = Message(
        username=username,
        sender_token=sender_token,
        receiver_token=receiver_token,
        text=str(pow(bytes_to_long(message_text.encode('utf-8')), e, N)),
        date=message_date
    )

    db.session.add(new_message)
    db.session.commit()

    socketio.emit("new_message", {
        "username": new_message.username,
        "text": new_message.text,
        "date": new_message.date.strftime("%H:%M"),  # Форматируем в HH:MM
        "receiver_token": new_message.receiver_token
    })

    return jsonify({
        "status": "success",
        "username": username,
        "message": message_text,
        "date": message_date.strftime("%Y-%m-%d %H:%M:%S")  # Отправляем нормальное время
    })

@app.route("/add_key", methods=["POST"])
def add_key():
    data = request.json
    token = data.get("token")
    public_key = str(data.get("public_key"))



    existing_key = db.session.execute(db.select(Key).filter_by(token=token)).scalar()
    if existing_key:
        print(f"⚠️ Токен {token} уже существует!")
        return jsonify({"error": "Такой токен уже существует"}), 400


    print('public_key',public_key)
    new_key = Key(
        token=token,
        public_key=public_key
    )

    db.session.add(new_key)
    db.session.commit()

    socketio.emit("new_message", {
        "token": new_key.token,
        "public_key": new_key.public_key,
    })

    return jsonify({
        "status": "success",
        "token": token,
        "public_key": public_key,
    })


import base64


def get_PubKey(friend_token):
    if not friend_token:
        print("❌ Ошибка: Не передан friend_token")
        return None  # Вернём None вместо JSON-ошибки

    my_entry = Key.query.filter_by(token=friend_token).first()

    if not my_entry:
        print(f"❌ Ошибка: Токен {friend_token} не найден в базе!")
        return None  # Вернём None вместо JSON-ошибки

    try:
        public_key_bytes = base64.b64decode(my_entry.public_key)
        public_key = int.from_bytes(public_key_bytes, byteorder="big")
        print("🔑 Публичный ключ найден:", public_key)
        return public_key
    except Exception as e:
        print("❌ Ошибка декодирования ключа:", e)
        return None  # Вернём None при ошибке


@socketio.on("join")
def on_join(data):
    token = data.get("token")
    join_room(token)
    emit("joined", {"message": f"Вы подключены как {token}"}, room=token)


@app.route("/faq")
def faq():
    return render_template("faq.html")

@app.route("/about")
def about():
    return render_template("about.html")


@app.route("/clear_messages", methods=["POST"])
def clear_messages():
    try:
        Message.session.query(Message).delete()
        Message.session.commit()

        Key.session.query(Key).delete()
        Key.session.commit()

        print("✅ Сообщения и ключи удалены из обеих баз данных")
        return jsonify({"status": "success", "message": "Чат и ключи очищены"})
    except Exception as e:
        Message.session.rollback()
        Key.session.rollback()
        print("❌ Ошибка очистки:", str(e))
        return jsonify({"error": "Ошибка очистки"}), 500




if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)
