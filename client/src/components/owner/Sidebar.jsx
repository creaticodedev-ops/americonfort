import React, { useEffect, useMemo, useState } from 'react'
import { assets, ownerMenuLinks } from '../../assets/assets'
import { NavLink, useLocation } from 'react-router-dom'
import { useAppContext } from '../../context/AppContext'
import { useI18n } from '../../i18n/I18nContext'
import toast from 'react-hot-toast'
import { getErrorMessage } from '../../utils/apiError'

const Sidebar = () => {
  const { user, axios, fetchUser, hasPermission } = useAppContext()
  const { t } = useI18n()
  const location = useLocation()
  const [image, setImage] = useState('')

  const previewUrl = useMemo(() => (image ? URL.createObjectURL(image) : ''), [image])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const updateImage = async () => {
    try {
      const formData = new FormData()
      formData.append('image', image)

      const { data } = await axios.post('/api/owner/update-image', formData)

      if (data.success) {
        fetchUser()
        toast.success(data.message)
        setImage('')
      } else {
        toast.error(data.message)
      }
    } catch (error) {
      toast.error(getErrorMessage(error))
    }
  }

  const isActive = (path) => {
    if (path === '/owner') return location.pathname === '/owner'
    return location.pathname === path || location.pathname.startsWith(`${path}/`)
  }

  return (
    <aside className="relative sticky top-0 self-start h-[calc(100svh-57px)] flex flex-col items-center pt-6 md:pt-8 w-14 md:w-56 xl:w-60 shrink-0 border-r border-borderColor text-sm bg-white overflow-y-auto overflow-x-hidden">
      <div className="group relative shrink-0">
        <label htmlFor="image">
          <img
            src={previewUrl || user?.image || 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=300'}
            alt=""
            className="h-9 md:h-14 w-9 md:w-14 rounded-full mx-auto object-cover"
          />
          <input type="file" id="image" accept="image/*" hidden onChange={(e) => setImage(e.target.files[0])} />

          <div className="absolute hidden top-0 right-0 left-0 bottom-0 bg-black/10 rounded-full group-hover:flex items-center justify-center cursor-pointer">
            <img src={assets.edit_icon} alt="" />
          </div>
        </label>
      </div>
      {image && (
        <button
          type="button"
          className="absolute top-0 right-0 flex p-2 gap-1 bg-primary/10 text-primary cursor-pointer text-xs z-10"
          onClick={updateImage}
        >
          {t('admin.shell.save')} <img src={assets.check_icon} width={13} alt="" />
        </button>
      )}
      <p className="mt-2 text-sm md:text-base max-md:hidden px-2 text-center truncate w-full">{user?.name}</p>

      <nav className="w-full mt-2 pb-8">
        {ownerMenuLinks
          .filter((link) => hasPermission(link.permission))
          .map((link, index) => {
          const active = isActive(link.path)
          return (
            <NavLink
              key={index}
              to={link.path}
              end={link.path === '/owner'}
              title={t(link.nameKey)}
              className={`relative flex items-center justify-center md:justify-start gap-2 w-full py-3 px-0 md:pl-4 md:pr-3 first:mt-4 ${
                active ? 'bg-primary/10 text-primary' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <img src={active ? link.coloredIcon : link.icon} alt="" className="w-5 h-5 shrink-0" />
              <span className="max-md:hidden truncate">{t(link.nameKey)}</span>
              <div className={`${active ? 'bg-primary' : ''} w-1.5 h-8 rounded-l right-0 absolute`} />
            </NavLink>
          )
        })}
      </nav>
    </aside>
  )
}

export default Sidebar
