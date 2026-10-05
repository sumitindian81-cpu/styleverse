const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5001/api";

export function getAuthToken() {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("styleverse_token") ||
    ""
  );
}

function buildHeaders({ hasBody = false, isFormData = false } = {}) {
  const headers = {};

  if (hasBody && !isFormData) {
    headers["Content-Type"] = "application/json";
  }

  const token = getAuthToken();

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}

async function parseResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message =
      typeof payload === "object" && payload?.message
        ? payload.message
        : `Request failed with status ${response.status}`;

    const error = new Error(message);
    error.status = response.status;
    error.payload = payload;

    throw error;
  }

  return payload;
}

export async function apiRequest(path, options = {}) {
  const { body, isFormData = false, ...rest } = options;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...rest,
    body,
    headers: {
      ...buildHeaders({
        hasBody: body !== undefined,
        isFormData,
      }),
      ...(options.headers || {}),
    },
  });

  return parseResponse(response);
}

export async function apiJson(path, options = {}) {
  const { method = "GET", data, headers, ...rest } = options;

  return apiRequest(path, {
    ...rest,
    method,
    body: data === undefined ? undefined : JSON.stringify(data),
    headers,
  });
}

export async function apiForm(path, options = {}) {
  const { method = "POST", formData, headers, ...rest } = options;

  return apiRequest(path, {
    ...rest,
    method,
    body: formData,
    isFormData: true,
    headers,
  });
}

export { API_BASE_URL };