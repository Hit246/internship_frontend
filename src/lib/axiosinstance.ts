import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:5000";

const axiosInstance = axios.create({
    baseURL,
    withCredentials: true, // only if you use cookies; remove if not
    headers: { "Content-Type": "application/json" },
    timeout: 15000,
});

export default axiosInstance;
