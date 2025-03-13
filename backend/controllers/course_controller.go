package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/TejaswiniYammanuru/LMS/backend/models"
	"github.com/gorilla/mux"
	"gorm.io/gorm"
)

type CourseController struct {
	DB *gorm.DB
}

func NewCourseController(db *gorm.DB) *CourseController {
	return &CourseController{DB: db}
}

func (ec *CourseController) GetCourseByID(w http.ResponseWriter, r *http.Request) {
	// Extract course ID from URL params
	vars := mux.Vars(r)
	courseID := vars["id"]

	var course *models.Course
	// Fetch course with all nested relations (Chapters and Lectures)
	if err := ec.DB.Preload("Educator").Preload("CourseContent.ChapterContent").Preload("CourseRatings").First(&course, "id = ?", courseID).Error; err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	// Remove lecture URLs if the lecture is not a free preview
	for _, chapter := range course.CourseContent {
		for i := range chapter.ChapterContent {
			if !chapter.ChapterContent[i].IsPreviewFree {
				chapter.ChapterContent[i].LectureUrl = "" // Now modifies the actual struct in the slice
			}
		}
	}

	// Construct response
	response := map[string]interface{}{
		"success": true,
		"course":  course,
	}

	// Send JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

func (ec *CourseController) GetAllCourses(w http.ResponseWriter, r *http.Request) {
	var courses []models.Course

	if err := ec.DB.Preload("Educator").Preload("CourseRatings").Where("is_published=?", true).Find(&courses).Error; err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusInternalServerError)
		return
	}

	response := map[string]interface{}{
		"success": true,
		"courses": courses,
	}

	// Send JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}

}
