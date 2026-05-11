import express from 'express';
import dotenv from 'dotenv';
import { z } from 'zod';
import haversine from 'haversine-distance';
import pool from './db/connection.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Validation schemas
const addSchoolSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  address: z.string().min(1, 'Address is required'),
  latitude: z.number({ required_error: 'Latitude is required', invalid_type_error: 'Latitude must be a number' })
    .min(-90).max(90),
  longitude: z.number({ required_error: 'Longitude is required', invalid_type_error: 'Longitude must be a number' })
    .min(-180).max(180),
});

const listSchoolsSchema = z.object({
  latitude: z.preprocess((val) => parseFloat(val), z.number().min(-90).max(90)),
  longitude: z.preprocess((val) => parseFloat(val), z.number().min(-180).max(180)),
});

// Add School API
app.post('/addSchool', async (req, res) => {
  try {
    const validatedData = addSchoolSchema.parse(req.body);

    const { name, address, latitude, longitude } = validatedData;
    
    const [result] = await pool.query(
      'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)',
      [name, address, latitude, longitude]
    );

    res.status(201).json({
      message: 'School added successfully',
      schoolId: result.insertId
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error adding school:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List Schools API
app.get('/listSchools', async (req, res) => {
  try {
    const validatedQuery = listSchoolsSchema.parse(req.query);
    const userLocation = {
      latitude: validatedQuery.latitude,
      longitude: validatedQuery.longitude
    };

    const [schools] = await pool.query('SELECT * FROM schools');

    // Calculate distance and sort
    const sortedSchools = schools.map(school => {
      const schoolLocation = {
        latitude: school.latitude,
        longitude: school.longitude
      };
      
      // Calculate distance in meters
      const distance = haversine(userLocation, schoolLocation);
      
      return {
        ...school,
        distance
      };
    }).sort((a, b) => a.distance - b.distance);

    res.status(200).json(sortedSchools);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ errors: error.errors });
    }
    console.error('Error listing schools:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
