import React, { useContext } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import Navbar from '../../student/Navbar'
import Sidebar from '../../educator/Sidebar'
import Footer from '../../student/Footer'
import { AppContext } from '../../../context/AppContext'

const Educator = () => {
  const { user } = useContext(AppContext)

  if (!user) {
    return <Navigate to="/auth" replace />
  }

  if (user.role !== 'educator') {
    return <Navigate to="/" replace />
  }

  return (
    <div className='text-default min-h-screen bg-white'>
      <Navbar/>
      <div>
        <div className='flex'>
          <Sidebar/>
          <div className='flex-1'>
            <Outlet/>
          </div> 
        </div>
      </div>
      <Footer/>
    </div>
  )
}

export default Educator