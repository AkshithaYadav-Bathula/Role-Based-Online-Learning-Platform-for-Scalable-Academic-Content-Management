package routes

import (
	"github.com/TejaswiniYammanuru/LMS/backend/controllers"
	"github.com/TejaswiniYammanuru/LMS/backend/middleware"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func EducatorRoutes(router *mux.Router, db *gorm.DB) {
	educatorController := controllers.NewEducatorController(db)

	educator := router.PathPrefix("/api/educator").Subrouter()
	educator.Use(middleware.AuthMiddleware)

	educator.HandleFunc("/dashboard", educatorController.EducatorDashBoardData).Methods("GET")
	educator.HandleFunc("/enrolled-students", educatorController.GetEnrolledStudentsData).Methods("GET")
	educator.HandleFunc("/add-course", educatorController.AddCourse).Methods("POST")

}
