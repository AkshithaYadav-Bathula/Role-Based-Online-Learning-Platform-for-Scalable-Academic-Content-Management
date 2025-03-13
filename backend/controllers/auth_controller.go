package controllers

import (
	"encoding/json"
	"net/http"

	"github.com/TejaswiniYammanuru/LMS/backend/models"
	"github.com/TejaswiniYammanuru/LMS/backend/utils"
	"gorm.io/gorm"
)

type AuthController struct {
	DB *gorm.DB
}

func NewAuthController(db *gorm.DB) *AuthController {
	return &AuthController{DB: db}
}

func (ac *AuthController) SignUp(w http.ResponseWriter, r *http.Request) {
	var input models.SignupInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	var existingUser models.User
	if err := ac.DB.Preload("EnrolledCourses").Where("email = ?", input.Email).First(&existingUser).Error; err == nil {
		utils.RespondWithError(w, http.StatusBadRequest, "User with this email already exists")
		return
	}

	user := models.User{
		Name:     input.Name,
		Email:    input.Email,
		Password: input.Password,
	}

	if err := user.HashPassword(); err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error while hashing password")
		return
	}

	if err := ac.DB.Create(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error while creating user")
		return
	}

	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error while generating token")
		return
	}

	utils.RespondWithJSON(w, http.StatusCreated, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}

func (ac *AuthController) Login(w http.ResponseWriter, r *http.Request) {
	var input models.LoginInput
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	var user models.User
	if err := ac.DB.Preload("EnrolledCourses").Where("email = ?", input.Email).First(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	if err := user.CheckPassword(input.Password); err != nil {
		utils.RespondWithError(w, http.StatusUnauthorized, "Invalid email or password")
		return
	}

	token, err := utils.GenerateJWT(user.ID)
	if err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error while generating token")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, map[string]interface{}{
		"user":  user,
		"token": token,
	})
}

func (ac *AuthController) Logout(w http.ResponseWriter, r *http.Request) {
	http.SetCookie(w, &http.Cookie{
		Name:     "token",
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
	})

	utils.RespondWithJSON(w, http.StatusOK, map[string]string{
		"message": "Successfully logged out",
	})
}

func (ac *AuthController) GetProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var user models.User
	if err := ac.DB.First(&user, "id = ?", userID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, user)
}

func (ac *AuthController) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	userID := r.Context().Value("user_id").(string)

	var input models.User
	if err := json.NewDecoder(r.Body).Decode(&input); err != nil {
		utils.RespondWithError(w, http.StatusBadRequest, "Invalid request payload")
		return
	}

	var user models.User
	if err := ac.DB.First(&user, "id = ?", userID).Error; err != nil {
		utils.RespondWithError(w, http.StatusNotFound, "User not found")
		return
	}

	user.Name = input.Name

	if err := ac.DB.Save(&user).Error; err != nil {
		utils.RespondWithError(w, http.StatusInternalServerError, "Error updating profile")
		return
	}

	utils.RespondWithJSON(w, http.StatusOK, user)
}

//https://chatgpt.com/c/67b9467e-f320-800a-a2b7-fde5d88261bc
