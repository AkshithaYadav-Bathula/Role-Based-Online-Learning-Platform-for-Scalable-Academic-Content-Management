import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";

const Loading = () => {
  const params = useParams(); 
  const navigate = useNavigate();

  useEffect(() => {
    // Only auto-navigate for the dedicated /loading/:path route.
    if (params?.path) {
      const timer = setTimeout(() => {
        navigate(`/${params.path}`);
      }, 5000);

      return () => clearTimeout(timer);
    }
  }, [params, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div
        className="w-16 sm:w-20 aspect-square border-4
        border-gray-300 border-t-4 border-t-blue-400 rounded-full
        animate-spin"
      ></div>
    </div>
  );
};

export default Loading;
