package models

import (
	"time"
)

type Chapter struct {
	ChapterID      string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"chapter_id"`
	CourseID       string    `gorm:"type:uuid;not null" json:"course_id"`
	ChapterOrder   int       `gorm:"not null" json:"chapter_order"`
	ChapterTitle   string    `gorm:"type:varchar(255);not null" json:"chapter_title"`
	ChapterContent []Lecture `gorm:"foreignKey:ChapterID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL;" json:"chapter_content"`
}

type Lecture struct {
	LectureID       string `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"lecture_id"`
	ChapterID       string `gorm:"type:uuid;not null" json:"chapter_id"`
	LectureTitle    string `gorm:"type:varchar(255);not null" json:"lecture_title"`
	LectureDuration int    `gorm:"not null" json:"lecture_duration"`
	LectureUrl      string `gorm:"type:varchar(255);not null" json:"lecture_url"`
	IsPreviewFree   bool   `gorm:"not null" json:"is_preview_free"`
	LectureOrder    int    `gorm:"not null" json:"lecture_order"`
}

type CourseRating struct {
	ID        string    `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"` // Add this line
	UserID    string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_course" json:"user_id"`
	CourseID  string    `gorm:"type:uuid;not null;uniqueIndex:idx_user_course" json:"course_id"`
	Rating    int       `gorm:"type:int;check:rating >= 1 AND rating <= 5" json:"rating"`
	CreatedAt time.Time `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt time.Time `gorm:"autoUpdateTime" json:"updated_at"`
}

type Course struct {
	ID                string          `gorm:"type:uuid;default:uuid_generate_v4();primaryKey" json:"id"`
	CourseTitle       string          `gorm:"type:varchar(255);not null" json:"course_title"`
	CourseDescription string          `gorm:"type:text;not null" json:"course_description"`
	CourseThumbnail   string          `gorm:"type:varchar(255)" json:"course_thumbnail"`
	CoursePrice       float64         `gorm:"type:numeric;not null" json:"course_price"`
	IsPublished       bool            `gorm:"default:true" json:"is_published"`
	Discount          float64         `gorm:"type:numeric;not null;check:discount >= 0 AND discount <= 100" json:"discount"`
	CourseContent     []*Chapter      `gorm:"foreignKey:CourseID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"course_content"`
	CourseRatings     []*CourseRating `gorm:"foreignKey:CourseID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE;" json:"course_ratings"`
	EducatorID        string          `gorm:"type:uuid;not null" json:"educator_id"`
	Educator          *User           `gorm:"foreignKey:EducatorID" json:"educator"`
	EnrolledStudents  []*User         `gorm:"many2many:user_courses;" json:"enrolled_students"`
	CreatedAt         time.Time       `gorm:"autoCreateTime" json:"created_at"`
	UpdatedAt         time.Time       `gorm:"autoUpdateTime" json:"updated_at"`
}

type UserCourse struct {
	UserID     string    `gorm:"type:uuid;not null;primaryKey" json:"user_id"`
	CourseID   string    `gorm:"type:uuid;not null;primaryKey" json:"course_id"`
	EnrolledAt time.Time `gorm:"autoCreateTime" json:"enrolled_at"`
}
