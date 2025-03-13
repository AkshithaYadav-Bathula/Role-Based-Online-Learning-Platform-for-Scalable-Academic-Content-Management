package routes

import (
	"github.com/TejaswiniYammanuru/LMS/backend/controllers"
	"github.com/TejaswiniYammanuru/LMS/backend/middleware"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func UserRoutes(router *mux.Router, db *gorm.DB) {
	userController := controllers.NewUserController(db)

	user := router.PathPrefix("/api/user").Subrouter()
	user.Use(middleware.AuthMiddleware)

	user.HandleFunc("/data", userController.GetUserData).Methods("GET")
	user.HandleFunc("/enrolled-courses", userController.GetUserEnrolledCourses).Methods("GET")
	user.HandleFunc("/purchase/{course_id}", userController.PurchaseCourse).Methods("POST")
	user.HandleFunc("/verify-payment", userController.VerifyPayment).Methods("GET")

	user.HandleFunc("/update-course-progress", userController.UpdateUserCourseProgress).Methods("POST")
	user.HandleFunc("/get-course-progress", userController.GetUserCourseProgress).Methods("GET")
	user.HandleFunc("/add-rating", userController.AddUserRating).Methods("POST")
	user.HandleFunc("/update-role", userController.UpdateRole).Methods("POST")

}
