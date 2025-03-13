package controllers

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

	"github.com/TejaswiniYammanuru/LMS/backend/models"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

type EducatorController struct {
	DB *gorm.DB
}

func NewEducatorController(db *gorm.DB) *EducatorController {
	return &EducatorController{DB: db}
}

func (ec *EducatorController) EducatorDashBoardData(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Get educator ID from context (middleware should set this)
	educatorID := r.Context().Value("user_id")
	if educatorID == nil {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Unauthorized",
		})
		return
	}

	// Fetch courses for the educator
	var courses []models.Course
	var totalCourses int64
	if result := ec.DB.Where("educator_id = ?", educatorID).Find(&courses).Count(&totalCourses); result.Error != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to fetch courses",
		})
		return
	}

	// Fetch purchases for the educator's courses
	var purchases []models.Purchase
	if result := ec.DB.Preload("Course").
		Joins("JOIN courses ON purchases.course_id = courses.id").
		Where("courses.educator_id = ? AND purchases.status = ?", educatorID, "completed").
		Find(&purchases); result.Error != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to fetch purchases",
		})
		return
	}

	// Log the purchases for debugging
	fmt.Println("Purchases:", purchases)

	// Calculate total earnings
	totalEarnings := 0.0
	for _, purchase := range purchases {
		totalEarnings += purchase.Course.CoursePrice
	}

	// Fetch enrolled students
	var enrolledStudents []*models.User
	for _, course := range courses {
		// Preload EnrolledStudents for each course
		if result := ec.DB.Model(&course).Preload("EnrolledStudents").Find(&course); result.Error != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Failed to fetch enrolled students",
			})
			return
		}
		enrolledStudents = append(enrolledStudents, course.EnrolledStudents...)
	}

	// Preload EnrolledCourses for each enrolled student
	for _, student := range enrolledStudents {
		if result := ec.DB.Model(&student).Preload("EnrolledCourses").Find(&student); result.Error != nil {
			w.WriteHeader(http.StatusInternalServerError)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": false,
				"message": "Failed to fetch enrolled courses for students",
			})
			return
		}
	}

	// Return the response
	response := map[string]interface{}{
		"success": true,
		"dashboardData": map[string]interface{}{
			"totalEarnings":    totalEarnings,
			"enrolledStudents": enrolledStudents,
			"totalCourses":     totalCourses,
			"courses":          courses,
		},
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		w.WriteHeader(http.StatusInternalServerError)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"success": false,
			"message": "Failed to encode response",
		})
		return
	}
}

func (ec *EducatorController) GetEnrolledStudentsData(w http.ResponseWriter, r *http.Request) {
	id := r.Context().Value("user_id").(string)

	var courses []*models.Course
	if err := ec.DB.Where("educator_id = ?", id).Find(&courses).Error; err != nil {
		http.Error(w, "Failed to fetch courses", http.StatusInternalServerError)
		return
	}

	var totalPurchases []*models.Purchase
	for _, course := range courses {
		var purchases []*models.Purchase
		// Preload Course to access CourseTitle
		if err := ec.DB.Preload("Course").Where("course_id = ?", course.ID).Find(&purchases).Error; err != nil {
			http.Error(w, "Failed to fetch purchases", http.StatusInternalServerError)
			return
		}
		totalPurchases = append(totalPurchases, purchases...)
	}

	var enrolledStudents []map[string]interface{}
	for _, purchase := range totalPurchases {
		enrolledStudent := map[string]interface{}{
			"student":      purchase.UserID,
			"courseTitle":  purchase.Course.CourseTitle,
			"purchaseDate": purchase.CreatedAt,
		}
		enrolledStudents = append(enrolledStudents, enrolledStudent)
	}

	response := map[string]interface{}{
		"success":          true,
		"enrolledStudents": enrolledStudents,
	}

	if err := json.NewEncoder(w).Encode(response); err != nil {
		http.Error(w, "Failed to encode response", http.StatusInternalServerError)
	}
}

