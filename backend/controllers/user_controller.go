package controllers

import (
	"encoding/json"
	"errors"
	"log"
	"math"
	"net/http"
	"os"

	"github.com/TejaswiniYammanuru/LMS/backend/models"
	"github.com/gorilla/mux"
	"github.com/stripe/stripe-go/v78"
	"github.com/stripe/stripe-go/v78/checkout/session"
	"gorm.io/gorm"
)

type UserController struct {
	DB *gorm.DB
}

func NewUserController(db *gorm.DB) *UserController {
	return &UserController{DB: db}
}

type PurchaseData struct {
	CourseId string  `json:"course_id"`
	UserId   string  `json:"user_id"`
	Amount   float64 `json:"amount"`
}

// EnrollCourseRequest defines the structure of the request body for enrolling in a course
// type EnrollCourseRequest struct {
// 	UserID   string `json:"user_id"`
// 	CourseID string `json:"course_id"`
// }

// // EnrollCourse handles the enrollment of a user in a course
// func (uc *UserController) EnrollCourse(w http.ResponseWriter, r *http.Request) {
// 	var req EnrollCourseRequest

// 	// Decode the request body
// 	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
// 		http.Error(w, "Invalid request body", http.StatusBadRequest)
// 		return
// 	}

// 	// Check if the user and course exist
// 	var user models.User
// 	if err := uc.DB.Where("id = ?", req.UserID).First(&user).Error; err != nil {
// 		http.Error(w, "User not found", http.StatusNotFound)
// 		return
// 	}

// 	var course models.Course
// 	if err := uc.DB.Where("id = ?", req.CourseID).First(&course).Error; err != nil {
// 		http.Error(w, "Course not found", http.StatusNotFound)
// 		return
// 	}

// 	// Check if the user is already enrolled in the course
// 	var userCourse models.UserCourse
// 	if err := uc.DB.Where("user_id = ? AND course_id = ?", req.UserID, req.CourseID).First(&userCourse).Error; err == nil {
// 		http.Error(w, "User is already enrolled in this course", http.StatusConflict)
// 		return
// 	}

// 	// Enroll the user in the course
// 	userCourse = models.UserCourse{
// 		UserID:   req.UserID,
// 		CourseID: req.CourseID,
// 	}

// 	if err := uc.DB.Create(&userCourse).Error; err != nil {
// 		http.Error(w, "Failed to enroll in course", http.StatusInternalServerError)
// 		return
// 	}

