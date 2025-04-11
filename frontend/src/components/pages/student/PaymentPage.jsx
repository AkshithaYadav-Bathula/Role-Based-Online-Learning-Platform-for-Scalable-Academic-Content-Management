import React, { useContext, useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppContext } from "../../../context/AppContext";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import axios from "axios";
import { toast } from "react-toastify";
import Loading from "../../student/Loading";
import Footer from "../../student/Footer";
import { assets } from "../../../assets/assets";

// Load Stripe outside of component to avoid recreation
const stripePromise = loadStripe("pk_test_51PvbvgFu8YYdQhV12uDVUSMxJcmsW3rkekgjwwHdLepj31Wg9YI4EZCL451yX6hm7H1ZCACtbLb4oJ3iUDj5kIyd00qyjKZu5X");

// Payment form component
const CheckoutForm = ({ courseId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [isLoading, setIsLoading] = useState(false);
  const { backendURL, token } = useContext(AppContext);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsLoading(true);

    try {
      // Confirm the payment
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        toast.error(`Payment failed: ${error.message}`);
        setIsLoading(false);
        return;
      }

      if (paymentIntent && paymentIntent.status === 'succeeded') {
        // Send the successful payment info to backend
        const { data } = await axios.post(
          `${backendURL}/users/complete_course_purchase`,
          { 
            payment_intent_id: paymentIntent.id,
            course_id: courseId
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );

        if (data.success) {
          toast.success("Course enrolled successfully!");
          onSuccess();
        } else {
          toast.error("Enrollment failed after payment");
        }
      }
    } catch (error) {
      console.error("Payment confirmation error:", error);
      toast.error(error.response?.data?.message || "Error processing payment");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4 space-y-6">
      <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
        <PaymentElement className="payment-element" />
      </div>
      <button
        type="submit"
        disabled={!stripe || isLoading}
        className="w-full py-4 rounded-lg font-medium text-lg bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-300 transition-colors duration-200 shadow-md hover:shadow-lg flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Processing...
          </>
        ) : (
          <>
            Pay & Enroll Now
          </>
        )}
      </button>
    </form>
  );
};

