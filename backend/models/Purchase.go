package models

import "time"

type Purchase struct {
	ID       string  `gorm:"type:uuid;primary_key;default:gen_random_uuid()" json:"id"`
	CourseID string  `gorm:"type:uuid;not null" json:"course_id"`
	Course   *Course  `gorm:"foreignKey:CourseID;references:ID" json:"course"`
	UserID   string  `gorm:"type:uuid;not null" json:"user_id"`
	User     *User    `gorm:"foreignKey:UserID;references:ID" json:"user"`
	Amount   float64 `gorm:"type:numeric;not null" json:"amount"`
	Status    string    `gorm:"type:varchar(20);not null;default:'pending'" json:"status"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