// 	// Return success response
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(map[string]interface{}{
// 		"message": "User enrolled in course successfully",
// 		"data":    userCourse,
// 	})
// }

// func (uc *UserController) GetEnrolledCourses(w http.ResponseWriter, r *http.Request) {
// 	// Extract user ID from the request context (set by AuthMiddleware)
// 	userID := r.Context().Value("user_id").(string)

// 	// Fetch the user from the database
// 	var user models.User
// 	if err := uc.DB.
// 		Preload("EnrolledCourses").
// 		Preload("EnrolledCourses.CourseContent").
// 		Preload("EnrolledCourses.CourseContent.ChapterContent").
// 		Preload("EnrolledCourses.CourseRatings").
// 		First(&user, "id = ?", userID).Error; err != nil {
// 		if err == gorm.ErrRecordNotFound {
// 			http.Error(w, "User not found", http.StatusNotFound)
// 			return
// 		}
// 		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
// 		return
// 	}

// 	// Return the enrolled courses as a JSON response
// 	w.Header().Set("Content-Type", "application/json")
// 	json.NewEncoder(w).Encode(user.EnrolledCourses)
// }

func (uc *UserController) GetUserData(w http.ResponseWriter, r *http.Request) {
	// Extract user ID from the request context (set by AuthMiddleware)
	userID := r.Context().Value("user_id").(string)

	var user models.User
	if err := uc.DB.First(&user, "id =?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	// Return the enrolled courses as a JSON response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"user":    user,
	})

}

//user enrolled courses with lecture links

func (uc *UserController) GetUserEnrolledCourses(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	var user models.User

	if err := uc.DB.
		Preload("EnrolledCourses").
		Preload("EnrolledCourses.CourseContent").
		Preload("EnrolledCourses.CourseContent.ChapterContent").
		Preload("EnrolledCourses.CourseRatings").
		First(&user, "id = ?", userID).Error; err != nil {

		if err == gorm.ErrRecordNotFound {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":               true,
		"user_enrolled_courses": user.EnrolledCourses,
	})
}

func (uc *UserController) PurchaseCourse(w http.ResponseWriter, r *http.Request) {
	userID, ok := r.Context().Value("user_id").(string)
	if !ok || userID == "" {
		http.Error(w, "Unauthorized request", http.StatusUnauthorized)
		return
	}

	var user models.User
	if err := uc.DB.Where("id = ?", userID).First(&user).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	params := mux.Vars(r)
	courseID := params["course_id"]
	if courseID == "" {
		http.Error(w, "Course ID is required", http.StatusBadRequest)
		return
	}

	var course models.Course
	if err := uc.DB.Where("id = ?", courseID).First(&course).Error; err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	amount := math.Round((course.CoursePrice-course.Discount*course.CoursePrice/100)*100) / 100

	purchaseData := models.Purchase{
		CourseID: courseID,
		UserID:   userID,
		Amount:   amount,
		Status:   "pending",
	}
	if err := uc.DB.Create(&purchaseData).Error; err != nil {
		http.Error(w, "Failed to create purchase record", http.StatusInternalServerError)
		return
	}

	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")

	sessionParams := &stripe.CheckoutSessionParams{
		PaymentMethodTypes: stripe.StringSlice([]string{"card"}),
		LineItems: []*stripe.CheckoutSessionLineItemParams{
			{
				PriceData: &stripe.CheckoutSessionLineItemPriceDataParams{
					Currency: stripe.String("usd"),
					ProductData: &stripe.CheckoutSessionLineItemPriceDataProductDataParams{
						Name: stripe.String(course.CourseTitle),
					},
					UnitAmount: stripe.Int64(int64(purchaseData.Amount * 100)),
				},
				Quantity: stripe.Int64(1),
			},
		},
		Mode:              stripe.String(string(stripe.CheckoutSessionModePayment)),
		SuccessURL:        stripe.String("http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}"),
		CancelURL:         stripe.String("http://localhost:5173/cancel"),
		ClientReferenceID: stripe.String(purchaseData.ID),
	}

	s, err := session.New(sessionParams)
	if err != nil {
		http.Error(w, "Stripe session creation failed", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"checkout_url": s.URL,
	})
}

func (uc *UserController) VerifyPayment(w http.ResponseWriter, r *http.Request) {
	sessionID := r.URL.Query().Get("session_id")
	courseID := r.URL.Query().Get("course_id")
	userID := r.Context().Value("user_id").(string)

	if sessionID == "" || courseID == "" {
		http.Error(w, "Session ID and Course ID are required", http.StatusBadRequest)
		return
	}

	stripe.Key = os.Getenv("STRIPE_SECRET_KEY")

	// Fetch the Stripe session
	s, err := session.Get(sessionID, nil)
	if err != nil {
		http.Error(w, "Failed to fetch session from Stripe", http.StatusInternalServerError)
		return
	}

	log.Printf("Session ID: %s, Payment Status: %s, ClientReferenceID: %s", sessionID, s.PaymentStatus, s.ClientReferenceID)

	// Check if the payment is completed
	if s.PaymentStatus != stripe.CheckoutSessionPaymentStatusPaid {
		http.Error(w, "Payment not completed", http.StatusPaymentRequired)
		return
	}

	// Validate the user ID
	if s.ClientReferenceID == "" {
		http.Error(w, "Invalid user ID", http.StatusBadRequest)
		return
	}

	// Fetch the user
	var user models.User
	if err := uc.DB.First(&user, "id = ?", userID).Error; err != nil {
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}

	// Fetch the course
	var course models.Course
	if err := uc.DB.First(&course, "id = ?", courseID).Error; err != nil {
		http.Error(w, "Course not found", http.StatusNotFound)
		return
	}

	// Enroll the user in the course
	if err := uc.DB.Model(&user).Association("EnrolledCourses").Append(&course); err != nil {
		http.Error(w, "Failed to enroll in course", http.StatusInternalServerError)
		return
	}

	// Update the payment status to "completed"
	purchase := models.Purchase{
		CourseID: courseID,
		UserID:   userID,
		Status:   "completed",
	}

	// Save the purchase record
	if err := uc.DB.Where("course_id = ? AND user_id = ?", courseID, userID).
		Assign(models.Purchase{Status: "completed"}).
		FirstOrCreate(&purchase).Error; err != nil {
		http.Error(w, "Failed to update payment status", http.StatusInternalServerError)
		return
	}

	// Return success response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Payment verified, course enrolled, and payment status updated successfully",
	})
}

