import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from 'axios'
import {toast} from 'react-hot-toast'
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from '../utils/apiError';
import { resolveOwnerPermissions, ownerHasPermission } from '../utils/ownerPermissions';

import { resolveApiBaseUrl } from '../utils/apiBase';

const API_BASE_URL = resolveApiBaseUrl();
axios.defaults.baseURL = API_BASE_URL

export const AppContext = createContext();

const isLicenseLocked = (license) => {
  if (!license) return false
  if (license.allowed === false) return true
  return license.licenseStatus === 'expired'
}

const clearOwnerSession = () => {
  localStorage.removeItem('token')
  delete axios.defaults.headers.common['Authorization']
}

export const AppProvider = ({ children })=>{

    const navigate = useNavigate()
    const currency = import.meta.env.VITE_CURRENCY || 'MAD '

    const [token, setToken] = useState(null)
    const [user, setUser] = useState(null)
    const [isOwner, setIsOwner] = useState(false)
    const [license, setLicense] = useState(null)
    const [authReady, setAuthReady] = useState(false)
    const [showLogin, setShowLogin] = useState(false)
    const [pickupDate, setPickupDate] = useState('')
    const [returnDate, setReturnDate] = useState('')

    const [cars, setCars] = useState([])
    const [carsLoading, setCarsLoading] = useState(true)
    const [pickupLocations, setPickupLocations] = useState([])

    const applyLicense = useCallback((nextLicense, nextUser) => {
      const resolved = nextLicense || nextUser?.license || null
      setLicense(resolved)
      return resolved
    }, [])

    const resetOwnerAuth = useCallback(() => {
      clearOwnerSession()
      setToken(null)
      setUser(null)
      setIsOwner(false)
      setLicense(null)
    }, [])

    const fetchPickupLocations = useCallback(async () => {
        try {
            const { data } = await axios.get('/api/pickup-locations')
            if (data.success) setPickupLocations(data.locations)
        } catch (error) {
            console.error(getErrorMessage(error))
            toast.error('Failed to load pickup locations')
        }
    }, [])

    const fetchUser = useCallback(async ()=>{
        try {
           const {data} = await axios.get('/api/user/data')
           if (data.success && data.user?.role === 'owner') {
            const normalizedUser = {
              ...data.user,
              permissions: resolveOwnerPermissions(data.user.permissions || []),
            }
            setUser(normalizedUser)
            setIsOwner(true)
            applyLicense(data.license, data.user)
           } else {
            resetOwnerAuth()
           }
        } catch (error) {
            // Auth / lock failures clear session; network errors keep token for retry
            if (error.response?.status === 401 || error.response?.status === 403) {
              resetOwnerAuth()
            }
        } finally {
            setAuthReady(true)
        }
    }, [applyLicense, resetOwnerAuth])

    const fetchCars = useCallback(async () =>{
        setCarsLoading(true)
        try {
            const {data} = await axios.get('/api/user/cars')
            data.success ? setCars(data.cars) : toast.error(data.message)
        } catch (error) {
            toast.error(getErrorMessage(error, 'Failed to load cars'))
        } finally {
            setCarsLoading(false)
        }
    }, [])

    const logout = useCallback(()=>{
        resetOwnerAuth()
        toast.success('You have been logged out')
        navigate('/')
    }, [navigate, resetOwnerAuth])

    const hasPermission = useCallback((permission) => {
      return ownerHasPermission(user, permission)
    }, [user])

    useEffect(()=>{
        const interceptor = axios.interceptors.response.use(
          (response) => response,
          (error) => {
            const status = error.response?.status
            const code = error.response?.data?.code

            if (status === 403 && code === 'ACCOUNT_LOCKED') {
              resetOwnerAuth()
              toast.error(error.response?.data?.message || 'Account locked')
              if (window.location.pathname.startsWith('/owner')) {
                navigate('/')
              }
              return Promise.reject(error)
            }

            if (status === 403 && code === 'LICENSE_EXPIRED') {
              const next = error.response?.data?.license
              if (next) setLicense(next)
              else setLicense((prev) => ({ ...(prev || {}), licenseStatus: 'expired', allowed: false, daysRemaining: 0 }))
              return Promise.reject(error)
            }

            if (status === 401 && token) {
              resetOwnerAuth()
              toast.error('Session expired. Please log in again.')
              if (window.location.pathname.startsWith('/owner')) {
                navigate('/')
              }
            }
            return Promise.reject(error)
          }
        )
        return () => axios.interceptors.response.eject(interceptor)
    }, [token, navigate, resetOwnerAuth])

    useEffect(()=>{
        const storedToken = localStorage.getItem('token')
        if(storedToken){
            axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`
            setToken(storedToken)
        } else {
            setAuthReady(true)
        }
        fetchCars()
        fetchPickupLocations()
    },[fetchCars, fetchPickupLocations])

    useEffect(()=>{
        if(token){
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
            fetchUser()
        }
    },[token, fetchUser])

    const licenseLocked = isLicenseLocked(license)

    const value = useMemo(() => ({
        navigate, currency, axios, user, setUser,
        token, setToken, isOwner, setIsOwner, authReady, fetchUser, showLogin, setShowLogin, logout, fetchCars, cars, setCars, carsLoading,
        pickupDate, setPickupDate, returnDate, setReturnDate,
        pickupLocations, fetchPickupLocations,
        license, setLicense, licenseLocked, applyLicense, hasPermission,
    }), [
      navigate, currency, user, token, isOwner, authReady, fetchUser, showLogin, logout, fetchCars, cars, carsLoading,
      pickupDate, returnDate, pickupLocations, fetchPickupLocations, license, licenseLocked, applyLicense, hasPermission,
    ])

    return (
    <AppContext.Provider value={value}>
        { children }
    </AppContext.Provider>
    )
}

export const useAppContext = ()=>{
    return useContext(AppContext)
}
