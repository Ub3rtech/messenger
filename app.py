import uuid
import redis
from flask import Flask, render_template, request, jsonify
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from flask_socketio import SocketIO, emit, join_room
from datetime import datetime

app = Flask(__name__, static_folder="static")
app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///messages.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

db = SQLAlchemy(app)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*")


#redis_client = redis.StrictRedis(host="172.28.128.1", port=6379, decode_responses=True)


class Message(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    sender_token = db.Column(db.String(50), nullable=False)
    receiver_token = db.Column(db.String(50), nullable=False)
    text = db.Column(db.String(500), nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    db.create_all()


@app.route("/")
def home():
    messages = Message.query.order_by(Message.date).all()
    return render_template("index.html", messages=messages)


@app.route("/send_message", methods=["POST"])
def send_message():
    data = request.json
    print("Полученные данные:", data)

    sender_token = data.get("sender_token")
    receiver_token = data.get("receiver_token")
    message_text = data.get("message")
    print("Полученные данные:", data)
    if not sender_token or not receiver_token or not message_text:
        print("Ошибка: Недостаточно данных")
        return jsonify({"error": "Недостаточно данных"}), 400

    new_message = Message(sender_token=sender_token, receiver_token=receiver_token, text=message_text)
    db.session.add(new_message)
    db.session.commit()

    socketio.emit("receive_message", {"sender_token": sender_token, "message": message_text}, room=receiver_token)

    return jsonify({"status": "success", "message": message_text})


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
        Message.query.delete()
        db.session.commit()
        print("Все сообщения удалены из базы данных")
        return jsonify({"status": "success", "message": "Чат очищен"})
    except Exception as e:
        db.session.rollback()
        print("Ошибка очистки базы:", str(e))
        return jsonify({"error": "Ошибка очистки"}), 500


@socketio.on("send_message")
def handle_message(data):
    username, text = data["username"], data["text"]

    # Сохранение в БД
    message = Message(username=username, text=text)
    db.session.add(message)
    db.session.commit()

    # Отправка нового сообщения всем клиентам
    emit("receive_message", {"username": username, "text": text}, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5001, debug=True)
