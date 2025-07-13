'use client';

import { useParams } from 'next/navigation';
import styles from '../messages.module.css';
import { useState, useRef, useEffect } from 'react';

type Message = {
  id: number;
  text: string;
  sender: 'me' | 'other';
  timestamp: string;
};

const fakeMessagesInitial: Record<string, Message[]> = {
  chat1: [
    { id: 1, text: 'Hallo, wie geht’s?', sender: 'other', timestamp: '12:01' },
    { id: 2, text: 'Alles klar bei dir?', sender: 'other', timestamp: '12:02' },
    { id: 3, text: 'Kannst du mir die Sendungsnummer durchgeben?', sender: 'other', timestamp: '12:03' },
    { id: 4, text: 'Klar, Moment.', sender: 'me', timestamp: '12:04' },
    { id: 5, text: '123456789', sender: 'me', timestamp: '12:06' },
    { id: 6, text: 'Danke', sender: 'other', timestamp: '12:08' },
    { id: 7, text: 'Sehr gerne, hier kannst du die Sendung verfolgen', sender: 'me', timestamp: '12:09' },
    { id: 8, text: 'https://www.gls-pakete.de/reach-sendungsverfolgung?trackingNumber=72111543731&utm_source=track-and-trace&match=ZN6RXLF7', sender: 'me', timestamp: '12:10' },
  ],
  chat2: [
    { id: 1, text: 'Hey, was läuft?', sender: 'other', timestamp: '09:10' },
    { id: 2, text: 'Nicht viel, bei dir?', sender: 'me', timestamp: '09:11' },
  ],
};

// Funktion um URLs im Text automatisch klickbar zu machen
function linkify(text: string) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);
  return parts.map((part, i) =>
    urlRegex.test(part) ? (
      <a
        key={i}
        href={part}
        target="_blank"
        rel="noopener noreferrer"
        style={{ color: '#0077cc', textDecoration: 'underline' }}
      >
        {part}
      </a>
    ) : (
      part
    )
  );
}

export default function ChatPage() {
  const params = useParams();
const rawChatId = params.chatId;

if (!rawChatId || (Array.isArray(rawChatId) && rawChatId.length === 0)) {
  return <p>Kein Chat ausgewählt.</p>;
}

const chatId = Array.isArray(rawChatId) ? rawChatId[0] : rawChatId;
  

  const chatPartnerNames: Record<string, string> = {
    chat1: 'Max',
    chat2: 'Anna',
  };

  const [messages, setMessages] = useState<Message[]>(fakeMessagesInitial[chatId] || []);
  const [inputValue, setInputValue] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const messageListRef = useRef<HTMLUListElement>(null);

  // Scroll to bottom on new message
  useEffect(() => {
    if (messageListRef.current) {
      messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
    }
  }, [messages]);

  if (!chatId) {
    return <p>Kein Chat ausgewählt.</p>;
  }

  // Nachricht senden
  function sendMessage() {
    if (!inputValue.trim() && !selectedFile) return;

    // Falls eine Datei ausgewählt ist, hier könntest du z.B. den Upload triggern
    if (selectedFile) {
      alert(`Datei wird gesendet: ${selectedFile.name}`);
      setSelectedFile(null);
    }

    if (inputValue.trim()) {
      const newMessage: Message = {
        id: messages.length > 0 ? messages[messages.length - 1].id + 1 : 1,
        text: inputValue.trim(),
        sender: 'me',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages([...messages, newMessage]);
      setInputValue('');
    }
  }

  // Enter Taste für Senden
  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  // Drag & Drop Handling für Datei-Upload (hier nur Demo, keine Upload-Logik)
  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setSelectedFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    e.preventDefault();
  }

  // Datei über Input auswählen
  function handleFileInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
      e.target.value = ''; // reset input
    }
  }

  // Datei entfernen
  function removeSelectedFile() {
    setSelectedFile(null);
  }

  return (
    <div className={styles.container}>
      <div
        className={styles.chatWrapper}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        style={{ position: 'relative' }}
      >
        <h1>Unterhaltung mit {chatPartnerNames[chatId]}</h1>

        {messages.length === 0 ? (
          <p>Keine Nachrichten geladen.</p>
        ) : (
          <ul className={styles.messageList} ref={messageListRef}>
            {messages.map((msg) => (
              <li
                key={msg.id}
                className={`${styles.messageItem} ${
                  msg.sender === 'me' ? styles.messageRight : styles.messageLeft
                }`}
              >
                <div>{linkify(msg.text)}</div>
                <div className={styles.messageMeta}>
                  {msg.sender === 'me' ? 'Du' : chatPartnerNames[chatId]} · {msg.timestamp}
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Vorschau der ausgewählten Datei */}
        {selectedFile && (
          <div className={styles.filePreview}>
            <span>{selectedFile.name}</span>
            <button onClick={removeSelectedFile} aria-label="Datei entfernen">
              ×
            </button>
          </div>
        )}

        <div className={styles.inputWrapper}>
          <textarea
            className={styles.textInput}
            placeholder="Antwort schreiben..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
          />
          <button className={styles.sendButton} onClick={sendMessage}>
            Senden
          </button>
        </div>

        <div className={styles.chatExtras}>
          <label className={styles.fileLabel}>
            Datei anhängen:
            <input
              type="file"
              className={styles.fileInput}
              onChange={handleFileInputChange}
              multiple={false}
            />
          </label>
          <div className={styles.notice}>
            <p>Bitte nur ethisch vertretbare Inhalte schreiben – im Einklang mit unseren AGB.</p>
            <p>Diese Unterhaltung kann zur Qualitätssicherung mitgelesen werden.</p>
            <button className={styles.reportButton}>Unterhaltung / Nutzer melden</button>
          </div>
        </div>
      </div>
    </div>
  );
}
