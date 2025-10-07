import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Row, Col, Form, Button, Modal } from 'react-bootstrap';
import {
  GoogleMap,
  Marker,
  StandaloneSearchBox,
  useJsApiLoader,
} from '@react-google-maps/api';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import Logo from '../components/Logo';
import './AddProperty.css';

const PROPERTY_TYPE_OPTIONS = [
  { value: 'apartment', label: 'Apartment' },
  { value: 'studio_flat', label: 'Studio Flat' },
  { value: 'maisonette', label: 'Maisonette' },
  { value: 'detached_house', label: 'Detached House' },
  { value: 'villa', label: 'Villa' },
  { value: 'loft', label: 'Loft' },
  { value: 'bungalow', label: 'Bungalow' },
  { value: 'building', label: 'Building' },
  { value: 'apartment_complex', label: 'Apartment Complex' },
  { value: 'farm', label: 'Farm' },
  { value: 'houseboat', label: 'Houseboat' },
];

const ORIENTATION_OPTIONS = [
  { value: '', label: 'Select orientation' },
  { value: 'north', label: 'North' },
  { value: 'north-east', label: 'North-East' },
  { value: 'east', label: 'East' },
  { value: 'south-east', label: 'South-East' },
  { value: 'south', label: 'South' },
  { value: 'south-west', label: 'South-West' },
  { value: 'west', label: 'West' },
  { value: 'north-west', label: 'North-West' },
];

const VIEW_OPTIONS = [
  { value: '', label: 'Select view' },
  { value: 'sea', label: 'Sea' },
  { value: 'mountain', label: 'Mountain' },
  { value: 'park', label: 'Park' },
  { value: 'city', label: 'City' },
  { value: 'none', label: 'No specific view' },
];

const ZONE_OPTIONS = [
  { value: '', label: 'Select property zone' },
  { value: 'residential', label: 'Residential' },
  { value: 'agricultural', label: 'Agricultural' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'recreational', label: 'Recreational' },
  { value: 'unincorporated', label: 'Unincorporated' },
];

const HEATING_TYPE_OPTIONS = [
  { value: '', label: 'Select heating type' },
  { value: 'autonomous', label: 'Autonomous' },
  { value: 'central', label: 'Central' },
  { value: 'none', label: 'None' },
];

const HEATING_MEDIUM_OPTIONS = [
  { value: '', label: 'Select heating medium' },
  { value: 'petrol', label: 'Petrol' },
  { value: 'natural gas', label: 'Natural gas' },
  { value: 'gas heating system', label: 'Gas heating system' },
  { value: 'current', label: 'Electric current' },
  { value: 'stove', label: 'Stove' },
  { value: 'thermal accumulator', label: 'Thermal accumulator' },
  { value: 'pellet', label: 'Pellet' },
  { value: 'infrared', label: 'Infrared' },
  { value: 'fan coil', label: 'Fan coil' },
  { value: 'wood', label: 'Wood' },
  { value: 'teleheating', label: 'Teleheating' },
  { value: 'geothermal energy', label: 'Geothermal energy' },
];

const OTHER_HEATING_OPTIONS = [
  { value: 'Air condition', label: 'Air condition' },
  { value: 'Underfloor heating', label: 'Underfloor heating' },
  { value: 'Night power', label: 'Night power' },
];

const LIFESTYLE_FEATURES = [
  { value: 'Secure door', label: 'Secure door' },
  { value: 'Alarm', label: 'Alarm' },
  { value: 'Fireplace', label: 'Fireplace' },
  { value: 'Balcony', label: 'Balcony' },
  { value: 'Internal staircase', label: 'Internal staircase' },
  { value: 'Garden', label: 'Garden' },
  { value: 'Swimming pool', label: 'Swimming pool' },
  { value: 'Playroom', label: 'Playroom' },
  { value: 'Attic', label: 'Attic' },
  { value: 'Solar water heating', label: 'Solar water heating' },
  { value: 'Suitable for students', label: 'Suitable for students' },
  { value: 'Renovated', label: 'Renovated' },
  { value: 'Luxurious', label: 'Luxurious' },
  { value: 'Unfinished', label: 'Unfinished' },
  { value: 'Under construction', label: 'Under construction' },
  { value: 'Neoclassical', label: 'Neoclassical' },
];

const ENERGY_CLASS_OPTIONS = [
  { value: '', label: 'Select energy class' },
  { value: 'A+', label: 'A+' },
  { value: 'A', label: 'A' },
  { value: 'B+', label: 'B+' },
  { value: 'B', label: 'B' },
  { value: 'C', label: 'C' },
  { value: 'D', label: 'D' },
  { value: 'E', label: 'E' },
  { value: 'F', label: 'F' },
  { value: 'G', label: 'G' },
];

const LEASE_DURATION_OPTIONS = [
  { value: '', label: 'Select lease duration' },
  { value: 'short', label: 'Short stay (< 12 months)' },
  { value: 'long', label: 'Long term (≥ 12 months)' },
];

const FAMILY_STATUS_OPTIONS = [
  { value: '', label: 'Any' },
  { value: 'single', label: 'Single' },
  { value: 'couple', label: 'Couple' },
  { value: 'family', label: 'Family' },
];
const GOOGLE_LIBRARIES = ['places'];
const MAP_LOADER_ID = 'add-property-map';
const MAP_CONTAINER_STYLE = { width: '100%', height: '320px' };
const DEFAULT_CENTER = { lat: 37.9838, lng: 23.7275 };

