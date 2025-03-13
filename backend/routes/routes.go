package routes

import (
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

func SetupRoutes(router *mux.Router, db *gorm.DB) {
	// Initialize sub-routes
	AuthRoutes(router, db)
	// UserRoutes(router, db)
	EducatorRoutes(router, db)
	CourseRoutes(router,db)
	UserRoutes(router,db)
}
