import React from 'react'
import { Outlet } from 'react-router-dom'
import Navbar from '../../student/Navbar'
import Sidebar from '../../educator/Sidebar'
import Footer from '../../student/Footer'

const Educator = () => {
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