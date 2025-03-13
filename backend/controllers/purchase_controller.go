package controllers

import (
	"net/http"

	"gorm.io/gorm"
)

type PurchaseController struct {
	DB *gorm.DB
}

func NewPurchaseController(db *gorm.DB) *PurchaseController {
	return &PurchaseController{DB: db}
}

func (p *PurchaseController) EducatorDashBoardData(w http.ResponseWriter, r *http.Request) {
	//get educator by token

}