// 🎯 How Does a Webhook Work in Stripe?
// 1️⃣ A customer makes a payment through your checkout.
// 2️⃣ Stripe processes the payment (it may take time due to bank processing).
// 3️⃣ Once the payment is completed, Stripe calls your webhook URL and sends a payload (JSON data) about the event.
// 4️⃣ Your backend processes the webhook event, updates the database, and performs actions (e.g., mark order as "paid", send an email, etc.).
// 5️⃣ Your server responds with a 200 OK to confirm receipt.

//update user course progress

func (uc *UserController) UpdateUserCourseProgress(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

	// Define a struct to match the expected JSON body
	type RequestBody struct {
		CourseID  string `json:"course_id"`
		LectureID string `json:"lecture_id"`
	}

	var reqBody RequestBody
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	if userID == "" || reqBody.CourseID == "" || reqBody.LectureID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	var progressData models.CourseProgress

	// Fetch the progress record
	result := uc.DB.Where("user_id = ? AND course_id = ?", userID, reqBody.CourseID).First(&progressData)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// If no record exists, create a new one
			progressData = models.CourseProgress{
				UserID:           userID,
				CourseID:         reqBody.CourseID,
				LectureCompleted: []string{reqBody.LectureID}, // Initialize with the lecture ID
				Completed:        false,
			}

			if err := uc.DB.Create(&progressData).Error; err != nil {
				log.Printf("Error creating progress record: %v", err)
				http.Error(w, "Failed to create progress record", http.StatusInternalServerError)
				return
			}
		} else {
			log.Printf("Database error: %v", result.Error)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	} else {
		// Avoid duplicate lecture entries
		for _, lec := range progressData.LectureCompleted {
			if lec == reqBody.LectureID {
				w.Header().Set("Content-Type", "application/json")
				json.NewEncoder(w).Encode(map[string]interface{}{
					"success": true,
					"message": "Lecture already marked as completed",
				})
				return
			}
		}

		// Append the new lecture
		progressData.LectureCompleted = append(progressData.LectureCompleted, reqBody.LectureID)

		// Save the updated record
		if err := uc.DB.Save(&progressData).Error; err != nil {
			log.Printf("Error updating progress record: %v", err)
			http.Error(w, "Failed to update progress record", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Lecture marked as completed successfully",
	})
}

//get user course progress

func (uc *UserController) GetUserCourseProgress(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

	// Get course_id from query parameters
	courseID := r.URL.Query().Get("course_id")
	if userID == "" || courseID == "" {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Debug: Log the extracted course_id
	log.Printf("Extracted course_id: %s", courseID)

	var progressData models.CourseProgress
	if err := uc.DB.Where("user_id = ? AND course_id = ?", userID, courseID).First(&progressData).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			// If no record is found, return an empty progressData object
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"success": true,
				"progressData": models.CourseProgress{
					UserID:           userID,
					CourseID:         courseID,
					LectureCompleted: []string{}, // Default empty array for lectureCompleted
				},
			})
			return
		} else {
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success":      true,
		"progressData": progressData,
	})
}

