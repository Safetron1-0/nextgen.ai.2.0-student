import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Calendar, MapPin, Clock, Plus, X, Building2 } from "lucide-react";
import { eventApi } from "../api/api";
import Navbar from "../components/Navbar";

interface EventItem {
  id: number;
  title: string;
  description: string;
  eventDate: string;
  eventTime: string;
  location: string;
  companyName: string;
  eventType: string;
}

export default function Events() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    title: "", description: "", eventDate: "", eventTime: "", location: "", eventType: "DRIVE"
  });

  useEffect(() => { loadEvents(); }, []);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventApi.getAll();
      setEvents(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load events:", err);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      await eventApi.create(formData);
      setShowForm(false);
      setFormData({ title: "", description: "", eventDate: "", eventTime: "", location: "", eventType: "DRIVE" });
      loadEvents();
    } catch (err) {
      console.error("Failed to create event:", err);
    }
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case "DRIVE": return "event-type-drive";
      case "WORKSHOP": return "event-type-workshop";
      case "DEADLINE": return "event-type-deadline";
      case "INTERVIEW": return "event-type-interview";
      default: return "";
    }
  };

  // Group events by month
  const groupedEvents: Record<string, EventItem[]> = {};
  events.forEach(event => {
    const month = event.eventDate ? new Date(event.eventDate).toLocaleString("en", { month: "long", year: "numeric" }) : "Unknown";
    if (!groupedEvents[month]) groupedEvents[month] = [];
    groupedEvents[month].push(event);
  });

  return (
    <div className="app-layout">
      <Navbar />
      <main className="main-content">
        <div className="page-header">
          <div className="page-header-left">
            <Calendar size={28} className="page-icon" />
            <div>
              <h1>Events & Calendar</h1>
              <p>Upcoming placement drives, workshops, and deadlines</p>
            </div>
          </div>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Propose Event
          </button>
        </div>

        {/* Propose Event Modal */}
        {showForm && (
          <div className="modal-overlay" onClick={() => setShowForm(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2>Propose New Event</h2>
                <button className="modal-close" onClick={() => setShowForm(false)}><X size={20} /></button>
              </div>
              <form onSubmit={handleSubmit} className="event-form">
                <div className="form-group">
                  <label>Event Title</label>
                  <input type="text" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder="e.g. Google On-Campus Drive" required />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Date</label>
                    <input type="date" value={formData.eventDate} onChange={e => setFormData({ ...formData, eventDate: e.target.value })} required />
                  </div>
                  <div className="form-group">
                    <label>Time</label>
                    <input type="time" value={formData.eventTime} onChange={e => setFormData({ ...formData, eventTime: e.target.value })} />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Location</label>
                    <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="e.g. Auditorium Hall A" />
                  </div>
                  <div className="form-group">
                    <label>Event Type</label>
                    <select value={formData.eventType} onChange={e => setFormData({ ...formData, eventType: e.target.value })}>
                      <option value="DRIVE">Placement Drive</option>
                      <option value="WORKSHOP">Workshop</option>
                      <option value="DEADLINE">Deadline</option>
                      <option value="INTERVIEW">Interview</option>
                    </select>
                  </div>
                </div>
                <div className="form-group">
                  <label>Description</label>
                  <textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Event details..." rows={3} />
                </div>
                <button type="submit" className="btn-primary btn-full">Create Event</button>
              </form>
            </div>
          </div>
        )}

        {loading ? (
          <div className="loading-screen"><div className="spinner" /><p>Loading events...</p></div>
        ) : events.length === 0 ? (
          <div className="empty-page">
            <Calendar size={64} className="empty-icon" />
            <h3>No events scheduled</h3>
            <p>Be the first to propose a placement event or workshop!</p>
          </div>
        ) : (
          <div className="events-timeline">
            {Object.entries(groupedEvents).map(([month, monthEvents]) => (
              <div key={month} className="event-month-group">
                <h3 className="month-label">{month}</h3>
                <div className="event-cards">
                  {monthEvents.map(event => (
                    <div key={event.id} className="event-card">
                      <div className="event-date-box">
                        <span className="event-day">{new Date(event.eventDate).getDate()}</span>
                        <span className="event-month-short">{new Date(event.eventDate).toLocaleString("en", { month: "short" })}</span>
                      </div>
                      <div className="event-details">
                        <div className="event-header-row">
                          <h4>{event.title}</h4>
                          <span className={`event-type-badge ${getEventTypeColor(event.eventType)}`}>{event.eventType}</span>
                        </div>
                        {event.description && <p className="event-desc">{event.description}</p>}
                        <div className="event-meta">
                          {event.eventTime && <span><Clock size={14} /> {event.eventTime}</span>}
                          {event.location && <span><MapPin size={14} /> {event.location}</span>}
                          {event.companyName && <span><Building2 size={14} /> {event.companyName}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