// AddCourse handles the creation of a new course
func (ec *EducatorController) AddCourse(w http.ResponseWriter, r *http.Request) {
	// Set response headers
	w.Header().Set("Content-Type", "application/json")

	// Get educator ID from context (middleware already verified the token)
	educatorID := r.Context().Value("user_id").(string)

	// Parse multipart form with 10MB max memory
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		http.Error(w, "Failed to parse form data", http.StatusBadRequest)
		return
	}

	// Get course data from form
	courseDataJSON := r.FormValue("course_data")
	if courseDataJSON == "" {
		http.Error(w, "Missing course data", http.StatusBadRequest)
		return
	}

	// Parse course data
	var courseData struct {
		CourseTitle       string  `json:"course_title"`
		CourseDescription string  `json:"course_description"`
		CoursePrice       float64 `json:"course_price"`
		Discount          float64 `json:"discount"`
		CourseContent     []struct {
			ChapterId      string `json:"chapterId"`
			ChapterTitle   string `json:"chapterTitle"`
			ChapterOrder   int    `json:"chapterOrder"`
			ChapterContent []struct {
				LectureId       string  `json:"lectureId"`
				LectureTitle    string  `json:"lectureTitle"`
				LectureDuration float64 `json:"lectureDuration"`
				LectureUrl      string  `json:"lectureUrl"`
				IsPreviewFree   bool    `json:"isPreviewFree"`
				LectureOrder    int     `json:"lectureOrder"`
			} `json:"chapterContent"`
		} `json:"course_content"`
	}

	if err := json.Unmarshal([]byte(courseDataJSON), &courseData); err != nil {
		http.Error(w, "Invalid course data format", http.StatusBadRequest)
		return
	}

	// Validate required fields
	if courseData.CourseTitle == "" {
		http.Error(w, "Course title is required", http.StatusBadRequest)
		return
	}

	if courseData.CourseDescription == "" {
		http.Error(w, "Course description is required", http.StatusBadRequest)
		return
	}

	if len(courseData.CourseContent) == 0 {
		http.Error(w, "Course content is required", http.StatusBadRequest)
		return
	}

	// Get thumbnail file
	thumbnailFile, thumbnailHeader, err := r.FormFile("course_thumbnail")
	if err != nil {
		http.Error(w, "Course thumbnail is required", http.StatusBadRequest)
		return
	}
	defer thumbnailFile.Close()

	// Validate file type
	if !strings.HasPrefix(thumbnailHeader.Header.Get("Content-Type"), "image/") {
		http.Error(w, "File must be an image", http.StatusBadRequest)
		return
	}

	// Save thumbnail file to a location (create uploads directory if it doesn't exist)
	if err := os.MkdirAll("uploads/courses", 0755); err != nil {
		http.Error(w, "Failed to create upload directory", http.StatusInternalServerError)
		return
	}

	// Generate unique filename
	fileExt := filepath.Ext(thumbnailHeader.Filename)
	newFilename := uuid.New().String() + fileExt
	filePath := filepath.Join("uploads/courses", newFilename)

	destinationFile, err := os.Create(filePath)
	if err != nil {
		http.Error(w, "Failed to create file", http.StatusInternalServerError)
		return
	}
	defer destinationFile.Close()

	if _, err := io.Copy(destinationFile, thumbnailFile); err != nil {
		http.Error(w, "Failed to save file", http.StatusInternalServerError)
		return
	}

	// Begin transaction
	tx := ec.DB.Begin()

	// Create course in database
	course := models.Course{
		CourseTitle:       courseData.CourseTitle,
		CourseDescription: courseData.CourseDescription,
		CourseThumbnail:   "/uploads/courses/" + newFilename, // Store the path relative to web root
		CoursePrice:       courseData.CoursePrice,
		Discount:          courseData.Discount,
		EducatorID:        educatorID,
		IsPublished:       true,
	}

	if err := tx.Create(&course).Error; err != nil {
		tx.Rollback()
		http.Error(w, "Failed to create course", http.StatusInternalServerError)
		return
	}

	// Create chapters and lectures
	for _, chapterData := range courseData.CourseContent {
		chapter := models.Chapter{
			ChapterID:    chapterData.ChapterId,
			CourseID:     course.ID,
			ChapterOrder: chapterData.ChapterOrder,
			ChapterTitle: chapterData.ChapterTitle,
		}

		if err := tx.Create(&chapter).Error; err != nil {
			tx.Rollback()
			http.Error(w, "Failed to create chapter", http.StatusInternalServerError)
			return
		}

		// Create lectures for this chapter
		for _, lectureData := range chapterData.ChapterContent {
			lecture := models.Lecture{
				LectureID:       lectureData.LectureId,
				ChapterID:       chapter.ChapterID,
				LectureTitle:    lectureData.LectureTitle,
				LectureDuration: int(lectureData.LectureDuration), // Convert to int
				LectureUrl:      lectureData.LectureUrl,
				IsPreviewFree:   lectureData.IsPreviewFree,
				LectureOrder:    lectureData.LectureOrder,
			}

			if err := tx.Create(&lecture).Error; err != nil {
				tx.Rollback()
				http.Error(w, "Failed to create lecture", http.StatusInternalServerError)
				return
			}
		}
	}

	// Commit transaction
	if err := tx.Commit().Error; err != nil {
		http.Error(w, "Failed to save course data", http.StatusInternalServerError)
		return
	}

	// Return success response
	response := map[string]interface{}{
		"success":   true,
		"message":   "Course added successfully",
		"course_id": course.ID,
	}

	json.NewEncoder(w).Encode(response)
}
