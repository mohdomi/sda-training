# API Documentation

## Base URL

```text
https://api.dashboard.com/v1
```

## Authentication

All API requests require authentication via JWT token in the Authorization header:

```text
Authorization: Bearer <jwt_token>
```

## Endpoints

### Users

#### GET /users

Retrieve all users with pagination and filtering.

**Parameters:**

- `page` (integer, optional): Page number (default: 1)
- `limit` (integer, optional): Items per page (default: 10)
- `search` (string, optional): Search query
- `sort` (string, optional): Sort field (default: 'createdAt')
- `order` (string, optional): Sort order ('asc' or 'desc')

**Response:**

```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "user_123",
        "name": "John Doe",
        "email": "john@example.com",
        "role": "admin",
        "createdAt": "2024-01-01T00:00:00Z",
        "updatedAt": "2024-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 100,
      "pages": 10
    }
  }
}
```

#### POST /users

Create a new user.

**Request Body:**

```json
{
  "name": "Jane Doe",
  "email": "jane@example.com",
  "role": "user",
  "password": "securepassword"
}
```

**Response:**

```json
{
  "success": true,
  "data": {
    "id": "user_456",
    "name": "Jane Doe",
    "email": "jane@example.com",
    "role": "user",
    "createdAt": "2024-01-01T00:00:00Z"
  }
}
```

### Revenue

#### GET /revenue

Retrieve revenue data with time range filtering.

**Parameters:**

- `startDate` (string, required): Start date in ISO format
- `endDate` (string, required): End date in ISO format
- `granularity` (string, optional): Data granularity ('daily', 'weekly', 'monthly')

**Response:**

```json
{
  "success": true,
  "data": {
    "total": 45678.9,
    "change": 12.5,
    "trend": "up",
    "data": [
      {
        "date": "2024-01-01",
        "revenue": 1234.56,
        "transactions": 45
      }
    ]
  }
}
```

### Orders

#### GET /orders

Retrieve order data with filtering and sorting.

**Parameters:**

- `status` (string, optional): Order status filter
- `dateRange` (string, optional): Date range filter
- `sort` (string, optional): Sort field

**Response:**

```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "order_123",
        "customerId": "customer_456",
        "total": 99.99,
        "status": "completed",
        "createdAt": "2024-01-01T00:00:00Z"
      }
    ],
    "summary": {
      "total": 100,
      "completed": 85,
      "pending": 10,
      "cancelled": 5
    }
  }
}
```

## Error Responses

### 400 Bad Request

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input parameters",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

### 401 Unauthorized

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required"
  }
}
```

### 404 Not Found

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Resource not found"
  }
}
```

### 500 Internal Server Error

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An unexpected error occurred"
  }
}
```

## Rate Limiting

- 1000 requests per hour per IP
- 100 requests per minute per user
- Rate limit headers included in responses

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://api.dashboard.com/ws');
```

### Events

- `connected`: Connection established
- `disconnected`: Connection lost
- `dataUpdate`: Real-time data update
- `error`: Error occurred

### Example Usage

```javascript
ws.onopen = () => {
  console.log('Connected to WebSocket');
};

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  if (data.type === 'dataUpdate') {
    updateDashboard(data.payload);
  }
};
```
