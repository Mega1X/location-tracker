import React, { useState, useEffect, useMemo } from 'react';
import { db } from './firebase';
import { doc, onSnapshot, updateDoc, setDoc, collection, addDoc, query, orderBy, limit, serverTimestamp, deleteDoc } from 'firebase/firestore';
import { MapPin, Clock, Send, Unlock, Lock, Trash2, Plus, X, MessageSquare, CheckCircle, Zap, Bell } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const LOCATIONS = [
  { name: "Library", color: "#00f2ff" },
  { name: "Meeting", color: "#ff0055" },
  { name: "Busy", color: "#ff00c8" },
  { name: "Middle School", color: "#fbbf24" },
  { name: "Lower School", color: "#7000ff" },
  { name: "Upper School", color: "#00ff00" },
  { name: "Office", color: "#006aff" }
];

const ADMIN_PIN = "6342";

// Helper: safely format a Firestore Timestamp or JS Date
const formatTime = (ts) => {
  if (!ts) return '--:--';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '--:--';
  }
};

const formatDateTime = (ts) => {
  if (!ts) return '';
  try {
    const date = ts?.toDate ? ts.toDate() : new Date(ts);
    return date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return '';
  }
};

// --- Multi-Layered Sci-Fi Rain ---
const SciFiRain = () => {
  const generateDrops = (count, speedRange, heightRange) => {
    return Array.from({ length: count }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 5}s`,
      duration: `${speedRange[0] + Math.random() * speedRange[1]}s`,
      height: `${heightRange[0] + Math.random() * heightRange[1]}px`,
      opacity: 0.1 + Math.random() * 0.4
    }));
  };

  const layers = useMemo(() => [
    { id: 'back', drops: generateDrops(15, [4, 6], [40, 60]) },
    { id: 'mid', drops: generateDrops(15, [2.5, 3.5], [60, 100]) },
    { id: 'front', drops: generateDrops(10, [1.5, 2], [100, 150]) }
  ], []);

  return (
    <div className="rain-container">
      {layers.map(layer => (
        <div key={layer.id} className="rain-layer">
          {layer.drops.map(drop => (
            <div
              key={drop.id}
              className="rain-drop"
              style={{
                left: drop.left,
                height: drop.height,
                animationDelay: drop.delay,
                animationDuration: drop.duration,
                opacity: drop.opacity
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
};

// --- Schedule Add Modal ---
const ScheduleModal = ({ onClose, onSave }) => {
  const [location, setLocation] = useState('');
  const [dateLabel, setDateLabel] = useState('');

  const handleSave = () => {
    if (location.trim() && dateLabel.trim()) {
      onSave(location.trim(), dateLabel.trim());
    }
  };

  return (
    <motion.div
      className="schedule-modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="schedule-modal"
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
      >
        <div className="schedule-modal-header">
          <h3 className="label-neon">Add Schedule Entry</h3>
          <button className="modal-close-btn" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="schedule-modal-body">
          <label className="modal-label">Where?</label>
          <input
            className="input-terminal input-inline"
            autoFocus
            placeholder="e.g. Library, Office…"
            value={location}
            onChange={e => setLocation(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
          <label className="modal-label">When?</label>
          <input
            className="input-terminal input-inline"
            placeholder="e.g. Mon 9am, After recess…"
            value={dateLabel}
            onChange={e => setDateLabel(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
          />
        </div>
        <button
          className="btn-transmit"
          disabled={!location.trim() || !dateLabel.trim()}
          onClick={handleSave}
        >
          <Plus size={18} /> Add Entry
        </button>
      </motion.div>
    </motion.div>
  );
};

function App() {
  const [status, setStatus] = useState({ location: 'Office', lastUpdated: null });
  const [schedule, setSchedule] = useState([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isPinMode, setIsPinMode] = useState(false);
  const [pin, setPin] = useState('');
  const [pinError, setPinError] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [noteContent, setNoteContent] = useState('');
  const [isNoteDrawerOpen, setIsNoteDrawerOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [activeTab, setActiveTab] = useState('status');
  const [showScheduleModal, setShowScheduleModal] = useState(false);

  // Keyboard shortcut: Ctrl+Shift+A opens the PIN screen
  useEffect(() => {
    const handleKey = (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'A') {
        e.preventDefault();
        setIsPinMode(true);
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  // Firebase listeners
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "sign", "status"), (docSnap) => {
      if (docSnap.exists()) setStatus(docSnap.data());
      else setDoc(doc(db, "sign", "status"), { location: "Office", lastUpdated: serverTimestamp() });
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "schedule"), orderBy("date", "asc"), limit(3));
    const unsub = onSnapshot(q, (snapshot) => {
      setSchedule(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "notes"), orderBy("timestamp", "desc"));
    const unsub = onSnapshot(q, (snapshot) => {
      setNotes(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, []);

  const unreadCount = notes.filter(n => n.read === false).length;

  const handlePinInput = (e) => {
    const val = e.target.value.replace(/\D/g, '').slice(0, 4);
    setPin(val);
    setPinError(false);
    if (val === ADMIN_PIN) {
      setIsAdmin(true);
      setIsPinMode(false);
      setPin('');
    } else if (val.length === 4) {
      setPinError(true);
      setTimeout(() => { setPin(''); setPinError(false); }, 800);
    }
  };

  const updateLocation = async (locName) => {
    try {
      setUpdating(true);
      await updateDoc(doc(db, "sign", "status"), { location: locName, lastUpdated: serverTimestamp() });
    } catch (err) {
      console.error(err);
      alert("Error updating location: " + err.message);
    } finally {
      setUpdating(false);
    }
  };

  const markNoteAsRead = async (noteId) => {
    try {
      await updateDoc(doc(db, "notes", noteId), { read: true });
    } catch (err) {
      console.error(err);
    }
  };

  const deleteNote = async (noteId) => {
    try {
      await deleteDoc(doc(db, "notes", noteId));
    } catch (err) {
      console.error(err);
    }
  };

  const addScheduleEntry = async (location, dateLabel) => {
    try {
      await addDoc(collection(db, "schedule"), { location, dateLabel, date: new Date() });
      setShowScheduleModal(false);
    } catch (err) {
      alert("Error adding schedule: " + err.message);
    }
  };

  const normalizedStatus = status.location.toLowerCase().replace(/\s/g, '');
  const locationInfo = LOCATIONS.find(l => l.name.toLowerCase().replace(/\s/g, '') === normalizedStatus) || LOCATIONS[LOCATIONS.length - 1];

  return (
    <div className="app-root" style={{ '--theme-color': locationInfo.color }}>
      <div className="app-container"><div className="mesh-background" /></div>
      <SciFiRain />

      {/* Invisible admin trigger — no icon, no hint for other users */}
      <div className="secret-trigger-zone" onClick={() => setIsPinMode(true)} />

      {/* Schedule Add Modal */}
      <AnimatePresence>
        {showScheduleModal && (
          <ScheduleModal
            onClose={() => setShowScheduleModal(false)}
            onSave={addScheduleEntry}
          />
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {isPinMode ? (
          <motion.div key="pin" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="holographic-panel pin-panel">
            <Lock size={56} className="pin-lock-icon" />
            <h2 className="pin-title">AUTH NEEDED</h2>
            <p className="label-neon">Enter Teacher PIN</p>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              autoFocus
              className={`pin-terminal ${pinError ? 'pin-error' : ''}`}
              value={pin}
              onChange={handlePinInput}
              placeholder="● ● ● ●"
            />
            {pinError && <p className="pin-error-msg">Incorrect PIN</p>}
            <button className="pin-cancel-btn" onClick={() => { setIsPinMode(false); setPin(''); setPinError(false); }}>
              Cancel
            </button>
          </motion.div>

        ) : isAdmin ? (
          <motion.div key="admin" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="holographic-panel admin-panel">
            {/* Admin Header */}
            <div className="admin-header">
              <div className="admin-header-left">
                <div className="admin-icon-wrap"><Unlock size={28} /></div>
                <h2 className="admin-title">Teaching Base</h2>
              </div>
              <button onClick={() => setIsAdmin(false)} className="admin-close-btn"><X size={26} /></button>
            </div>

            {/* Tabs */}
            <div className="holo-tab-container">
              <button className={`holo-tab ${activeTab === 'status' ? 'active' : ''}`} onClick={() => setActiveTab('status')}>
                Location
              </button>
              <button className={`holo-tab ${activeTab === 'messages' ? 'active' : ''}`} onClick={() => setActiveTab('messages')}>
                Messages
                {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
              </button>
              <button className={`holo-tab ${activeTab === 'schedule' ? 'active' : ''}`} onClick={() => setActiveTab('schedule')}>
                Schedule
              </button>
            </div>

            <div className="admin-content custom-scrollbar">
              {activeTab === 'status' && (
                <div className="location-grid">
                  {LOCATIONS.map(loc => (
                    <button
                      key={loc.name}
                      disabled={updating}
                      onClick={() => updateLocation(loc.name)}
                      className={`holo-btn ${status.location === loc.name ? 'active' : ''}`}
                    >
                      <div className="loc-dot" style={{ backgroundColor: loc.color }} />
                      <span>{loc.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {activeTab === 'messages' && (
                <div className="messages-tab">
                  {notes.length === 0 ? (
                    <div className="empty-state">
                      <MessageSquare size={40} className="empty-icon" />
                      <p>No messages yet</p>
                    </div>
                  ) : (
                    <div className="notes-list">
                      {notes.map(n => (
                        <div
                          key={n.id}
                          className={`holo-card-mini note-card ${n.read === false ? 'unread' : ''}`}
                        >
                          <p className="note-content">{n.content}</p>
                          <div className="note-footer">
                            <div className="note-time">
                              <Clock size={10} />
                              {formatDateTime(n.timestamp)}
                            </div>
                            <div className="note-actions">
                              {n.read === false && (
                                <button className="note-action-btn read-btn" onClick={() => markNoteAsRead(n.id)} title="Mark as read">
                                  <CheckCircle size={16} />
                                </button>
                              )}
                              <button className="note-action-btn delete-btn" onClick={() => deleteNote(n.id)} title="Delete">
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {activeTab === 'schedule' && (
                <div className="schedule-tab">
                  <button onClick={() => setShowScheduleModal(true)} className="holo-btn add-schedule-btn">
                    <Plus size={18} /> Add Entry
                  </button>
                  {schedule.length === 0 ? (
                    <div className="empty-state">
                      <Clock size={40} className="empty-icon" />
                      <p>No schedule entries</p>
                    </div>
                  ) : (
                    <div className="notes-list">
                      {schedule.map(item => (
                        <div key={item.id} className="holo-card-mini schedule-card">
                          <div className="schedule-card-info">
                            <div className="label-neon" style={{ marginBottom: '0.25rem', fontSize: '0.6rem' }}>{item.dateLabel}</div>
                            <div className="schedule-location">{item.location}</div>
                          </div>
                          <button
                            className="note-action-btn delete-btn"
                            onClick={() => deleteDoc(doc(db, "schedule", item.id))}
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>

        ) : isNoteDrawerOpen ? (
          <motion.div key="compose" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} className="holographic-panel compose-panel">
            <div className="compose-header">
              <h3 className="compose-title">Signal Protocol</h3>
              <button className="admin-close-btn" onClick={() => setIsNoteDrawerOpen(false)}><X size={28} /></button>
            </div>
            <textarea
              className="input-terminal"
              autoFocus
              placeholder="Type your message for the teacher…"
              value={noteContent}
              onChange={(e) => setNoteContent(e.target.value)}
            />
            <button
              className="btn-transmit"
              disabled={!noteContent.trim()}
              onClick={async () => {
                if (!noteContent.trim()) return;
                await addDoc(collection(db, "notes"), {
                  content: noteContent,
                  timestamp: serverTimestamp(),
                  read: false
                });
                setNoteContent('');
                setIsNoteDrawerOpen(false);
              }}
            >
              <Send size={20} /> <span>Send Message</span>
            </button>
          </motion.div>

        ) : (
          <motion.div key="display" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="holographic-panel display-panel">
            {/* Status Circle */}
            <div className="status-hub">
              <div className="label-neon">Location Beacon</div>
              <h1
                className="location-title"
                style={{
                  backgroundImage: `linear-gradient(to bottom, #fff, ${locationInfo.color})`,
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent'
                }}
              >
                {status.location}
              </h1>
              <div className="time-pill">
                <Clock size={12} style={{ display: 'inline', marginRight: '6px' }} />
                {formatTime(status.lastUpdated)}
              </div>
            </div>

            {/* Schedule Strip */}
            <div className="schedule-strip">
              {schedule.map(item => (
                <div key={item.id} className="holo-card-mini schedule-chip">
                  <div className="label-neon chip-label">{item.dateLabel}</div>
                  <div className="chip-location">{item.location}</div>
                </div>
              ))}
              {schedule.length === 0 && (
                <div className="holo-card-mini schedule-chip no-data">
                  <p className="chip-location" style={{ opacity: 0.4, fontSize: '0.65rem' }}>No Schedule Data</p>
                </div>
              )}
            </div>

            {/* Signal Hub CTA */}
            <button className="holo-btn holo-btn-col signal-hub-btn" onClick={() => setIsNoteDrawerOpen(true)}>
              <Send size={28} className="signal-icon" />
              <h3 className="signal-title">Signal Hub</h3>
              <p className="signal-sub">Leave a message for the teacher</p>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default App;
