import axios from "axios";

const TOKEN_KEY = "vm_token";

const api = axios.create({ baseURL: "/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem("vm_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export const venuesApi = {
  list: (params) => api.get("/venues/", { params }).then((r) => r.data),
  get: (id) => api.get(`/venues/${id}`).then((r) => r.data),
  create: (data) => api.post("/venues/", data).then((r) => r.data),
  update: (id, data) => api.put(`/venues/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/venues/${id}`),
  checkAvailability: (id, start, end) =>
    api.get(`/venues/${id}/availability`, { params: { start_date: start, end_date: end } }).then((r) => r.data),
};

export const clientsApi = {
  list: (params) => api.get("/clients/", { params }).then((r) => r.data),
  get: (id) => api.get(`/clients/${id}`).then((r) => r.data),
  create: (data) => api.post("/clients/", data).then((r) => r.data),
  update: (id, data) => api.put(`/clients/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/clients/${id}`),
};

export const bookingsApi = {
  list: (params) => api.get("/bookings/", { params }).then((r) => r.data),
  get: (id) => api.get(`/bookings/${id}`).then((r) => r.data),
  create: (data) => api.post("/bookings/", data).then((r) => r.data),
  update: (id, data) => api.put(`/bookings/${id}`, data).then((r) => r.data),
  cancel: (id) => api.delete(`/bookings/${id}`),
};

export const dashboardApi = {
  get: () => api.get("/dashboard").then((r) => r.data),
};

export const seasonsApi = {
  list: (params) => api.get("/seasons/", { params }).then((r) => r.data),
  create: (data) => api.post("/seasons/", data).then((r) => r.data),
  update: (id, data) => api.put(`/seasons/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/seasons/${id}`),
};

export const discountsApi = {
  list: () => api.get("/discounts/").then((r) => r.data),
  create: (data) => api.post("/discounts/", data).then((r) => r.data),
  update: (id, data) => api.put(`/discounts/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/discounts/${id}`),
  validate: (code, amount) =>
    api.get(`/discounts/validate/${code}`, { params: { base_amount: amount } }).then((r) => r.data),
};

export const pricingApi = {
  preview: (data) => api.post("/bookings/price-preview", data).then((r) => r.data),
};

export const durationRulesApi = {
  list: (params) => api.get("/duration-rules/", { params }).then((r) => r.data),
  create: (data) => api.post("/duration-rules/", data).then((r) => r.data),
  update: (id, data) => api.put(`/duration-rules/${id}`, data).then((r) => r.data),
  delete: (id) => api.delete(`/duration-rules/${id}`),
};

export { api };
