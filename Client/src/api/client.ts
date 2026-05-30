import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'https://pizza-corner-server.vercel.app/api'

const api = axios.create({
  baseURL: API_BASE,
})

let _useDeliveryToken = false
export const setUseDeliveryToken = (val: boolean) => { _useDeliveryToken = val }

api.interceptors.request.use((config) => {
  const token = _useDeliveryToken
    ? localStorage.getItem('delivery_token')
    : localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`

  // Set Content-Type to JSON unless sending FormData
  if (!(config.data instanceof FormData)) {
    config.headers['Content-Type'] = 'application/json'
  }
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      localStorage.removeItem('delivery_token')
      localStorage.removeItem('delivery_user')
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
