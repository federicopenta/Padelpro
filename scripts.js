
document.addEventListener('DOMContentLoaded', function() {
    const dateInput = document.getElementById('date'); // Seleziona l'input della data
    const now = new Date(); // Ottiene la data e l'ora attuali
    const today = now.toISOString().split('T')[0]; // Converte la data in formato ISO e mantiene solo la data
    dateInput.setAttribute('min', today); // Imposta la data minima al giorno corrente
    dateInput.value = today; // Imposta la data di default all'input

    // Aggiunge un listener per l'evento 'change' sull'input della data
    dateInput.addEventListener('change', function() {
        const selectedDate = this.value; // Ottiene la data selezionata
        generateTimeSlots(selectedDate); // Genera gli slot temporali per la data selezionata
    });

    generateTimeSlots(today); // Genera gli slot temporali per oggi al caricamento
});

// Alterna la visibilità della sezione di gestione prenotazioni
function toggleManageBookings() {
    const section = document.getElementById('manage-bookings-section');
    section.style.display = section.style.display === 'none' ? 'block' : 'none'; // Mostra/Nasconde la sezione
}

// Genera gli slot temporali disponibili per la data selezionata
function generateTimeSlots(selectedDate) {
    const timeSlotsContainer = document.getElementById('time-slots');
    timeSlotsContainer.innerHTML = ''; // Svuota il contenitore degli slot temporali

    const startTime = 8; // Orario di inizio
    const endTime = 23; // Orario di fine
    const now = new Date(); // Ottiene l'ora corrente

    // Recupera le prenotazioni dal server per la data selezionata
    fetch(`/bookings?date=${selectedDate}`)
        .then(response => response.json()) // Converte la risposta JSON
        .then(data => {
            for (let hour = startTime; hour < endTime; hour++) { // Itera sulle ore
                const timeSlot = document.createElement('div'); // Crea un nuovo div per lo slot di tempo
                timeSlot.className = 'time-slot'; // Assegna una classe per lo stile

                // Crea una stringa per rappresentare l'intervallo di tempo
                const timeString = hour.toString().padStart(2, '0') + ":00 - " + (hour + 1).toString().padStart(2, '0') + ":00";
                const timeLabel = document.createElement('span');
                timeLabel.textContent = timeString; // Imposta il testo dell'orario

                timeSlot.appendChild(timeLabel); // Aggiunge l'etichetta all'elemento dello slot

                // Itera attraverso i campi (fino a 5) per ogni slot temporale
                for (let court = 1; court <= 5; court++) {
                    const slotDateTime = new Date(`${selectedDate}T${hour.toString().padStart(2, '0')}:00`); // Crea un oggetto Data per lo slot
                    const button = document.createElement('button'); // Crea un pulsante per il campo
                    button.textContent = `Campo ${court}`; // Imposta il testo del pulsante
                    button.className = 'field-button'; // Assegna una classe
                    // Disabilita il pulsante se lo slot è passato o già prenotato
                    button.disabled = slotDateTime <= now || isSlotBooked(data, court, selectedDate, hour.toString().padStart(2, '0') + ":00");

                    if (button.disabled) {
                        button.classList.add('disabled'); // Aggiunge la classe disabilitata se non disponibile
                    } else {
                        // Aggiunge un listener per il click se il pulsante non è disabilitato
                        button.addEventListener('click', function() {
                            bookField(court, selectedDate, hour.toString().padStart(2, '0') + ":00");
                        });
                    }
                    timeSlot.appendChild(button); // Aggiunge il pulsante allo slot temporale
                }
                timeSlotsContainer.appendChild(timeSlot); // Aggiunge lo slot di tempo al contenitore
            }
        })
        .catch(error => {
            console.error('Errore nel caricamento degli slot:', error); // Gestisce eventuali errori nella chiamata fetch
        });
}

// Controlla se uno slot è già prenotato
function isSlotBooked(bookings, selectedCourt, selectedDate, timeString) {
    return bookings.some(booking =>
        booking.court.toString() === selectedCourt.toString() && // Controlla se il campo è lo stesso
        booking.date === selectedDate && // Controlla se la data è la stessa
        booking.time === timeString // Controlla se l'orario è lo stesso
    );
}

// Mostra il popup per prenotare un campo e imposta i dati necessari
function bookField(court, date, time) {
    const bookingPopup = document.getElementById('booking-popup');
    bookingPopup.style.display = 'block'; // Mostra il popup di prenotazione
    // Imposta i dati dei posti prenotati nel pulsante di conferma
    document.getElementById('confirm-booking').dataset.court = court;
    document.getElementById('confirm-booking').dataset.date = date;
    document.getElementById('confirm-booking').dataset.time = time;
}

