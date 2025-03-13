package routes

import (
	"github.com/TejaswiniYammanuru/LMS/backend/controllers"
	"github.com/TejaswiniYammanuru/LMS/backend/middleware"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func CourseRoutes(router *mux.Router, db *gorm.DB) {
	courseController := controllers.NewCourseController(db)

	// Apply middleware only to course routes
	courseRouter := router.PathPrefix("/api/course").Subrouter()
	courseRouter.Use(middleware.AuthMiddleware)
	courseRouter.HandleFunc("/all", courseController.GetAllCourses).Methods("GET")

	courseRouter.HandleFunc("/{id}", courseController.GetCourseByID).Methods("GET")
}
