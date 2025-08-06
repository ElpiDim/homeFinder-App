import React, { useEffect, useState } from 'react';
import { getFavorites, removeFavorite } from '../services/favoritesService';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { Container, Button, Card, Row, Col } from 'react-bootstrap';

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
      setFavorites((prev) =>
        prev.filter((fav) => fav.propertyId && fav.propertyId._id !== propertyId)
      );
    } catch (error) {
      console.error('Error removing favorite:', error);
    }
  };

  return (
    <Container className="my-5">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h3 className="fw-bold mb-0">⭐ Your Favorite Properties</h3>
        <Button variant="outline-secondary" onClick={() => navigate('/dashboard')}>
          ← Back to Dashboard
        </Button>
      </div>

      {favorites.length === 0 ? (
        <p className="text-muted">You haven’t added any favorites yet.</p>
      ) : (
        <Row className="g-4">
          {favorites
            .filter((fav) => fav.propertyId)
            .map((fav) => {
              const prop = fav.propertyId;
              return (
                <Col md={6} lg={4} key={prop._id}>
                  <Card className="h-100 shadow-sm border-0">
                    <Link to={`/property/${prop._id}`} className="text-decoration-none text-dark">
                      <div
                        style={{
                          height: '200px',
                          backgroundImage: `url(${prop.images?.[0] || 'https://via.placeholder.com/400x200?text=No+Image'})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          borderTopLeftRadius: '0.5rem',
                          borderTopRightRadius: '0.5rem'
                        }}
                      />
                      <Card.Body>
                        <Card.Title>{prop.title}</Card.Title>
                        <Card.Text className="text-muted mb-2">
                          📍 {prop.location} <br />
                          💶 {prop.price} € <br />
                          🏷️ {prop.type}
                        </Card.Text>
                      </Card.Body>
                    </Link>
                    <Card.Footer className="bg-white border-0 text-end">
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveFavorite(prop._id)}
                      >
                        Remove
                      </Button>
                    </Card.Footer>
                  </Card>
                </Col>
              );
            })}
        </Row>
      )}
    </Container>
  );
}

export default Favorites;