// Richiede un codice di conferma via email
function requestConfirmation() {
    const email = document.getElementById('manage-email').value; // Ottiene l'email dall'input

    fetch('/request-confirmation', {
        method: 'POST', // Metodo POST per inviare la richiesta
        headers: {
            'Content-Type': 'application/json' // Imposta il tipo di contenuto della richiesta
        },
        body: JSON.stringify({ email: email }) // Converte l'email in JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            showPopup("Codice inviato alla tua email."); // Mostra messaggio di successo
            document.getElementById('email-step').style.display = 'none'; // Nasconde la fase di invio email
            document.getElementById('code-step').style.display = 'block'; // Mostra la fase di verifica del codice
        } else {
            showPopup(data.error); // Mostra un messaggio di errore
        }
    })
    .catch(error => {
        console.error('Errore durante la richiesta del codice:', error); // Gestione errori
    });
}

// Verifica il codice di conferma inserito dall'utente
function verifyCode() {
    const emailInput = document.getElementById('manage-email'); // Ottiene l'input email
    const codeInput = document.getElementById('unique-code'); // Ottiene l'input del codice

    if (!emailInput || !codeInput) {
        console.error('Email input o Code input non trovati'); // Messaggio di errore
        return; // Esci se non trovi gli input
    }

    const email = emailInput.value; // Ottiene il valore dell'email
    const code = codeInput.value; // Ottiene il valore del codice

    fetch('/verify-code', {
        method: 'POST', // Metodo POST per inviare il codice
        headers: {
            'Content-Type': 'application/json' // Imposta il tipo di contenuto della richiesta
        },
        body: JSON.stringify({ email: email, code: code }) // Converte i dati in JSON
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('code-step').style.display = 'none'; // Nasconde la fase di verifica del codice
            document.getElementById('bookings-step').style.display = 'block'; // Mostra la fase delle prenotazioni
            displayBookings(data.bookings); // Chiama la funzione per mostrare le prenotazioni
        } else {
            showPopup(data.error); // Mostra un messaggio di errore
        }
    })
    .catch(error => {
        console.error('Errore durante la verifica del codice:', error); // Gestione errori
    });
}

// Mostra le prenotazioni dell'utente
function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookings-list'); // Ottiene la lista delle prenotazioni
    bookingsList.innerHTML = ''; // Svuota la lista

    bookings.forEach(booking => { // Itera su ogni prenotazione
        const li = document.createElement('li'); // Crea un nuovo elemento lista
        li.innerHTML = `
            Prenotazione: Campo ${booking.court}, ${booking.date}, ${booking.time}  
            <button class="cancel" onclick="deleteBooking(${booking.id})">Cancella</button>
            <button class="field-button" onclick="editBooking(${booking.id})">Modifica</button>
        `;
        bookingsList.appendChild(li); // Aggiunge l'elemento lista alla lista delle prenotazioni
    });
}

// Cancella una prenotazione dopo conferma dell'utente
function deleteBooking(bookingId) {
    if (confirm("Sei sicuro di voler cancellare questa prenotazione?")) { // Conferma la cancellazione
        fetch(`/bookings/${bookingId}`, {
            method: 'DELETE' // Invia una richiesta DELETE
        })
        .then(() => {
            showPopup("Prenotazione cancellata."); // Notifica l'utente della cancellazione
            const email = document.getElementById('manage-email').value; // Ottiene l'email
            requestBookingsByEmail(email); // Richiede le prenotazioni per l'email specificata
        })
        .catch(error => {
            console.error('Errore durante la cancellazione della prenotazione:', error); // Gestione errori
        });
        location.reload(); // Ricarica la pagina dopo la cancellazione
    }
}

// Modifica una prenotazione esistente
function editBooking(bookingId) {
    const bookingPopup = document.getElementById('booking-popup'); // Ottiene il popup di modifica
    bookingPopup.style.display = 'block'; // Mostra il popup

    fetch(`/bookings/${bookingId}`) // Recupera i dati della prenotazione
        .then(response => response.json())
        .then(data => {
            document.getElementById('first-name').value = data.name; // Imposta il nome
            document.getElementById('last-name').value = data.surname; // Imposta il cognome
            document.getElementById('phone').value = data.phone; // Imposta il numero di telefono
            // Imposta l'email e rendila non modificabile
            const emailField = document.getElementById('email-booking');
            emailField.value = data.email; // Imposta l'email
            emailField.readOnly = true; // Rendi il campo non modificabile

            // Imposta i dati per la conferma della prenotazione
            const confirmButton = document.getElementById('confirm-booking');
            confirmButton.dataset.court = data.court; // Imposta il campo
            confirmButton.dataset.date = data.date; // Imposta la data
            confirmButton.dataset.time = data.time; // Imposta l'ora
            confirmButton.dataset.bookingId = bookingId; // Imposta l'ID della prenotazione
        })
        .catch(error => {
            console.error('Errore durante il caricamento della prenotazione:', error); // Gestione errori
        });
}

