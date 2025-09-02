import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';
import { createError } from './errorHandler';

export const validateRequest = (schema: {
  body?: Joi.ObjectSchema;
  query?: Joi.ObjectSchema;
  params?: Joi.ObjectSchema;
}) => {
  return (req: Request, _res: Response, next: NextFunction) => {
    const errors: string[] = [];

    // Validate body
    if (schema.body) {
      const { error } = schema.body.validate(req.body);
      if (error) {
        errors.push(`Body: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate query
    if (schema.query) {
      const { error } = schema.query.validate(req.query);
      if (error) {
        errors.push(`Query: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    // Validate params
    if (schema.params) {
      const { error } = schema.params.validate(req.params);
      if (error) {
        errors.push(`Params: ${error.details.map(d => d.message).join(', ')}`);
      }
    }

    if (errors.length > 0) {
      throw createError(`Validation failed: ${errors.join('; ')}`, 400, 'VALIDATION_ERROR');
    }

    next();
  };
};

// Common validation schemas
export const schemas = {
  geocoding: {
    body: Joi.object({
      query: Joi.string().min(2).max(200).required(),
      limit: Joi.number().min(1).max(10).optional().default(5),
      proximity: Joi.array().items(Joi.number()).length(2).optional(),
      bbox: Joi.array().items(Joi.number()).length(4).optional(),
      types: Joi.array().items(Joi.string()).optional()
    })
  },
  
  directions: {
    body: Joi.object({
      start: Joi.array().items(Joi.number().min(-180).max(180)).length(2).required(),
      end: Joi.array().items(Joi.number().min(-180).max(180)).length(2).required(),
      profile: Joi.string().valid(
        'mapbox/walking',
        'mapbox/cycling',
        'mapbox/driving',
        'mapbox/driving-traffic'
      ).required(),
      alternatives: Joi.boolean().optional().default(false),
      steps: Joi.boolean().optional().default(true),
      geometries: Joi.string().valid('geojson', 'polyline', 'polyline6').optional().default('geojson')
    })
  },
  
  metrics: {
    body: Joi.object({
      distance: Joi.number().min(0).max(1000000).required(), // max 1000km
      mode: Joi.string().valid('walking', 'cycling', 'driving', 'transit').required(),
      duration: Joi.number().min(0).optional()
    })
  }
};