const PaymentPage = () => {
  const { courseId } = useParams();
  const [courseData, setCourseData] = useState(null);
  const [clientSecret, setClientSecret] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  
  const {
    backendURL,
    token,
    user,
    currency,
    setLastRefreshed,
    calculateRating
  } = useContext(AppContext);

  useEffect(() => {
    const fetchCourseAndInitiatePayment = async () => {
      if (!user) {
        toast.warn("Please login to enroll in a course.");
        navigate("/auth");
        return;
      }
      
      try {
        // Fetch course data
        const courseResponse = await axios.get(`${backendURL}/courses/${courseId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          }
        });
        
        if (!courseResponse.data.success) {
          toast.error("Failed to fetch course details");
          navigate(`/course/${courseId}`);
          return;
        }
        
        setCourseData(courseResponse.data.course);
        
        // Check if already enrolled
        const enrolledCourseIds = user.enrolled_courses?.map(course => course.id) || [];
        if (enrolledCourseIds.includes(courseResponse.data.course.id)) {
          toast.warn("You are already enrolled in this course.");
          navigate(`/course/${courseId}`);
          return;
        }
        
        // Create payment intent
        const paymentResponse = await axios.post(
          `${backendURL}/users/create_payment_intent`,
          { course_id: courseId },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json"
            },
          }
        );
        
        if (paymentResponse.data.success) {
          setClientSecret(paymentResponse.data.clientSecret);
        } else {
          toast.error("Failed to initiate payment");
          navigate(`/course/${courseId}`);
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error(error.response?.data?.message || "Error setting up payment");
        navigate(`/course/${courseId}`);
      } finally {
        setLoading(false);
      }
    };

    fetchCourseAndInitiatePayment();
  }, [courseId, user, token, backendURL, navigate]);

  const handlePaymentSuccess = () => {
    setLastRefreshed(Date.now());
    navigate("/my-enrollments");
  };

  const handleCancel = () => {
    navigate(`/course/${courseId}`);
  };

  const appearanceOptions = {
    theme: 'stripe',
    variables: {
      colorPrimary: '#3b82f6', // Blue from Tailwind
      colorBackground: '#FFFFFF',
      colorText: '#1f2937',
      colorDanger: '#ef4444',
      fontFamily: 'Poppins, system-ui, sans-serif',
      borderRadius: '8px',
      spacingUnit: '4px',
    },
    rules: {
      '.Input': {
        borderRadius: '6px',
        borderColor: '#e5e7eb',
      },
      '.Label': {
        fontWeight: '500',
      }
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gray-50">
        <Loading />
        <p className="mt-4 text-gray-600">Setting up your payment...</p>
      </div>
    );
  }

  return (
    <>
      {/* Background gradient */}
      <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-50 to-white -z-10"></div>
      
      <div className="max-w-4xl mx-auto px-4 py-12 md:py-16">
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 border border-gray-100">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Complete Your Enrollment</h1>
          <p className="text-gray-500 mb-8">You're just one step away from unlocking this course</p>
          
          <div className="grid md:grid-cols-5 gap-8">
            <div className="md:col-span-3">
              {clientSecret ? (
                <div>
                  <div className="mb-6">
                    <h2 className="text-lg font-medium text-gray-800 mb-3">Payment Details</h2>
                    <Elements 
                      stripe={stripePromise} 
                      options={{ 
                        clientSecret,
                        appearance: appearanceOptions
                      }}
                    >
                      <CheckoutForm courseId={courseId} onSuccess={handlePaymentSuccess} />
                    </Elements>
                  </div>
                  
                  <div className="mt-4 flex justify-center">
                    <button 
                      onClick={handleCancel} 
                      className="px-6 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                    >
                      Cancel and return to course
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                    </svg>
                  </div>
                  <p className="text-red-500 text-lg mb-4">Failed to initialize payment. Please try again.</p>
                  <button 
                    onClick={handleCancel}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200"
                  >
                    Go Back to Course
                  </button>
                </div>
              )}
            </div>
            
            {courseData && (
              <div className="md:col-span-2">
                <div className="bg-gray-50 rounded-xl border border-gray-100 p-6">
                  <h2 className="text-lg font-medium text-gray-800 mb-4">Order Summary</h2>
                  
                  <div className="flex items-start gap-4 mb-6">
                    <img 
                      src={courseData.thumbnail_url} 
                      alt={courseData.course_title}
                      className="w-20 h-16 object-cover rounded-lg"
                    />
                    <div>
                      <h3 className="font-semibold text-gray-800">{courseData.course_title}</h3>
                      <p className="text-gray-500 text-sm">by {courseData.educator?.name || "Unknown Educator"}</p>
                      {courseData.course_ratings && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <img
                                className="w-3 h-3"
                                key={i}
                                src={
                                  i < Math.floor(calculateRating(courseData))
                                    ? assets.star
                                    : assets.star_blank
                                }
                                alt="star"
                              />
                            ))}
                          </div>
                          <p className="text-xs text-gray-500">
                            ({courseData.course_ratings.length} {courseData.course_ratings.length === 1 ? "rating" : "ratings"})
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="space-y-3 border-t border-gray-200 pt-4">
                    <div className="flex justify-between text-gray-600">
                      <span>Original Price:</span>
                      <span>{currency}{courseData.course_price}</span>
                    </div>
                    <div className="flex justify-between text-gray-600">
                      <span>Discount ({courseData.discount}%):</span>
                      <span>-{currency}{(courseData.discount * courseData.course_price / 100).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-lg pt-2 border-t border-gray-200">
                      <span>Total:</span>
                      <span>{currency}{(courseData.course_price - (courseData.discount * courseData.course_price) / 100).toFixed(2)}</span>
                    </div>
                  </div>
                  
                  <div className="mt-6 space-y-3">
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Full lifetime access</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Access on mobile and desktop</span>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-green-600 mt-0.5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>Certificate of completion</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        
        <div className="text-center mt-8 text-gray-500 text-sm">
          <p>Secure payment powered by Stripe</p>
          <p className="mt-1">Your payment information is processed securely.</p>
        </div>
      </div>
      <Footer />
    </>
  );
};

export default PaymentPage;