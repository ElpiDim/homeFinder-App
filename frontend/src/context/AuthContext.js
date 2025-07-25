import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    // 🔒 Αν δεν υπάρχει token, μην προσπαθείς να κάνεις fetch
    if (!token) {
      console.warn("No token found — user not authenticated.");
      return;
    }

    const fetchUserProfile = async () => {
      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ User profile data:', data);
          setUser({
            name: data.name,
            email: data.email,
            phone: data.phone,
            role: data.role,
            address: data.address,
            occupation: data.occupation,
            salary: data.salary,
          });
        } else {
          console.warn(' Unauthorized or failed profile fetch');
        }
      } catch (error) {
        console.error(' Failed to fetch user profile:', error);
      }
    };

    fetchUserProfile();
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
