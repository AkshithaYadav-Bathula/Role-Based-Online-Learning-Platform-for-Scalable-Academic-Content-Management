package routes

import (
	"github.com/TejaswiniYammanuru/LMS/backend/controllers"
	"github.com/TejaswiniYammanuru/LMS/backend/middleware"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func AuthRoutes(router *mux.Router, db *gorm.DB) {
	authController := controllers.NewAuthController(db)

	// Public Auth Routes
	router.HandleFunc("/api/signup", authController.SignUp).Methods("POST")
	router.HandleFunc("/api/login", authController.Login).Methods("POST")

	// Protected Auth Routes
	protected := router.PathPrefix("/api").Subrouter()
	protected.Use(middleware.AuthMiddleware)

	protected.HandleFunc("/logout", authController.Logout).Methods("POST")
	protected.HandleFunc("/user/profile", authController.GetProfile).Methods("GET")
	protected.HandleFunc("/user/profile", authController.UpdateProfile).Methods("PUT")
}
