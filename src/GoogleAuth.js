import React, { useState, useCallback } from 'react';
import { useGoogleLogin } from '@react-oauth/google';

const GoogleAuth = ({ onLoginSuccess }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleApiRequest = useCallback(async (url, options = {}) => {
    const defaultOptions = {
      headers: {
        'Content-Type': 'application/json',
        ...(user?.token && { 'Authorization': `Bearer ${user.token}` }),
      },
    };
    
    const finalOptions = { ...defaultOptions, ...options };
    console.log('API Request:', url, finalOptions);

    const response = await fetch(url, finalOptions);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API Error Response:', errorData);
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
    }
    
    return response.json();
  }, [user]);

  const login = useGoogleLogin({
    onSuccess: (googleResponse) => handleGoogleResponse(googleResponse),
    onError: (error) => {
      console.error('Google Login Error:', error);
      setError('Google Login Failed: ' + error.error_description);
    },
  });

  const handleGoogleResponse = async (googleResponse) => {
    setLoading(true);
    setError(null);
    try {
      console.log('Google Response:', googleResponse);
      const payload = { token: googleResponse.access_token };
      console.log('Payload to server:', payload);

      const apiResponse = await handleApiRequest('/api/auth/google', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      
      console.log('Server Response:', apiResponse);
      setUser(apiResponse);
      onLoginSuccess(apiResponse);
    } catch (err) {
      console.error('Authentication Error:', err);
      setError('Authentication failed: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      {user ? (
        <div>
          <h2>Welcome, {user.username}!</h2>
          <p>Email: {user.email}</p>
          {user.avatar && <img src={user.avatar} alt="User Avatar" />}
          <button onClick={() => setUser(null)}>Logout</button>
        </div>
      ) : (
        <button onClick={() => login()}>Sign in with Google</button>
      )}
      {error && <div style={{color: 'red'}}>{error}</div>}
    </div>
  );
};

export default GoogleAuth;