// Conferma una prenotazione (creazione o modifica)
function confirmBooking() {
    const firstName = document.getElementById('first-name').value; // Ottiene il nome
    const lastName = document.getElementById('last-name').value; // Ottiene il cognome
    const phone = document.getElementById('phone').value; // Ottiene il numero di telefono
    const email = document.getElementById('email-booking').value; // Ottiene l'email

    const court = document.getElementById('confirm-booking').dataset.court; // Ottiene il campo
    const date = document.getElementById('confirm-booking').dataset.date; // Ottiene la data
    const time = document.getElementById('confirm-booking').dataset.time; // Ottiene l'ora
    const bookingId = document.getElementById('confirm-booking').dataset.bookingId; // Ottiene l'ID della prenotazione

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/; // Regex per validare l'email
    const phonePattern = /^\d{10}$/; // Regex per validare il numero di telefono

    // Validazione dei campi
    if (!firstName || !lastName || !phone || !email) {
        showPopup("Tutti i campi sono richiesti per la prenotazione."); // Messaggio di errore se qualcosa è vuoto
        closeBookingPopup();
        return;
    }
    
    if (!emailPattern.test(email)) {
        showPopup("Indirizzo email non valido."); // Messaggio di errore per email non valida
        closeBookingPopup();
        return;
    }

    if (!phonePattern.test(phone)) {
        showPopup("Numero di telefono non valido. Assicurati di inserire un numero valido."); // Messaggio di errore per numero non valido
        closeBookingPopup();
        return;
    }

    // Determina se si tratta di una nuova prenotazione o di una modifica
    const method = bookingId ? 'PUT' : 'POST'; // Usa PUT se c'è un bookingId
    const endpoint = bookingId ? `/bookings/${bookingId}` : '/bookings'; // Endpoints differenti per creare o modificare

    fetch(endpoint, {
        method: method,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name: firstName, surname: lastName, phone, court, date, time, email }) // Invia i dati della prenotazione
    })
    .then(response => {
        if (!response.ok) {
            return response.json().then(err => { throw new Error(err.error || 'Errore sconosciuto') }); // Gestione degli errori
        }
        return response.json(); // Converte la risposta JSON
    })
    .then(data => {
        const message = bookingId ? 'Prenotazione modificata con successo.' : `Prenotazione completata per il campo ${court} dalle ${time} il ${date}.`; // Messaggio di successo
        showPopup(message); // Mostra messaggio
        closeBookingPopup(); // Chiude il popup
        if (bookingId) {
            toggleManageBookings(); // Se è una modifica, nasconde la sezione di gestione
        } else {
            generateTimeSlots(date); // Rigenera gli slot se è una nuova prenotazione
        }
    })
    .catch(error => {
        console.error('Errore durante la prenotazione:', error); // Gestione errori
    });
}

// Chiude il popup di prenotazione e resetta i campi
function closeBookingPopup() {
    document.getElementById('booking-popup').style.display = 'none'; // Nasconde il popup
    document.getElementById('first-name').value = ''; // Reset del campo nome
    document.getElementById('last-name').value = ''; // Reset del campo cognome
    document.getElementById('phone').value = ''; // Reset del campo telefono
    document.getElementById('email-booking').value = ''; // Reset del campo email
}

// Mostra le prenotazioni dell'utente
function displayBookings(bookings) {
    const bookingsList = document.getElementById('bookings-list'); // Seleziona la lista delle prenotazioni
    bookingsList.innerHTML = ''; // Svuota la lista

    const now = new Date(); // Data attuale

    bookings.forEach(booking => { // Itera sulle prenotazioni
        const bookingDateTime = new Date(`${booking.date}T${booking.time}`); // Crea un oggetto data per il confronto

        // Visualizza solo le prenotazioni future
        if (bookingDateTime > now) {
            const li = document.createElement('li'); // Crea un nuovo elemento di lista
            li.innerHTML = `
                Prenotazione: Campo ${booking.court}, ${booking.date}, ${booking.time} - 
                <button class="cancel" onclick="deleteBooking(${booking.id})">Cancella</button>
                <button class="field-button" onclick="editBooking(${booking.id})">Modifica</button>
            `;
            bookingsList.appendChild(li); // Aggiunge l'elemento alla lista
        }
    });
}

// Mostra un popup con un messaggio
function showPopup(message) {
    const popup = document.getElementById('popup');
    const overlay = document.getElementById('overlay');
    document.getElementById('popup-message').textContent = message; // Imposta il messaggio nel popup
    popup.style.display = 'block'; // Mostra il popup
    overlay.style.display = 'block'; // Mostra l'overlay
}

// Chiude il popup
function closePopup() {
    document.getElementById('popup').style.display = 'none'; // Nasconde il popup
    document.getElementById('overlay').style.display = 'none'; // Nasconde l'overlay
}
