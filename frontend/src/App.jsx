import {  Routes, Route } from 'react-router-dom';
import React from 'react'
import Home from './components/pages/student/Home'
import CourseList from './components/pages/student/CoursesList'
import CourseDetails from './components/pages/student/CourseDetails'
import MyEnrollments from './components/pages/student/MyEnrollments'

import Player from './components/pages/student/Player'
import Loading from './components/student/Loading'
import Educator from './components/pages/educator/Educator'
import Dashboard from './components/pages/educator/Dashboard'
import AddCourse from './components/pages/educator/AddCourse'
import MyCourses from './components/pages/educator/MyCourses'
import StudentsEnrolled from './components/pages/educator/StudentsEnrolled'
import Navbar from './components/student/Navbar';
import "quill/dist/quill.snow.css";
import AuthPage from './components/student/AuthPage';
import { ToastContainer } from 'react-toastify';
import SuccessPage from './components/pages/student/SuccessPage';


const App = () => {
  const isEducatorRoute = location.pathname.startsWith('/educator');
  return (
    <div className='text-default min-h-screen bg-white'>
      <ToastContainer/>
      <Routes>
      <Route path="/auth" element={<AuthPage />} />
      
        {!isEducatorRoute && (
          <>
            <Route path="/" element={<><Navbar/><Home /></>} />
            <Route path="/course-list" element={<><Navbar/><CourseList /></>} />
            <Route path="/course-list/:input" element={<><Navbar/><CourseList/></>}/>  
            <Route path="/course-details/:id" element={<><Navbar/><CourseDetails /></>} />
            <Route path="/course/:id" element={<><Navbar/><CourseDetails /></>} />
            <Route path="/my-enrollments" element={<><Navbar/><MyEnrollments/></>}/>
            <Route path="/success" element={<SuccessPage />} /> 
            <Route path="/player/:courseID" element={<><Navbar/><Player/></>}/>
            <Route path="/loading/:path" element={<><Navbar/><Loading /></>}/>
          </>
        )}

       
        <Route path="/educator" element={<Educator/>}>
          <Route index element={<Dashboard/>}/>
          <Route path="add-course" element={<AddCourse/>}/>
          <Route path="my-courses" element={<MyCourses/>}/>
          <Route path="students-enrolled" element={<StudentsEnrolled/>}/>
        </Route>
      </Routes>
    </div>
  )
}

export default App