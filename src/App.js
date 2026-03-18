import React, { useState } from 'react';
import axios from 'axios';
import Dashboard from './Dashboard';
import './App.css';

function App() {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  
  // State pentru notificarea tip Toast
  const [toast, setToast] = useState({ message: '', visible: false, type: 'success' });

  // Verificăm la pornire dacă avem deja un user salvat în browser
  const [loggedInUser, setLoggedInUser] = useState(() => {
    const savedUser = localStorage.getItem('app_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: ''
  });
  const [errors, setErrors] = useState({});

  // Funcție ajutătoare pentru afișarea Toast-ului
  const showToast = (message, type = 'success') => {
    setToast({ message, visible: true, type });
    setTimeout(() => {
      setToast({ message: '', visible: false, type });
    }, 4000); // Se închide automat după 4 secunde
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: null });
  };

  const validateForm = () => {
    let isValid = true;
    let newErrors = {};

    if (!formData.email) { newErrors.email = 'Email is required'; isValid = false; }
    if (!formData.password) { newErrors.password = 'Password is required'; isValid = false; }
    
    if (!isLoginMode) {
      if (!formData.firstName) { newErrors.firstName = 'First name is required'; isValid = false; }
      if (!formData.lastName) { newErrors.lastName = 'Last name is required'; isValid = false; }
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);

    try {
      let userToLogin = null;
      let isNewAccount = false;

      if (isLoginMode) {
        // --- LOGIN ---
        const response = await axios.post("http://localhost:8080/users/login", {
          email: formData.email,
          password: formData.password
        });
        userToLogin = response.data;
        isNewAccount = false;
      } else {
        // --- REGISTER + AUTO LOGIN ---
        await axios.post("http://localhost:8080/users/register", formData);
        
        const loginResponse = await axios.post("http://localhost:8080/users/login", {
          email: formData.email,
          password: formData.password
        });
        userToLogin = loginResponse.data;
        isNewAccount = true;
      }

      // --- SUCCES ---
      if (userToLogin) {
        localStorage.setItem('app_user', JSON.stringify(userToLogin));
        setLoggedInUser(userToLogin);

        // Afișăm mesajul corespunzător în Toast
        if (isNewAccount) {
          showToast(`Account created! Welcome, ${userToLogin.firstName}! ✨`);
        } else {
          showToast(`Welcome back, ${userToLogin.firstName}! 👋`);
        }
      }

    } catch (error) {
      // --- TRATAREA ERORILOR (Folosind mesajele din Java) ---
      if (error.response) {
        const status = error.response.status;
        const serverMessage = error.response.data; // Textul din GlobalExceptionHandler

        if (status === 401) {
          // 401 e pentru parolă greșită
          setErrors({ ...errors, password: serverMessage });
        } 
        else if (status === 404 || status === 409 || status === 400 || status === 403) {
          // Erorile legate de email (Invalid domain, Email exists, Not found, Admin creation)
          setErrors({ ...errors, email: serverMessage });
        } 
        else {
          // Orice altă eroare de server
          showToast(`Server error: ${serverMessage}`, 'error'); 
        }
      } else {
        showToast("Network error. Check backend connection.", 'error');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('app_user');
    setLoggedInUser(null);
  };

  const toggleMode = () => {
    setIsLoginMode(!isLoginMode);
    setErrors({});
    setFormData({ firstName: '', lastName: '', email: '', password: '' });
  };

  // Dacă utilizatorul este logat, afișăm Dashboard-ul
  if (loggedInUser) {
    return (
      <>
        <Dashboard 
          user={loggedInUser} 
          onLogout={handleLogout} 
          showToast={showToast} /* PASĂM FUNCȚIA AICI */
        />
        {toast.visible && (
          <div className={`toast-notification ${toast.type}`}>
            {toast.message}
          </div>
        )}
      </>
    );
  }

  // Ecranul de Login/Register
  return (
    <div className="page-background">
      <div className="card">
        <h2 className="title">
          {isLoginMode ? 'Sign In' : 'Sign Up'}
        </h2>
        
        <form onSubmit={handleSubmit} className="input-container">
          {!isLoginMode && (
            <>
              <div className="input-wrapper">
                <input 
                  name="firstName" 
                  placeholder="First Name" 
                  value={formData.firstName}
                  onChange={handleChange} 
                  className="custom-input"
                  style={{ borderColor: errors.firstName ? '#e74c3c' : '' }} 
                />
                {errors.firstName && <span className="error-text">{errors.firstName}</span>}
              </div>

              <div className="input-wrapper">
                <input 
                  name="lastName" 
                  placeholder="Last Name" 
                  value={formData.lastName}
                  onChange={handleChange} 
                  className="custom-input"
                  style={{ borderColor: errors.lastName ? '#e74c3c' : '' }} 
                />
                {errors.lastName && <span className="error-text">{errors.lastName}</span>}
              </div>
            </>
          )}

          <div className="input-wrapper">
            <input 
              name="email" 
              type="email" 
              placeholder="Email" 
              value={formData.email}
              onChange={handleChange} 
              className="custom-input"
              style={{ borderColor: errors.email ? '#e74c3c' : '' }} 
            />
            {errors.email && <span className="error-text">{errors.email}</span>}
          </div>

          <div className="input-wrapper">
            <input 
              name="password" 
              type="password" 
              placeholder="Password" 
              value={formData.password}
              onChange={handleChange} 
              className="custom-input"
              style={{ borderColor: errors.password ? '#e74c3c' : '' }} 
            />
            {errors.password && <span className="error-text">{errors.password}</span>}
          </div>

          <button type="submit" className="custom-button" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : (isLoginMode ? 'Login' : 'Register')}
          </button>
        </form>

        <div className="link-container">
          <span className="link-text">
            {isLoginMode ? "Don't have an account? " : "Already have an account? "}
          </span>
          <span onClick={toggleMode} className="custom-link">
            {isLoginMode ? "Sign Up" : "Sign In"}
          </span>
        </div>
      </div>

      {toast.visible && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}

export default App;