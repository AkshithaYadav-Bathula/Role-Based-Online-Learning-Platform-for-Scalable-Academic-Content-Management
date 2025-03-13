package models


import (
    // Other imports
    "github.com/lib/pq"
)

type CourseProgress struct {
    ID               string         `gorm:"type:uuid;primary_key;default:uuid_generate_v4()" json:"id"`
    UserID           string         `gorm:"type:uuid;not null" json:"user_id"`
    CourseID         string         `gorm:"type:uuid;not null" json:"course_id"`
    LectureCompleted pq.StringArray `gorm:"type:text[]" json:"lecture_completed"`
    Completed        bool           `gorm:"default:false" json:"completed"`
    
}