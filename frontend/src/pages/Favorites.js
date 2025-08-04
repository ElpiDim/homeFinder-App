import React, { useEffect, useState } from 'react';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import { useAuth } from '../context/AuthContext';
import { Container, Button, Card } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

function Favorites() {
  const { user } = useAuth();
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
      setFavorites(favorites.filter(fav => fav.propertyId && fav.propertyId._id !== propertyId));
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <Container className="mt-5">
      <Button
        variant="outline-secondary"
        className="mb-3"
        onClick={() => navigate('/dashboard')}
      >
        Back
      </Button>

      <h3 className="mb-4">Your Favorites</h3>

      {favorites.length === 0 ? (
        <p>You have no favorites yet.</p>
      ) : (
        favorites
          .filter(fav => fav.propertyId)
          .map(fav => {
            const prop = fav.propertyId;
            return (
              <Card key={prop._id} className="mb-3 p-3">
                <Card.Body>
                  <Card.Title>{prop.title}</Card.Title>
                  <Card.Text>
                    <strong>Price:</strong> {prop.price} €
                  </Card.Text>
                  <Button variant="danger" onClick={() => handleRemoveFavorite(prop._id)}>
                    Remove
                  </Button>
                </Card.Body>
              </Card>
            );
          })
      )}
    </Container>
  );
}

export default Favorites;
