# Documentation Templates

Reusable documentation templates for components and API endpoints. Copy a template, replace the placeholders, and keep the heading structure.

## Component Documentation Template

Copy the block below into e.g. `docs/components/<ComponentName>.md`:

````markdown
# Component Name

## Overview

Brief description of the component's purpose and functionality.

## Props

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| prop1 | string | Yes | - | Description of prop1 |
| prop2 | number | No | 0 | Description of prop2 |

## Usage

```jsx
import { ComponentName } from './ComponentName';

function App() {
  return (
    <ComponentName
      prop1="value"
      prop2={123}
    />
  );
}
```

## Examples

### Basic Usage

```jsx
<ComponentName prop1="basic" />
```

### Advanced Usage

```jsx
<ComponentName
  prop1="advanced"
  prop2={456}
  customProp="value"
/>
```

## Styling

The component uses CSS classes for styling:

- `.component-name`: Main container
- `.component-name__element`: Child elements
- `.component-name--modifier`: Modifier classes

## Accessibility

- Keyboard navigation support
- Screen reader compatibility
- ARIA attributes included
- Focus management

## Testing

```javascript
import { render, screen } from '@testing-library/react';
import { ComponentName } from './ComponentName';

test('renders component', () => {
  render(<ComponentName prop1="test" />);
  expect(screen.getByText('test')).toBeInTheDocument();
});
```
````

## API Endpoint Template

Copy the block below into e.g. `docs/api/<endpoint-name>.md`:

````markdown
# Endpoint Name

## Overview

Brief description of the endpoint's purpose.

## Endpoint

```text
GET /api/endpoint
```

## Parameters

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| param1 | string | Yes | Description of param1 |
| param2 | number | No | Description of param2 |

## Request Example

```bash
curl -X GET "https://api.example.com/endpoint?param1=value&param2=123" \
  -H "Authorization: Bearer token"
```

## Response

### Success Response

```json
{
  "success": true,
  "data": {
    "field1": "value1",
    "field2": "value2"
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description"
  }
}
```

## Status Codes

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 404: Not Found
- 500: Internal Server Error
````