// AddUserRating - Modified to handle JSON input instead of form data
// Backend - AddUserRating function fully corrected
func (uc *UserController) AddUserRating(w http.ResponseWriter, r *http.Request) {
	userID, _ := r.Context().Value("user_id").(string)

	// Define a struct to match the expected JSON body
	type RequestBody struct {
		CourseID string `json:"course_id"`
		Rating   int    `json:"rating"`
	}

	var reqBody RequestBody
	if err := json.NewDecoder(r.Body).Decode(&reqBody); err != nil {
		log.Printf("Error decoding request body: %v", err)
		http.Error(w, "Invalid JSON payload", http.StatusBadRequest)
		return
	}

	// Add debug logging
	log.Printf("Received rating request - UserID: %s, CourseID: %s, Rating: %d",
		userID, reqBody.CourseID, reqBody.Rating)

	// Validate required fields
	if userID == "" || reqBody.CourseID == "" || reqBody.Rating == 0 {
		http.Error(w, "Missing required fields", http.StatusBadRequest)
		return
	}

	// Validate rating range
	if reqBody.Rating < 1 || reqBody.Rating > 5 {
		http.Error(w, "Invalid rating value (must be 1-5)", http.StatusBadRequest)
		return
	}

	// Check if the course exists
	var course models.Course
	if err := uc.DB.Where("id = ?", reqBody.CourseID).First(&course).Error; err != nil {
		log.Printf("Course lookup error: %v", err)
		if errors.Is(err, gorm.ErrRecordNotFound) {
			http.Error(w, "Course not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	// Check if the user is enrolled without loading all enrollments
	var count int64
	if err := uc.DB.Model(&models.UserCourse{}).Where("user_id = ? AND course_id = ?", userID, reqBody.CourseID).Count(&count).Error; err != nil {
		log.Printf("Enrollment check error: %v", err)
		http.Error(w, "Database error", http.StatusInternalServerError)
		return
	}

	if count == 0 {
		http.Error(w, "You are not enrolled in this course", http.StatusForbidden)
		return
	}

	// Check if the user already has a rating
	var existingRating models.CourseRating
	result := uc.DB.Where("user_id = ? AND course_id = ?", userID, reqBody.CourseID).First(&existingRating)

	if result.Error != nil {
		if errors.Is(result.Error, gorm.ErrRecordNotFound) {
			// Create a new rating if none exists
			newRating := models.CourseRating{
				UserID:   userID,
				CourseID: reqBody.CourseID,
				Rating:   reqBody.Rating,
			}

			log.Printf("Creating new rating record")
			if err := uc.DB.Create(&newRating).Error; err != nil {
				log.Printf("Error creating rating: %v", err)
				http.Error(w, "Failed to create rating record", http.StatusInternalServerError)
				return
			}
		} else {
			log.Printf("Error checking existing rating: %v", result.Error)
			http.Error(w, "Database error", http.StatusInternalServerError)
			return
		}
	} else {
		// Update the existing rating
		log.Printf("Updating existing rating from %d to %d", existingRating.Rating, reqBody.Rating)
		existingRating.Rating = reqBody.Rating
		if err := uc.DB.Save(&existingRating).Error; err != nil {
			log.Printf("Error updating rating: %v", err)
			http.Error(w, "Failed to update rating", http.StatusInternalServerError)
			return
		}
	}

	// Response
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Rating added successfully",
	})
}

func (uc *UserController) UpdateRole(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)
	var user models.User
	if err := uc.DB.First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			http.Error(w, "User not found", http.StatusNotFound)
			return
		}
		http.Error(w, "Failed to fetch user", http.StatusInternalServerError)
		return
	}

	user.Role = "educator"
	if err := uc.DB.Save(&user).Error; err != nil {
		http.Error(w, "Failed to update user role", http.StatusInternalServerError)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"success": true,
		"message": "Role updated successfully",
	})

}
