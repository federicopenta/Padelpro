from flask import Flask, request, jsonify, render_template
import json
import os
import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

app = Flask(__name__)  # Istanzia l'app Flask

# Nome del file JSON
DB_FILE = 'bookings.json'

# Dizionario per memorizzare i codici di verifica temporanei
verification_codes = {}

# Funzione per leggere i dati dal file JSON
def read_bookings():
    if os.path.exists(DB_FILE):  # Controlla se il file esiste
        with open(DB_FILE, 'r') as file:  # Apre il file in modalità lettura
            return json.load(file)  # Carica e restituisce i dati in formato JSON
    return []  # Restituisce un array vuoto se il file non esiste

# Funzione per scrivere i dati nel file JSON
def write_bookings(bookings):
    with open(DB_FILE, 'w') as file:  # Apre il file in modalità scrittura
        json.dump(bookings, file, indent=4)  # Scrive i dati formattati nel file

# Funzione per inviare email
def send_email(to_email, subject, body):
    from_email = "projectworkpeg@gmail.com"  # Indirizzo email mittente
    from_password = "ydxnzubijfugncjb"  # Password per l'autenticazione

    # Crea un messaggio email 
    msg = MIMEMultipart()
    msg['From'] = from_email
    msg['To'] = to_email
    msg['Subject'] = subject

    msg.attach(MIMEText(body, 'plain'))  # Attacca il corpo del messaggio

    # Imposta il server SMTP
    server = smtplib.SMTP('smtp.gmail.com', 587)  
    server.starttls()  # Avvia TLS
    server.login(from_email, from_password)  # Effettua il login
    server.send_message(msg)  # Invia il messaggio
    server.quit()  # Chiude la connessione con il server

# Genera un codice di verifica casuale di 6 caratteri
def generate_verification_code():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))

# Endpoint per richiedere un codice di verifica via email
@app.route('/request-confirmation', methods=['POST'])
def request_confirmation():
    data = request.get_json()  # Ottiene i dati dalla richiesta JSON
    email = data.get('email')  # Estrae l'email dai dati

    if not email:  # Controlla se l'email è presente
        return jsonify({'error': 'Inserisci email'}), 400  # Restituisce un errore se non presente
    
    # Genera e memorizza il codice di verifica
    code = generate_verification_code()
    verification_codes[email] = code
    
    try:
        send_email(  # Invia l'email con il codice di verifica
            to_email=email,
            subject='Codice di verifica prenotazione',
            body=f'Il tuo codice di verifica è: {code}'
        )
        return jsonify({'success': True, 'message': 'Codice inviato con successo.'})  # Risposta di successo
    except Exception as e:
        return jsonify({'error': str(e)}), 500  # Restituisce un errore se l'invio fallisce

# Endpoint per verificare il codice di conferma
@app.route('/verify-code', methods=['POST'])
def verify_code():
    data = request.get_json()  # Ottiene i dati dalla richiesta JSON
    email = data.get('email')  # Estrae l'email
    code = data.get('code')  # Estrae il codice

    # Controlla se il codice di verifica è corretto
    if verification_codes.get(email) == code:
        del verification_codes[email]  # Rimuove il codice usato
        bookings = [b for b in read_bookings() if b['email'] == email]  # Ottiene le prenotazioni associate all'email
        return jsonify({'success': True, 'bookings': bookings})  # Restituisce le prenotazioni
    else:
        return jsonify({'error': 'Codice di verifica non valido.'}), 400  # Restituisce un errore se il codice è errato

