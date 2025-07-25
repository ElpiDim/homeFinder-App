import React from 'react';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import { useAuth } from '../context/AuthContext';
import {Container, Button, Card} from 'react-bootstrap';
import { useState } from 'react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';


function Favorites() {

  const {user } = useAuth();
  const [favorites, setFavorites] = useState([]);
  const token = localStorage.getItem('token');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchFavorites = async () => {
      try {
        const data = await getFavorites(token);
        setFavorites(data);
      } catch (error) {
        console.error('Error fetching favorites:', error);
      }
    };

    fetchFavorites();
  }, [token]);

  const handleRemoveFavorite = async (propertyId) => {
    try { 
      await removeFavorite(propertyId, token);
      setFavorites(favorites.filter(fav => fav.propertyId !== propertyId));
    } catch (error) { 
      console.error('Error removing favorite:', error);
    }
  };

  return (
     <Container className="mt-5">
      <Button 
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate('/dashboard')}>
          Back 
        </Button>

       <h3 className="mb-4">Your Favorites</h3>
      {favorites.length === 0 ? (
        <p>You have no favorites yet.</p>
      ) : (
        favorites.map((fav) => (
          <Card key={fav._id} className="mb-3">
            <Card.Body>
              <Card.Title>{fav.propertyId?.title}</Card.Title>
              <Card.Text>{fav.propertyId?.location}</Card.Text>
              <Card.Text><strong>Price:</strong> €{fav.propertyId?.price}</Card.Text>
              <Button variant="danger" onClick={() => handleRemoveFavorite(fav.propertyId._id)}>Remove</Button>
            </Card.Body>
            </Card>
        ))
      )}
    </Container>
  );
}

export default Favorites;

