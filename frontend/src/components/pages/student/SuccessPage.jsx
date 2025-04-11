import React, { useEffect, useContext } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";
import { AppContext } from "../../../context/AppContext";

const SuccessPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem("token");
  const { backendURL,  fetchUserEnrolledCourses } = useContext(AppContext);
  
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const sessionId = urlParams.get("session_id");
    const courseId = urlParams.get("course_id") || localStorage.getItem("courseId");
  
    const verifyPayment = async () => {
      try {
        const { data } = await axios.get(`${backendURL}/success`, {
          params: { session_id: sessionId, course_id: courseId },
          headers: { Authorization: `Bearer ${token}` }
        });
  
        if (data.success) {
          localStorage.removeItem("courseId");
          await fetchUserEnrolledCourses();
          toast.success("Course enrolled successfully!");
          navigate("/my-enrollments");
        } else {
          toast.error(data.message || "Payment verification failed");
          navigate("/");
        }
      } catch (error) {
        console.error("Payment verification error:", error);
        toast.error(error.response?.data?.message || "Payment verification error");
        navigate("/");
      }
    };
  
    if (!sessionId) {
      toast.error("Missing payment session ID");
      navigate("/");
      return;
    }
  
    if (!courseId) {
      toast.error("Missing course information");
      navigate("/");
      return;
    }
  
    // Wait until token is available
    if (token) {
      verifyPayment();
    }
  }, [location, navigate, backendURL,  fetchUserEnrolledCourses]);
  
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-4">Processing your payment...</h2>
        <p className="text-gray-600">Please wait while we verify your transaction.</p>
      </div>
    </div>
  );
};

export default SuccessPage;