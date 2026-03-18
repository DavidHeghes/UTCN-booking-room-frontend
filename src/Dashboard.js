import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function Dashboard({ user, onLogout, showToast }) {
  const isAdmin = user?.email?.endsWith('@admin.com');

  const todayFormatted = new Date().toISOString().split('T')[0];

  const [rooms, setRooms] = useState([]);
  const [selectedRoom, setSelectedRoom] = useState(null);
  
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [newRoomData, setNewRoomData] = useState({ name: '', location: '', capacity: '' });

  const [showBookModal, setShowBookModal] = useState(false);
  const [roomToBook, setRoomToBook] = useState(null);
  const [bookingData, setBookingData] = useState({ date: '', startTime: '', endTime: '' });
  const [bookingError, setBookingError] = useState('');
  
  const [occupiedSlots, setOccupiedSlots] = useState([]);

  const ALL_TIME_SLOTS = [
    "08:00", "09:00", "10:00", "11:00", "12:00", 
    "13:00", "14:00", "15:00", "16:00", "17:00", 
    "18:00", "19:00", "20:00", "21:00"
  ];

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showMyReservations, setShowMyReservations] = useState(false);
  const [userReservations, setUserReservations] = useState([]);

  useEffect(() => {
    fetchRooms();
  }, []);

  const fetchRooms = async () => {
    try {
      const response = await axios.get("http://localhost:8080/rooms");
      setRooms(response.data);
    } catch (error) {
      console.error("Error fetching rooms:", error);
    }
  };

  const fetchMyReservations = async () => {
    try {
      const response = await axios.get(`http://localhost:8080/reservations/user/${user.id}`);
      setUserReservations(response.data);
    } catch (error) {
      showToast("Could not load reservations", "error");
    }
  };

  const handleAddRoom = async (e) => {
    e.preventDefault();
    if (!newRoomData.name || !newRoomData.location || !newRoomData.capacity) {
      showToast("Please fill all fields", "error");
      return;
    }
    try {
      const response = await axios.post(`http://localhost:8080/rooms?email=${user.email}`, {
        ...newRoomData,
        capacity: parseInt(newRoomData.capacity)
      });
      setRooms([...rooms, response.data]);
      setNewRoomData({ name: '', location: '', capacity: '' });
      showToast("Room added successfully!", "success"); 
    } catch (error) {
      showToast(error.response?.data || "Error adding room", "error");
    }
  };

  const openDeleteModal = (e, room) => {
    e.stopPropagation();
    setRoomToDelete(room);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    try {
      await axios.delete(`http://localhost:8080/rooms/${roomToDelete.id}?email=${user.email}`);
      setRooms(rooms.filter(room => room.id !== roomToDelete.id));
      setShowDeleteModal(false);
      if (selectedRoom?.id === roomToDelete.id) setSelectedRoom(null);
      showToast("Room deleted!", "success"); 
    } catch (error) {
      showToast(error.response?.data || "Could not delete room", "error");
      setShowDeleteModal(false);
    }
  };

  const openBookModal = (room) => {
    setRoomToBook(room);
    setShowBookModal(true);
    setBookingError(''); 
  };

  const closeBookModal = () => {
    setShowBookModal(false);
    setBookingError(''); 
    setBookingData({ date: '', startTime: '', endTime: '' });
    setOccupiedSlots([]); 
  };

  const handleDateChange = async (e) => {
    const selectedDate = e.target.value;
    setBookingData({ ...bookingData, date: selectedDate, startTime: '', endTime: '' }); 

    if (!selectedDate) {
      setOccupiedSlots([]);
      return;
    }

    try {
      const response = await axios.get(`http://localhost:8080/reservations/room/${roomToBook.id}/date/${selectedDate}`);
      setOccupiedSlots(response.data);
    } catch (error) {
      console.error("Nu am putut aduce intervalele ocupate:", error);
      setOccupiedSlots([]);
    }
  };

  const handleBookRoom = async (e) => {
    e.preventDefault();
    setBookingError(''); 
    const { startTime: start, endTime: end, date } = bookingData;

    if (!start || !end) {
      setBookingError("Please select an available time slot!");
      return; 
    }
    
    try {
      await axios.post("http://localhost:8080/reservations", {
        userId: user.id,
        roomId: roomToBook.id,
        date,
        startTime: start + ":00", 
        endTime: end + ":00"
      });
      showToast("🎉 Room booked successfully!", "success"); 
      closeBookModal(); 
      setSelectedRoom(null);
    } catch (error) {
      setBookingError(error.response?.data || "Error booking room.");
    }
  };

  const handleCancelReservation = async (reservationId) => {
    if (!window.confirm("Are you sure you want to cancel this booking?")) return;

    try {
      await axios.delete(`http://localhost:8080/reservations/${reservationId}?userId=${user.id}`);
      setUserReservations(userReservations.filter(res => res.id !== reservationId));
      showToast("Booking cancelled successfully", "success");
    } catch (error) {
      const serverMessage = error.response?.data || "Could not cancel booking";
      showToast(serverMessage, "error");
    }
  };

  const handleRoomClick = (room) => {
    setSelectedRoom(selectedRoom?.id === room.id ? null : room);
  };

  return (
    <div className="dashboard-container">
      <nav className="navbar">
        {/* AICI ESTE NUMELE MODIFICAT */}
        <h2>UTCN Booking System {isAdmin && <span className="admin-badge">(Admin)</span>}</h2>
        
        <div className="user-menu">
          <button className="logout-button" onClick={onLogout}>Logout</button>
          
          <div className="profile-avatar" onClick={() => setIsMenuOpen(!isMenuOpen)}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </div>

          {isMenuOpen && (
            <div className="profile-dropdown">
              <div className="dropdown-header">
                <div className="header-avatar-large">
                   {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                </div>
                <strong>{user?.firstName} {user?.lastName}</strong>
                <span>{user?.email}</span>
              </div>
              <div className="logout-divider"></div>
              <button className="dropdown-item" onClick={() => { 
                setIsMenuOpen(false); 
                fetchMyReservations(); 
                setShowMyReservations(true); 
              }}>
                📅 My Reservations
              </button>
            </div>
          )}
        </div>
      </nav>

      <div className="content">
        {isAdmin && (
          <div className="admin-panel">
            <h3>⚙️ Add New Room</h3>
            <form onSubmit={handleAddRoom} className="admin-form">
              <input type="text" placeholder="Name" value={newRoomData.name} onChange={(e) => setNewRoomData({...newRoomData, name: e.target.value})} className="custom-input" />
              <input type="text" placeholder="Location" value={newRoomData.location} onChange={(e) => setNewRoomData({...newRoomData, location: e.target.value})} className="custom-input" />
              <input type="number" placeholder="Cap." value={newRoomData.capacity} onChange={(e) => setNewRoomData({...newRoomData, capacity: e.target.value})} className="custom-input" style={{width: '80px'}} />
              <button type="submit" className="custom-button admin-btn">Add</button>
            </form>
          </div>
        )}

        <h3>Available Rooms</h3>
        <div className="rooms-grid">
          {rooms.map((room) => (
            <div key={room.id} className={`room-card ${selectedRoom?.id === room.id ? 'selected' : ''}`} onClick={() => handleRoomClick(room)}>
              <div className="room-card-header">
                <h4>{room.name}</h4>
                {isAdmin && <button className="delete-btn" onClick={(e) => openDeleteModal(e, room)}>🗑️</button>}
              </div>
              
              {/* AICI SUNT BADGE-URILE TALE FRUMOASE */}
              <div className="room-badges">
                <span className="info-badge">📍 {room.location}</span>
                <span className="info-badge">👥 {room.capacity} seats</span>
              </div>

              {selectedRoom?.id === room.id && (
                <div className="room-details">
                  <hr /><button className="reserve-button" onClick={() => openBookModal(room)}>Book Now</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* --- MODAL BOOKING REVIZUIT --- */}
      {showBookModal && (
        <div className="modal-overlay" onClick={closeBookModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>Book: {roomToBook?.name}</h3>
            
            <form onSubmit={handleBookRoom} style={{display: 'flex', flexDirection: 'column', gap: '15px'}}>
              <div style={{ textAlign: 'left' }}>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '5px' }}>Select Date:</label>
                <input 
                  type="date" 
                  required 
                  min={todayFormatted} 
                  value={bookingData.date} 
                  onChange={handleDateChange} 
                  className="custom-input" 
                />
              </div>

              {bookingData.date && (
                <div style={{ textAlign: 'left', marginTop: '10px' }}>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>Select Time Slot (1 Hour):</label>
                  
                  <div className="time-slot-grid">
                    {ALL_TIME_SLOTS.map((slot) => {
                      const isBooked = occupiedSlots.some(res => res.startTime.substring(0, 5) === slot);
                      const slotHour = parseInt(slot.split(":")[0]);
                      const currentHour = new Date().getHours();
                      const isPast = (bookingData.date === todayFormatted) && (slotHour <= currentHour);
                      const isOccupied = isBooked || isPast;
                      const endHour = slotHour + 1;
                      const endTime = `${endHour < 10 ? '0' : ''}${endHour}:00`;
                      const isSelected = bookingData.startTime === slot;

                      return (
                        <button
                          key={slot}
                          type="button"
                          disabled={isOccupied}
                          onClick={() => {
                            setBookingData({ ...bookingData, startTime: slot, endTime: endTime });
                            setBookingError('');
                          }}
                          className={`time-slot-btn ${
                            isOccupied ? 'occupied' : isSelected ? 'selected' : 'available'
                          }`}
                        >
                          {slot} - {endTime}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {bookingError && <div className="error-text" style={{textAlign: 'center', color: '#e74c3c', marginTop: '10px', fontSize: '15px'}}>{bookingError}</div>}
              
              <div className="modal-actions">
                <button type="button" className="cancel-btn" onClick={closeBookModal}>Cancel</button>
                <button type="submit" className="confirm-btn" disabled={!bookingData.startTime}>Confirm Booking</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL MY RESERVATIONS --- */}
      {showMyReservations && (
        <div className="modal-overlay" onClick={() => setShowMyReservations(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '650px', width: '95%'}}>
            <h3>📅 My Reservations</h3>
            <div style={{ maxHeight: '350px', overflowY: 'auto', marginTop: '15px' }}>
              {userReservations.length === 0 ? (
                <p style={{textAlign: 'center', padding: '20px'}}>No bookings found.</p>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{textAlign: 'left', borderBottom: '2px solid #eee'}}>
                      <th style={{padding: '10px'}}>Room</th>
                      <th style={{padding: '10px'}}>Date</th>
                      <th style={{padding: '10px'}}>Interval</th>
                      <th style={{padding: '10px'}}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userReservations.map((res) => (
                      <tr key={res.id} style={{borderBottom: '1px solid #eee'}}>
                        <td style={{padding: '10px', fontWeight: 'bold'}}>{res.room?.name || 'Room '+res.roomId}</td>
                        <td style={{padding: '10px'}}>{res.reservationDate}</td>
                        <td style={{padding: '10px'}}>{res.startTime.substring(0,5)}-{res.endTime.substring(0,5)}</td>
                        <td style={{padding: '10px'}}>
                          <button onClick={() => handleCancelReservation(res.id)} style={{color: '#e74c3c', border: 'none', background: 'none', cursor: 'pointer', fontWeight: 'bold'}}>Cancel</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            <div className="modal-actions" style={{marginTop: '20px'}}>
              <button className="cancel-btn" onClick={() => setShowMyReservations(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL DELETE ROOM ADMIN --- */}
      {showDeleteModal && (
        <div className="modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Confirm Delete</h3>
            <p>Delete room <strong>{roomToDelete?.name}</strong>?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="confirm-btn" onClick={confirmDelete}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;