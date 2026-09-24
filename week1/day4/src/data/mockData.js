export const mockApiData = {
  "/api/users": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [320, 410, 380, 520, 610, 590],
  },
  "/api/revenue": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [1200, 1900, 1500, 2400, 3100, 2900],
  },
  "/api/orders": {
    labels: ["Pending", "Shipped", "Delivered", "Cancelled"],
    values: [45, 120, 300, 12],
  },
  "/users": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [320, 410, 380, 520, 610, 590],
  },
  "/revenue": {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    values: [1200, 1900, 1500, 2400, 3100, 2900],
  },
  "/orders": {
    labels: ["Pending", "Shipped", "Delivered", "Cancelled"],
    values: [45, 120, 300, 12],
  },
};

export function getMockData(endpoint) {
  if (mockApiData[endpoint]) return mockApiData[endpoint];
  const key = endpoint.split("/").pop();
  return (
    mockApiData[`/api/${key}`] ?? { labels: [], values: [] }
  );
}