# Endpoint per creare una nuova prenotazione
@app.route('/bookings', methods=['POST'])
def create_booking():
    data = request.get_json()  # Ottiene i dati dalla richiesta JSON
    bookings = read_bookings()  # Legge le prenotazioni esistenti

    # Controlla se il campo è già prenotato per la data e l'ora specificate
    for booking in bookings:
        if (booking['court'] == data['court'] and
            booking['date'] == data['date'] and
            booking['time'] == data['time']):
            return jsonify({'error': 'Questo campo è già prenotato per questa data e ora.'}), 409  # Restituisce un errore di conflitto

    # Crea un nuovo oggetto di prenotazione
    booking = {
        'id': len(bookings) + 1,  # Assegna un ID unico
        'name': data['name'],
        'surname': data['surname'],
        'phone': data['phone'],
        'court': data['court'],
        'date': data['date'],
        'time': data['time'],
        'email': data['email']
    }
    bookings.append(booking)  # Aggiunge la nuova prenotazione alla lista
    write_bookings(bookings)  # Scrive le prenotazioni aggiornate nel file JSON
    
    # Invia una email di conferma
    send_email(
        to_email=booking['email'],
        subject='Conferma Prenotazione Campo di Padel',
        body=f"Grazie {booking['name']} {booking['surname']} per la tua prenotazione.\n\nDettagli prenotazione:\nCampo: {booking['court']}\nData: {booking['date']}\nOra: {booking['time']}\nTelefono: {booking['phone']}"
    )

    return jsonify(booking), 201  # Restituisce i dettagli della prenotazione

# Endpoint per ottenere tutte le prenotazioni
@app.route('/bookings', methods=['GET'])
def get_bookings():
    bookings = read_bookings()  # Ottiene le prenotazioni dal file JSON
    return jsonify(bookings), 200  # Restituisce le prenotazioni

# Endpoint per ottenere una specifica prenotazione per ID
@app.route('/bookings/<int:booking_id>', methods=['GET'])
def get_booking(booking_id):
    bookings = read_bookings()  # Legge tutte le prenotazioni
    booking = next((b for b in bookings if b['id'] == booking_id), None)  # Trova la prenotazione per ID
    
    if booking is None:
        return jsonify({'error': 'Booking not found'}), 404  # Restituisce un errore se non trovata
    return jsonify(booking), 200  # Restituisce la prenotazione

# Endpoint per aggiornare una prenotazione esistente
@app.route('/bookings/<int:booking_id>', methods=['PUT'])
def update_booking(booking_id):
    bookings = read_bookings()  # Legge tutte le prenotazioni
    booking = next((b for b in bookings if b['id'] == booking_id), None)  # Trova la prenotazione per ID
    
    if booking is None:
        return jsonify({'error': 'Booking not found'}), 404  # Restituisce un errore se non trovata
    
    data = request.get_json()  # Ottiene i dati dalla richiesta JSON
    booking.update({  # Aggiorna i dettagli della prenotazione
        'name': data.get('name', booking['name']),
        'surname': data.get('surname', booking['surname']),
        'phone': data.get('phone', booking['phone']),
        'court': data.get('court', booking['court']),
        'date': data.get('date', booking['date']),
        'time': data.get('time', booking['time']),
        'email': data.get('email', booking['email'])  # L'email può rimanere invariata
    })
    write_bookings(bookings)  # Scrive le prenotazioni aggiornate nel file JSON
    return jsonify(booking), 200  # Restituisce la prenotazione aggiornata

# Endpoint per cancellare una prenotazione esistente
@app.route('/bookings/<int:booking_id>', methods=['DELETE'])
def delete_booking(booking_id):
    bookings = read_bookings()  # Legge tutte le prenotazioni
    bookings = [b for b in bookings if b['id'] != booking_id]  # Filtra la prenotazione da eliminare
    write_bookings(bookings)  # Scrive le prenotazioni aggiornate nel file JSON
    return '', 204  # Restituisce un response vuoto per confermare la cancellazione

# Endpoint per rendere disponibile il template principale
@app.route('/')
def index():
    return render_template('index.html')  # Restituisce il template HTML principale

if __name__ == '__main__':
    app.run(debug=True)  # Avvia l'app Flask in modalità debug
