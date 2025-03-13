import React, { useEffect, useContext } from "react"; 
import { useNavigate, useLocation } from "react-router-dom"; 
import axios from "axios"; 
import { toast } from "react-toastify"; 
import { AppContext } from "../../../context/AppContext"; 
import Loading from "../../student/Loading";  

const SuccessPage = () => {   
  const navigate = useNavigate();   
  const location = useLocation();   
  const { backendURL, token, fetchUserEnrolledCourses } = useContext(AppContext);     
  
  useEffect(() => {     
    const queryParams = new URLSearchParams(location.search);     
    const sessionId = queryParams.get("session_id");      
    
    // Retrieve course ID from localStorage
    const courseId = localStorage.getItem("courseId");
    
    if (sessionId && courseId) {       
      verifyPayment(sessionId, courseId);     
    } else {       
      toast.error("Missing session ID or course ID.");       
      navigate("/");     
    }   
  }, [location, navigate]);    

  const verifyPayment = async (sessionId, courseId) => {     
    try {       
      const { data } = await axios.get(         
        `${backendURL}/api/user/verify-payment`,         
        {           
          params: { 
            session_id: sessionId,
            course_id: courseId 
          },           
          headers: {             
            Authorization: `Bearer ${token}`,           
          },         
        }       
      );        
      
      if (data.success) {         
        toast.success("Payment verified successfully!");                           
        await fetchUserEnrolledCourses();         
        navigate("/my-enrollments");       
      } else {         
        toast.error("Payment verification failed");         
        navigate("/");       
      }     
    } catch (error) {       
      toast.error("Error");       
      navigate("/");     
    }   
  };    

  return <Loading />; // Show loading component during verification
};  

export default SuccessPage;