const PHASES = [
  { key: 'overview', label: 'Listing overview' },
  { key: 'location', label: 'Location' },
  { key: 'main', label: 'Main characteristics' },
  { key: 'features', label: 'Features & amenities' },
  { key: 'media', label: 'Media & description' },
  { key: 'contact', label: 'Contact details' },
];

const toNumOrUndef = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

export default function AddProperty() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    title: '',
    description: '',
    city: '',
    area: '',
    address: '',
    price: '',
    type: 'rent',
    status: 'available',
    squareMeters: '',
    plotSize: '',
    floor: '',
    onTopFloor: false,
    orientation: '',
    bedrooms: '',
    bathrooms: '',
    wc: '',
    kitchens: '',
    livingRooms: '',
    propertyType: 'apartment',
    yearBuilt: '',
    parkingSpaces: '',
    furnished: false,
    hasParking: false,
    hasElevator: false,
    hasStorage: false,
    petsAllowed: false,
    smokingAllowed: false,
    view: '',
    propertyZone: '',
    heatingType: '',
    heatingMedium: '',
    energyClass: '',
    monthlyCommonExpenses: '',
    dateAvailable: '',
    videoUrl: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    leaseDuration: '',
    minTenantSalary: '',
    allowedOccupations: '',
    familyStatus: '',
    tenantRequirements_petsAllowed: false,
    tenantRequirements_smokingAllowed: false,
    tenantRequirementsNotes: '',
  });

  const [images, setImages] = useState([]);
  const [floorPlan, setFloorPlan] = useState(null);
  const [featureTags, setFeatureTags] = useState([]);
  const [currentPhase, setCurrentPhase] = useState(0);
  const [showPreview, setShowPreview] = useState(false);
  const [latLng, setLatLng] = useState(null);
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [map, setMap] = useState(null);
  const searchBoxRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const apiKey =
    process.env.REACT_APP_GOOGLE_MAPS_API_KEY ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ||
    '';

  const loaderConfig = apiKey
    ? { id: MAP_LOADER_ID, googleMapsApiKey: apiKey, libraries: GOOGLE_LIBRARIES }
    : { id: MAP_LOADER_ID, libraries: GOOGLE_LIBRARIES };

  const { isLoaded: mapLoaded } = useJsApiLoader(loaderConfig);

  const combinedFeatureTags = useMemo(() => {
    const featureSet = new Set(featureTags);

    if (form.propertyZone) {
      const zoneLabel = ZONE_OPTIONS.find((option) => option.value === form.propertyZone)?.label;
      if (zoneLabel) featureSet.add(`Zone: ${zoneLabel}`);
    }

    if (form.heatingMedium) {
       if (form.type === 'rent' && form.leaseDuration) {
      featureSet.add(
        form.leaseDuration === 'long'
          ? 'Preferred lease: Long term (≥ 12 months)'
          : 'Preferred lease: Short stay (< 12 months)'
      );
    }
      const mediumLabel = HEATING_MEDIUM_OPTIONS.find(
        (option) => option.value === form.heatingMedium
      )?.label;
      if (mediumLabel) featureSet.add(`Heating medium: ${mediumLabel}`);
    }

    if (form.energyClass) {
      const energyLabel = ENERGY_CLASS_OPTIONS.find((option) => option.value === form.energyClass)?.label;
      if (energyLabel) featureSet.add(`Energy class: ${energyLabel}`);
    }

    if (form.dateAvailable) {
      featureSet.add(`Available from: ${form.dateAvailable}`);
    }

    return Array.from(featureSet);
  }, [
    featureTags,
    form.propertyZone,
    form.heatingMedium,
    form.energyClass,
    form.dateAvailable,
    form.type,
    form.leaseDuration,
  ]);
  const onChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const toggleFeatureTag = (value) => {
    setFeatureTags((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const validatePhase = (phaseIndex) => {
    if (phaseIndex === 0) {
      if (!form.title.trim()) return 'Title is required.';
      if (!form.city.trim()) return 'City is required.';
      if (!form.price || Number(form.price) <= 0)
        return 'Please provide a valid positive price.';
      if (form.type === 'rent' && !form.leaseDuration)
        return 'Please select a lease duration.';
    }
    if (phaseIndex === PHASES.length - 1) {
      if (!form.contactName.trim()) return 'Contact name is required.';
      if (!form.contactPhone.trim()) return 'Contact phone is required.';
    }
    return null;
  };

  const validate = () => {
    const priceNum = Number(form.price);
    if (!form.title.trim()) return 'Title is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!Number.isFinite(priceNum) || priceNum <= 0) return 'Price must be a positive number.';
    if (!form.contactName.trim()) return 'Contact name is required.';
    if (!form.contactPhone.trim()) return 'Contact phone is required.';

    const beds = toNumOrUndef(form.bedrooms);
    const baths = toNumOrUndef(form.bathrooms);
    const sqm = toNumOrUndef(form.squareMeters);
    const year = toNumOrUndef(form.yearBuilt);
    const floorNum = toNumOrUndef(form.floor);
    const wcNum = toNumOrUndef(form.wc);
    const kitchensNum = toNumOrUndef(form.kitchens);
    const livingRoomsNum = toNumOrUndef(form.livingRooms);
    const parkingSpacesNum = toNumOrUndef(form.parkingSpaces);
    const maintenanceFee = toNumOrUndef(form.monthlyCommonExpenses);
     const minTenantSalary = toNumOrUndef(form.minTenantSalary);

    if (beds !== undefined && beds < 0) return 'Bedrooms cannot be negative.';
    if (baths !== undefined && baths < 0) return 'Bathrooms cannot be negative.';
    if (sqm !== undefined && sqm <= 0) return 'Square meters must be positive.';
    if (year !== undefined && (year < 1800 || year > new Date().getFullYear()))
      return 'Please enter a valid construction year.';
    if (floorNum !== undefined && floorNum < 0) return 'Floor cannot be negative.';
    if (wcNum !== undefined && wcNum < 0) return 'WC count cannot be negative.';
    if (kitchensNum !== undefined && kitchensNum < 0) return 'Kitchens cannot be negative.';
    if (livingRoomsNum !== undefined && livingRoomsNum < 0)
      return 'Living rooms cannot be negative.';
    if (parkingSpacesNum !== undefined && parkingSpacesNum < 0)
      return 'Parking spaces cannot be negative.';
    if (maintenanceFee !== undefined && maintenanceFee < 0)
      return 'Monthly common expenses cannot be negative.';
     if (minTenantSalary !== undefined && minTenantSalary < 0)
      return 'Minimum tenant salary cannot be negative.';

    return null;
  };

  const submitForm = async () => {
    setMsg('');
    const err = validate();
    if (err) {
      setMsg(err);
      return;
    }

    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('title', form.title.trim());
      if (form.description) fd.append('description', form.description);
      if (form.address) fd.append('address', form.address);
      if (form.propertyType) {
        fd.append('propertyCategory', form.propertyType);
        fd.append('propertyType', form.propertyType);
      }

      const displayLocation = [form.city.trim(), form.area.trim()].filter(Boolean).join(', ');
      fd.append('location', displayLocation);

      fd.append('price', form.price);
      fd.append('type', form.type);
      fd.append('status', form.status);

      if (form.squareMeters) fd.append('squareMeters', form.squareMeters);
      if (form.plotSize) fd.append('plotSize', form.plotSize);
      if (form.floor) fd.append('floor', form.floor);
      fd.append('onTopFloor', form.onTopFloor);
      if (form.orientation) fd.append('orientation', form.orientation);
      if (form.bedrooms) fd.append('bedrooms', form.bedrooms);
      if (form.bathrooms) fd.append('bathrooms', form.bathrooms);
      if (form.wc) fd.append('wc', form.wc);
      if (form.kitchens) fd.append('kitchens', form.kitchens);
      if (form.livingRooms) fd.append('livingRooms', form.livingRooms);
      if (form.parkingSpaces) fd.append('parkingSpaces', form.parkingSpaces);
      if (form.heatingType) fd.append('heatingType', form.heatingType);
      if (form.heatingMedium) fd.append('heatingMedium', form.heatingMedium);
      if (form.energyClass) fd.append('energyClass', form.energyClass);
      if (form.yearBuilt) fd.append('yearBuilt', form.yearBuilt);
      if (form.propertyZone) fd.append('zone', form.propertyZone);
      if (form.monthlyCommonExpenses)
        fd.append('monthlyMaintenanceFee', form.monthlyCommonExpenses);
      if (form.dateAvailable) fd.append('availableFrom', form.dateAvailable);
      if (form.view) fd.append('view', form.view);
      if (form.videoUrl) fd.append('videoUrl', form.videoUrl);
      if (form.contactName) fd.append('contactName', form.contactName);
      if (form.contactPhone) fd.append('contactPhone', form.contactPhone);
      if (form.contactEmail) fd.append('contactEmail', form.contactEmail);
      if (form.type === 'rent' && form.leaseDuration) fd.append('leaseDuration', form.leaseDuration);
      if (form.minTenantSalary) fd.append('minTenantSalary', form.minTenantSalary);
      if (form.allowedOccupations) fd.append('allowedOccupations', form.allowedOccupations);
      if (form.familyStatus) fd.append('familyStatus', form.familyStatus);
      fd.append(
        'tenantRequirements_petsAllowed',
        form.tenantRequirements_petsAllowed ? 'true' : 'false'
      );
      fd.append(
        'tenantRequirements_smokingAllowed',
        form.tenantRequirements_smokingAllowed ? 'true' : 'false'
      );
      if (form.tenantRequirementsNotes)
        fd.append('tenantRequirements_notes', form.tenantRequirementsNotes);
      fd.append('furnished', form.furnished);
      fd.append('petsAllowed', form.petsAllowed);
      fd.append('smokingAllowed', form.smokingAllowed);
      fd.append('parking', form.hasParking);
      fd.append('hasElevator', form.hasElevator);
      fd.append('hasStorage', form.hasStorage);

      if (form.hasParking && !form.parkingSpaces) {
        fd.append('parkingSpaces', '1');
      }

      if (combinedFeatureTags.length > 0) {
        fd.append('features', combinedFeatureTags.join(','));
      }

      images.forEach((file) => fd.append('images', file));
      if (floorPlan) fd.append('floorPlanImage', floorPlan);

      if (latLng) {
        fd.append('latitude', latLng.lat);
        fd.append('longitude', latLng.lng);
      }

      await api.post('/properties', fd);
      setMsg('Property created!');
      navigate('/dashboard', { replace: true });
    } catch (error) {
      console.error('create property failed', error);
      setMsg(error?.response?.data?.message || 'Failed to create property');
    } finally {
      setSaving(false);
    }
  };

  const submit = async (event) => {
    if (event) {
      event.preventDefault();
    }
    if (saving) return;
    await submitForm();
  };

  const handleNextPhase = () => {
    const err = validatePhase(currentPhase);
    if (err) {
      setMsg(err);
      return;
    }
    setMsg('');
    setCurrentPhase((prev) => Math.min(prev + 1, PHASES.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrevPhase = () => {
    setMsg('');
    setCurrentPhase((prev) => Math.max(prev - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePhaseClick = (index) => {
    if (saving) return;
    if (index === currentPhase) return;
    if (index > currentPhase) {
      const err = validatePhase(currentPhase);
      if (err) {
        setMsg(err);
        return;
      }
    }
    setMsg('');
    setCurrentPhase(index);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openPreview = () => {
    setShowPreview(true);
  };

  const closePreview = () => {
    if (!saving) {
      setShowPreview(false);
    }
  };

  const formatBoolean = (value) => (value ? 'Yes' : 'No');

  const onPlacesChanged = () => {
    if (!searchBoxRef.current) return;
    const places = searchBoxRef.current.getPlaces();
    if (!places || !places.length) return;
    const place = places[0];
    if (!place) return;
    const location = place.geometry?.location;
    if (location) {
      const coords = { lat: location.lat(), lng: location.lng() };
      setLatLng(coords);
      setMapCenter(coords);
      if (map) map.panTo(coords);
    }
    if (place.formatted_address) {
      setForm((prev) => (prev.address ? prev : { ...prev, address: place.formatted_address }));
    }
  };

  const onMapClick = (event) => {
    const coords = { lat: event.latLng.lat(), lng: event.latLng.lng() };
    setLatLng(coords);
    setMapCenter(coords);
  };

  if (!user || user.role !== 'owner') {
    return (
      <div className="add-property-container">
        <Card className="add-property-card">
          <Card.Body className="p-4">Only owners can add properties.</Card.Body>
        </Card>
      </div>
    );
  }

  const isLastPhase = currentPhase === PHASES.length - 1;

  return (
    <div className="add-property-container">
      <Card className="add-property-card shadow-lg">
        <Card.Body className="p-4 p-md-5">
          <div className="text-center mb-4">
            <Logo />
            <h3 className="mt-3 mb-1">List a New Property</h3>
            <p className="text-muted mb-0">
              Share details about your property and outline the tenant profile that best matches
              onboarding preferences.
            </p>
          </div>

          <div className="phase-progress mb-4">
            {PHASES.map((phase, index) => (
              <button
                key={phase.key}
                className={`phase-step ${
                  index === currentPhase ? 'active' : index < currentPhase ? 'completed' : ''
                }`}
                type="button"
                onClick={() => handlePhaseClick(index)}
                aria-current={index === currentPhase ? 'step' : undefined}
              >
                <span className="step-index">{index + 1}</span>
                <span className="step-label">{phase.label}</span>
              </button>
            ))}
          </div>

          {msg && (
            <div
              className={`alert ${
                msg.toLowerCase().includes('fail') ? 'alert-danger' : 'alert-success'
              } add-property-alert`}
            >
              {msg}
            </div>
          )}

          <Form onSubmit={submit} noValidate className="add-property-form">
            {currentPhase === 0 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Listing Overview</h5>
                  <p className="section-description mb-0">
                    Basic information that helps clients discover your property during matching.
                  </p>
                </header>

                <Row className="g-3">
                  <Col md={8}>
                    <Form.Group controlId="title">
                      <Form.Label className="field-label">
                        Title <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        name="title"
                        value={form.title}
                        onChange={onChange}
                        placeholder="e.g., Bright 2-bedroom apartment in Athens"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="listing-type">
                      <Form.Label className="field-label">Listing Type</Form.Label>
                      <Form.Select name="type" value={form.type} onChange={onChange}>
                        <option value="rent">Rent</option>
                        <option value="sale">Sale</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="propertyType">
                      <Form.Label className="field-label">
                        Property Type <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Select name="propertyType" value={form.propertyType} onChange={onChange}>
                        {PROPERTY_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="status">
                      <Form.Label className="field-label">Status</Form.Label>
                      <Form.Select name="status" value={form.status} onChange={onChange}>
                        <option value="available">Available</option>
                        <option value="rented">Rented</option>
                        <option value="sold">Sold</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                 {form.type === 'rent' && (
                  <Row className="g-3">
                    <Col md={6}>
                      <Form.Group controlId="leaseDuration">
                        <Form.Label className="field-label">
                          Preferred lease duration <span className="text-danger">*</span>
                        </Form.Label>
                        <Form.Select
                          name="leaseDuration"
                          value={form.leaseDuration}
                          onChange={onChange}
                        >
                          {LEASE_DURATION_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>
                )}

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="price">
                      <Form.Label className="field-label">
                        {form.type === 'sale' ? 'Price (€)' : 'Rent (€)'}{' '}
                        <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="number"
                        min="1"
                        step="1"
                        name="price"
                        value={form.price}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="squareMeters">
                      <Form.Label className="field-label">Property area (m²)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="squareMeters"
                        value={form.squareMeters}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="plotSize">
                      <Form.Label className="field-label">Lot area size (m²)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="plotSize"
                        value={form.plotSize}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="city">
                      <Form.Label className="field-label">
                        City <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        name="city"
                        value={form.city}
                        onChange={onChange}
                        placeholder="e.g., Athens"
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="area">
                      <Form.Label className="field-label">Area</Form.Label>
                      <Form.Control
                        name="area"
                        value={form.area}
                        onChange={onChange}
                        placeholder="e.g., Koukaki"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="address">
                      <Form.Label className="field-label">Street address</Form.Label>
                      <Form.Control
                        name="address"
                        value={form.address}
                        onChange={onChange}
                        placeholder="Street & number"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="yearBuilt">
                      <Form.Label className="field-label">Construction year</Form.Label>
                      <Form.Control
                        type="number"
                        name="yearBuilt"
                        min="1800"
                        max={new Date().getFullYear()}
                        value={form.yearBuilt}
                        onChange={onChange}
                        placeholder="e.g., 1998"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="dateAvailable">
                      <Form.Label className="field-label">Date available</Form.Label>
                      <Form.Control
                        type="date"
                        name="dateAvailable"
                        value={form.dateAvailable}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="propertyZone">
                      <Form.Label className="field-label">Property zone</Form.Label>
                      <Form.Select
                        name="propertyZone"
                        value={form.propertyZone}
                        onChange={onChange}
                      >
                        {ZONE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
              </section>
            )}

            {currentPhase === 1 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Property Location</h5>
                  <p className="section-description mb-0">
                    Pin the property on the map to help interested tenants understand where it is
                    located.
                  </p>
                </header>

                <Form.Group controlId="searchLocation" className="mb-3">
                  <Form.Label className="field-label">Search address</Form.Label>
                  {apiKey ? (
                    mapLoaded ? (
                      <StandaloneSearchBox
                        onLoad={(ref) => {
                          searchBoxRef.current = ref;
                        }}
                        onPlacesChanged={onPlacesChanged}
                      >
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Street, number, area"
                        />
                      </StandaloneSearchBox>
                    ) : (
                      <Form.Control disabled placeholder="Loading map…" />
                    )
                  ) : (
                    <Form.Control
                      disabled
                      placeholder="Enable Google Maps by setting an API key"
                    />
                  )}
                </Form.Group>

                <div className="small text-muted mb-2">
                  Click on the map to pin the exact location of the property.
                </div>

                <div className="map-wrapper mb-3">
                  {apiKey ? (
                    mapLoaded ? (
                      <GoogleMap
                        onLoad={(instance) => setMap(instance)}
                        mapContainerStyle={MAP_CONTAINER_STYLE}
                        center={mapCenter}
                        zoom={latLng ? 14 : 11}
                        onClick={onMapClick}
                        options={{ disableDefaultUI: true, zoomControl: true }}
                      >
                        {latLng && <Marker position={latLng} />}
                      </GoogleMap>
                    ) : (
                      <div className="d-flex align-items-center justify-content-center h-100">
                        Loading map…
                      </div>
                    )
                  ) : (
                    <div className="d-flex align-items-center justify-content-center h-100">
                      Google Maps disabled (missing API key)
                    </div>
                  )}
                </div>

                <Row className="g-2" style={{ maxWidth: 420 }}>
                  <Col>
                    <Form.Control
                      value={latLng?.lat ?? ''}
                      readOnly
                      placeholder="Latitude"
                    />
                  </Col>
                  <Col>
                    <Form.Control
                      value={latLng?.lng ?? ''}
                      readOnly
                      placeholder="Longitude"
                    />
                  </Col>
                </Row>
              </section>
            )}

            {currentPhase === 2 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Main characteristics</h5>
                  <p className="section-description mb-0">
                    Share details about the interior layout to help tenants understand if it fits
                    their needs.
                  </p>
                </header>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="floor">
                      <Form.Label className="field-label">Floor</Form.Label>
                      <Form.Control
                        type="number"
                        name="floor"
                        min="0"
                        value={form.floor}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check
                      id="onTopFloor"
                      label="Is on top floor"
                      name="onTopFloor"
                      checked={form.onTopFloor}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="orientation">
                      <Form.Label className="field-label">Orientation</Form.Label>
                      <Form.Select
                        name="orientation"
                        value={form.orientation}
                        onChange={onChange}
                      >
                        {ORIENTATION_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="bedrooms">
                      <Form.Label className="field-label">Bedrooms</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="bedrooms"
                        value={form.bedrooms}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="bathrooms">
                      <Form.Label className="field-label">Bathrooms</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="bathrooms"
                        value={form.bathrooms}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="wc">
                      <Form.Label className="field-label">WC</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="wc"
                        value={form.wc}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="kitchens">
                      <Form.Label className="field-label">Kitchens</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="kitchens"
                        value={form.kitchens}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="livingRooms">
                      <Form.Label className="field-label">Living rooms</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="livingRooms"
                        value={form.livingRooms}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="view">
                      <Form.Label className="field-label">View</Form.Label>
                      <Form.Select name="view" value={form.view} onChange={onChange}>
                        {VIEW_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="parkingSpaces">
                      <Form.Label className="field-label">Parking spaces</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        step="1"
                        name="parkingSpaces"
                        value={form.parkingSpaces}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </section>
            )}

            {currentPhase === 3 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Features & amenities</h5>
                  <p className="section-description mb-0">
                    Highlight amenities and heating details that make the property stand out.
                  </p>
                </header>

                <Row className="g-3">
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="furnished"
                      label="Furnished"
                      name="furnished"
                      checked={form.furnished}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="hasParking"
                      label="Parking"
                      name="hasParking"
                      checked={form.hasParking}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="hasElevator"
                      label="Elevator"
                      name="hasElevator"
                      checked={form.hasElevator}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="hasStorage"
                      label="Storage"
                      name="hasStorage"
                      checked={form.hasStorage}
                      onChange={onChange}
                    />
                  </Col>
                </Row>

                <Row className="g-3 mt-1">
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="petsAllowed"
                      label="Pets allowed"
                      name="petsAllowed"
                      checked={form.petsAllowed}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={3} sm={6} xs={6}>
                    <Form.Check
                      id="smokingAllowed"
                      label="Smoking allowed"
                      name="smokingAllowed"
                      checked={form.smokingAllowed}
                      onChange={onChange}
                    />
                  </Col>
                </Row>

                <hr className="my-4" />

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="heatingType">
                      <Form.Label className="field-label">Heating type</Form.Label>
                      <Form.Select
                        name="heatingType"
                        value={form.heatingType}
                        onChange={onChange}
                      >
                        {HEATING_TYPE_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="heatingMedium">
                      <Form.Label className="field-label">Heating medium</Form.Label>
                      <Form.Select
                        name="heatingMedium"
                        value={form.heatingMedium}
                        onChange={onChange}
                      >
                        {HEATING_MEDIUM_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4}>
                    <Form.Group controlId="energyClass">
                      <Form.Label className="field-label">Energy class</Form.Label>
                      <Form.Select
                        name="energyClass"
                        value={form.energyClass}
                        onChange={onChange}
                      >
                        {ENERGY_CLASS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3 mt-1">
                  {OTHER_HEATING_OPTIONS.map((option) => (
                    <Col md={4} sm={6} xs={6} key={option.value}>
                      <Form.Check
                        type="checkbox"
                        id={`heating-${option.value}`}
                        label={option.label}
                        checked={featureTags.includes(option.label)}
                        onChange={() => toggleFeatureTag(option.label)}
                      />
                    </Col>
                  ))}
                </Row>

                <hr className="my-4" />

                <Row className="g-3">
                  {LIFESTYLE_FEATURES.map((feature) => (
                    <Col md={4} sm={6} xs={6} key={feature.value}>
                      <Form.Check
                        type="checkbox"
                        id={feature.value}
                        label={feature.label}
                        checked={featureTags.includes(feature.label)}
                        onChange={() => toggleFeatureTag(feature.label)}
                      />
                    </Col>
                  ))}
                </Row>

                <Row className="g-3 mt-1">
                  <Col md={6}>
                    <Form.Group controlId="monthlyCommonExpenses">
                      <Form.Label className="field-label">Monthly common expenses (€)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        name="monthlyCommonExpenses"
                        value={form.monthlyCommonExpenses}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
                
                <hr className="my-4" />

                <header className="section-header">
                  <h5 className="section-title mb-1">Tenant requirements</h5>
                  <p className="section-description mb-0">
                    Outline the tenant profile that best fits this listing so we can match with the
                    right clients.
                  </p>
                </header>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="minTenantSalary">
                      <Form.Label className="field-label">Minimum annual salary (€)</Form.Label>
                      <Form.Control
                        type="number"
                        min="0"
                        name="minTenantSalary"
                        value={form.minTenantSalary}
                        onChange={onChange}
                        placeholder="Optional"
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="allowedOccupations">
                      <Form.Label className="field-label">Preferred occupations</Form.Label>
                      <Form.Control
                        name="allowedOccupations"
                        value={form.allowedOccupations}
                        onChange={onChange}
                        placeholder="e.g., Engineer, Teacher (comma separated)"
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={4}>
                    <Form.Group controlId="familyStatus">
                      <Form.Label className="field-label">Family status preference</Form.Label>
                      <Form.Select
                        name="familyStatus"
                        value={form.familyStatus}
                        onChange={onChange}
                      >
                        {FAMILY_STATUS_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check
                      type="checkbox"
                      id="tenantRequirements_petsAllowed"
                      label="Pets allowed for tenant"
                      name="tenantRequirements_petsAllowed"
                      checked={form.tenantRequirements_petsAllowed}
                      onChange={onChange}
                    />
                  </Col>
                  <Col md={4} className="d-flex align-items-end">
                    <Form.Check
                      type="checkbox"
                      id="tenantRequirements_smokingAllowed"
                      label="Smoking allowed for tenant"
                      name="tenantRequirements_smokingAllowed"
                      checked={form.tenantRequirements_smokingAllowed}
                      onChange={onChange}
                    />
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={12}>
                    <Form.Group controlId="tenantRequirementsNotes">
                      <Form.Label className="field-label">Additional notes for tenants</Form.Label>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        name="tenantRequirementsNotes"
                        value={form.tenantRequirementsNotes}
                        onChange={onChange}
                        placeholder="Share extra expectations or clarifications"
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </section>
            )}

            {currentPhase === 4 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Media & description</h5>
                  <p className="section-description mb-0">
                    Upload visuals and describe the property and neighborhood advantages.
                  </p>
                </header>

                <Form.Group className="mb-3" controlId="description">
                  <Form.Label className="field-label">Description</Form.Label>
                  <Form.Control
                    as="textarea"
                    rows={4}
                    name="description"
                    value={form.description}
                    onChange={onChange}
                    placeholder="Provide more information about the property and neighborhood advantages."
                  />
                </Form.Group>

                <Form.Group controlId="propertyImages" className="mb-3">
                  <Form.Label className="field-label">Images</Form.Label>
                  <Form.Control
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={(e) => setImages(Array.from(e.target.files || []))}
                  />
                  {images.length === 0 && (
                    <Form.Text className="text-muted">
                      Adding at least one photo improves visibility in the client dashboard.
                    </Form.Text>
                  )}
                </Form.Group>

                <Form.Group controlId="floorPlan" className="mb-3">
                  <Form.Label className="field-label">Floor plan (optional)</Form.Label>
                  <Form.Control
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={(e) => setFloorPlan(e.target.files?.[0] || null)}
                  />
                </Form.Group>

                <Form.Group controlId="videoUrl">
                  <Form.Label className="field-label">Video tour URL</Form.Label>
                  <Form.Control
                    type="url"
                    name="videoUrl"
                    value={form.videoUrl}
                    onChange={onChange}
                    placeholder="Paste a YouTube or Vimeo link"
                  />
                </Form.Group>
              </section>
            )}

            {currentPhase === 5 && (
              <section className="add-property-section">
                <header className="section-header">
                  <h5 className="section-title mb-1">Contact details</h5>
                  <p className="section-description mb-0">
                    Provide the contact details that interested clients should use.
                  </p>
                </header>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="contactName">
                      <Form.Label className="field-label">
                        Contact name <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        name="contactName"
                        value={form.contactName}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group controlId="contactPhone">
                      <Form.Label className="field-label">
                        Contact phone <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        name="contactPhone"
                        value={form.contactPhone}
                        onChange={onChange}
                        required
                      />
                    </Form.Group>
                  </Col>
                </Row>

                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group controlId="contactEmail">
                      <Form.Label className="field-label">Contact email</Form.Label>
                      <Form.Control
                        type="email"
                        name="contactEmail"
                        value={form.contactEmail}
                        onChange={onChange}
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </section>
            )}

            <div className="phase-navigation">
              <div className="phase-nav-slot">
                {currentPhase > 0 && (
                  <Button
                    type="button"
                    variant="outline-secondary"
                    className="rounded-pill px-4"
                    onClick={handlePrevPhase}
                    disabled={saving}
                  >
                    Back
                  </Button>
                )}
              </div>

              <div className="phase-nav-slot phase-nav-center">
                {isLastPhase && (
                  <Button
                    type="button"
                    variant="outline-primary"
                    className="rounded-pill px-4"
                    onClick={openPreview}
                    disabled={saving}
                  >
                    Preview
                  </Button>
                )}
              </div>

              <div className="phase-nav-slot phase-nav-right">
                {!isLastPhase ? (
                  <Button
                    type="button"
                    className="btn-onboarding-next"
                    onClick={handleNextPhase}
                    disabled={saving}
                  >
                    Next
                  </Button>
                ) : (
                  <Button type="submit" className="btn-onboarding-next" disabled={saving}>
                    {saving ? 'Saving…' : 'Finish'}
                  </Button>
                )}
              </div>
            </div>
          </Form>
        </Card.Body>
      </Card>

      <Modal
        show={showPreview}
        onHide={closePreview}
        size="lg"
        centered
        scrollable
        backdrop={saving ? 'static' : true}
        keyboard={!saving}
      >
        <Modal.Header closeButton={!saving}>
          <Modal.Title>Listing preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {msg && (
            <div
              className={`alert ${
                msg.toLowerCase().includes('fail') ? 'alert-danger' : 'alert-success'
              } mb-4`}
            >
              {msg}
            </div>
          )}

          <div className="preview-section">
            <h6 className="preview-title">Overview</h6>
            <Row className="gy-2">
              <Col md={6}>
                <div className="preview-label">Title</div>
                <div className="preview-value">{form.title || 'Not specified'}</div>
              </Col>
              <Col md={3}>
                <div className="preview-label">Type</div>
                <div className="preview-value">{form.type === 'rent' ? 'Rent' : 'Sale'}</div>
              </Col>
              <Col md={3}>
                <div className="preview-label">Status</div>
                <div className="preview-value">{form.status || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Property type</div>
                <div className="preview-value">
                  {
                    PROPERTY_TYPE_OPTIONS.find((option) => option.value === form.propertyType)?.label ||
                    'Not specified'
                  }
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Price</div>
                <div className="preview-value">{form.price ? `${form.price} €` : 'Not specified'}</div>
              </Col>
               {form.type === 'rent' && (
                <Col md={4}>
                  <div className="preview-label">Lease duration</div>
                  <div className="preview-value">
                    {form.leaseDuration
                      ? LEASE_DURATION_OPTIONS.find((option) => option.value === form.leaseDuration)?.label
                      : 'Not specified'}
                  </div>
                </Col>
              )}
            </Row>
          </div>

          <div className="preview-section">
            <h6 className="preview-title">Location</h6>
            <Row className="gy-2">
              <Col md={4}>
                <div className="preview-label">City</div>
                <div className="preview-value">{form.city || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Area</div>
                <div className="preview-value">{form.area || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Address</div>
                <div className="preview-value">{form.address || 'Not specified'}</div>
              </Col>
              <Col md={6}>
                <div className="preview-label">Latitude</div>
                <div className="preview-value">{latLng?.lat ?? 'Not specified'}</div>
              </Col>
              <Col md={6}>
                <div className="preview-label">Longitude</div>
                <div className="preview-value">{latLng?.lng ?? 'Not specified'}</div>
              </Col>
            </Row>
          </div>

          <div className="preview-section">
            <h6 className="preview-title">Main characteristics</h6>
            <Row className="gy-2">
              <Col md={4}>
                <div className="preview-label">Square meters</div>
                <div className="preview-value">{form.squareMeters || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Plot size</div>
                <div className="preview-value">{form.plotSize || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Floor</div>
                <div className="preview-value">{form.floor || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">On top floor</div>
                <div className="preview-value">{formatBoolean(form.onTopFloor)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Orientation</div>
                <div className="preview-value">
                  {ORIENTATION_OPTIONS.find((option) => option.value === form.orientation)?.label ||
                    'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">View</div>
                <div className="preview-value">
                  {VIEW_OPTIONS.find((option) => option.value === form.view)?.label || 'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Bedrooms</div>
                <div className="preview-value">{form.bedrooms || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Bathrooms</div>
                <div className="preview-value">{form.bathrooms || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">WC</div>
                <div className="preview-value">{form.wc || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Kitchens</div>
                <div className="preview-value">{form.kitchens || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Living rooms</div>
                <div className="preview-value">{form.livingRooms || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Year built</div>
                <div className="preview-value">{form.yearBuilt || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Parking spaces</div>
                <div className="preview-value">{form.parkingSpaces || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Heating type</div>
                <div className="preview-value">
                  {HEATING_TYPE_OPTIONS.find((option) => option.value === form.heatingType)?.label ||
                    'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Heating medium</div>
                <div className="preview-value">
                  {HEATING_MEDIUM_OPTIONS.find((option) => option.value === form.heatingMedium)?.label ||
                    'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Energy class</div>
                <div className="preview-value">
                  {ENERGY_CLASS_OPTIONS.find((option) => option.value === form.energyClass)?.label ||
                    'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Monthly common expenses</div>
                <div className="preview-value">
                  {form.monthlyCommonExpenses ? `${form.monthlyCommonExpenses} €` : 'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Available from</div>
                <div className="preview-value">{form.dateAvailable || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Property zone</div>
                <div className="preview-value">
                  {ZONE_OPTIONS.find((option) => option.value === form.propertyZone)?.label ||
                    'Not specified'}
                </div>
              </Col>
            </Row>
          </div>

          <div className="preview-section">
            <h6 className="preview-title">Lifestyle & amenities</h6>
            <Row className="gy-2">
              <Col md={4}>
                <div className="preview-label">Furnished</div>
                <div className="preview-value">{formatBoolean(form.furnished)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Pets allowed</div>
                <div className="preview-value">{formatBoolean(form.petsAllowed)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Smoking allowed</div>
                <div className="preview-value">{formatBoolean(form.smokingAllowed)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Has parking</div>
                <div className="preview-value">{formatBoolean(form.hasParking)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Has elevator</div>
                <div className="preview-value">{formatBoolean(form.hasElevator)}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Has storage</div>
                <div className="preview-value">{formatBoolean(form.hasStorage)}</div>
              </Col>
              <Col xs={12}>
                <div className="preview-label">Additional features</div>
                <div className="preview-value">
                  {combinedFeatureTags.length > 0 ? (
                    <ul className="preview-tag-list">
                      {combinedFeatureTags.map((feature) => (
                        <li key={feature}>{feature}</li>
                      ))}
                    </ul>
                  ) : (
                    'Not specified'
                  )}
                </div>
              </Col>
            </Row>
          </div>
          <div className="preview-section">
            <h6 className="preview-title">Tenant requirements</h6>
            <Row className="gy-2">
              <Col md={4}>
                <div className="preview-label">Minimum salary</div>
                <div className="preview-value">
                  {form.minTenantSalary ? `${form.minTenantSalary} €` : 'Not specified'}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Family status</div>
                <div className="preview-value">
                  {
                    FAMILY_STATUS_OPTIONS.find((option) => option.value === form.familyStatus)?.label ||
                    'Any'
                  }
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Pets allowed</div>
                <div className="preview-value">
                  {formatBoolean(form.tenantRequirements_petsAllowed)}
                </div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Smoking allowed</div>
                <div className="preview-value">
                  {formatBoolean(form.tenantRequirements_smokingAllowed)}
                </div>
              </Col>
              <Col md={8}>
                <div className="preview-label">Preferred occupations</div>
                <div className="preview-value">
                  {form.allowedOccupations ? form.allowedOccupations : 'Not specified'}
                </div>
              </Col>
              <Col md={12}>
                <div className="preview-label">Notes</div>
                <div className="preview-value">
                  {form.tenantRequirementsNotes ? form.tenantRequirementsNotes : 'No additional notes'}
                </div>
              </Col>
            </Row>
          </div>

          <div className="preview-section">
            <h6 className="preview-title">Media & description</h6>
            <div className="preview-label">Description</div>
            <div className="preview-value mb-3">
              {form.description ? form.description : 'No description provided'}
            </div>
            <Row className="gy-2">
              <Col md={6}>
                <div className="preview-label">Video URL</div>
                <div className="preview-value">{form.videoUrl || 'Not specified'}</div>
              </Col>
              <Col md={6}>
                <div className="preview-label">Floor plan</div>
                <div className="preview-value">{floorPlan?.name || 'Not uploaded'}</div>
              </Col>
              <Col xs={12}>
                <div className="preview-label">Images</div>
                <div className="preview-value">
                  {images.length > 0 ? (
                    <ul className="preview-tag-list">
                      {images.map((file) => (
                        <li key={file.name}>{file.name}</li>
                      ))}
                    </ul>
                  ) : (
                    'No images selected'
                  )}
                </div>
              </Col>
            </Row>
          </div>

          <div className="preview-section">
            <h6 className="preview-title">Contact</h6>
            <Row className="gy-2">
              <Col md={4}>
                <div className="preview-label">Name</div>
                <div className="preview-value">{form.contactName || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Phone</div>
                <div className="preview-value">{form.contactPhone || 'Not specified'}</div>
              </Col>
              <Col md={4}>
                <div className="preview-label">Email</div>
                <div className="preview-value">{form.contactEmail || 'Not specified'}</div>
              </Col>
            </Row>
          </div>
        </Modal.Body>
        <Modal.Footer className="preview-footer">
          <Button
            type="button"
            variant="outline-secondary"
            onClick={closePreview}
            disabled={saving}
          >
            Close
          </Button>
          <Button
            type="button"
            className="btn-onboarding-next"
            onClick={submit}
            disabled={saving}
          >
            {saving ? 'Saving…' : 'Finish'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
