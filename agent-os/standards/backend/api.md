## API endpoint standards and conventions

### REST Conventions
- **RESTful Design**: Follow REST principles with clear resource-based URLs (`/api/users`, `/api/products/:id`)
- **HTTP Methods**:
  - GET: Retrieve resource(s)
  - POST: Create new resource
  - PUT/PATCH: Update existing resource (PUT = full replace, PATCH = partial update)
  - DELETE: Remove resource
- **Plural Nouns**: Use plural nouns for resource endpoints (`/users`, `/products`) for consistency
- **Nested Resources**: Limit nesting depth to 2-3 levels (`/api/users/:userId/orders`); avoid deeper nesting

### Response Format
- **Consistent JSON Structure**:
  ```json
  {
    "data": {...},      // Success response data
    "error": null,      // Error details (null on success)
    "meta": {           // Optional metadata
      "pagination": {...},
      "timestamp": "ISO-8601"
    }
  }
  ```
- **HTTP Status Codes**:
  - 200 OK: Successful GET/PUT/PATCH
  - 201 Created: Successful POST
  - 204 No Content: Successful DELETE
  - 400 Bad Request: Invalid input
  - 401 Unauthorized: Missing/invalid auth
  - 403 Forbidden: Insufficient permissions
  - 404 Not Found: Resource doesn't exist
  - 422 Unprocessable Entity: Validation errors
  - 500 Internal Server Error: Server-side errors

### Error Handling
- **Error Response Format**:
  ```json
  {
    "data": null,
    "error": {
      "code": "VALIDATION_ERROR",
      "message": "User-friendly error message",
      "details": [
        { "field": "email", "message": "Invalid email format" }
      ]
    }
  }
  ```
- **FastAPI**: Use HTTPException with status_code and detail
- **Django/DRF**: Use DRF exception handlers; return serialized errors
- **Express**: Custom error middleware; catch all async errors

### Pagination & Filtering
- **Query Parameters**: Use for filtering, sorting, pagination, search (`?status=active&sort=-createdAt&page=1&limit=20`)
- **Pagination**: Default limit: 20, max: 100
- **Response Meta**:
  ```json
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "totalPages": 8
    }
  }
  ```

### Authentication & Security
- **Authentication**: Token-based (JWT, session tokens); Supabase Auth for user management
- **Authorization**: Check permissions on protected routes; use middleware/decorators
- **CORS**: Configure allowed origins (Vercel domains, localhost)
- **Rate Limiting**: Implement per-IP/per-user limits; include rate limit headers (X-RateLimit-Limit, X-RateLimit-Remaining)
- **Input Validation**: Pydantic models (FastAPI), serializers (Django), zod (Express)

### Versioning & Naming
- **API Versioning**: Prefix endpoints with `/api/v1/` for future-proofing
- **Consistent Naming**: Use kebab-case for multi-word endpoints (`/user-profiles`, `/order-items`)
- **Deprecation**: Provide deprecation warnings in headers; maintain old versions for 6+ months
