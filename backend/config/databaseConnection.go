package config

import (
	"fmt"
	"log"

	"github.com/TejaswiniYammanuru/LMS/backend/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitialMigration() *gorm.DB {
	dsn := "host=localhost user=postgres password=abc123 dbname=lms port=5432 sslmode=disable TimeZone=Asia/Kolkata"

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect to database: ", err)
	}

	// Ensure the ENUM type exists before migrating
	err = DB.Exec("DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_enum') THEN CREATE TYPE user_role_enum AS ENUM ('educator', 'student'); END IF; END $$;").Error
	if err != nil {
		log.Fatal("Failed to create ENUM type: ", err)
	}

	// Run AutoMigrate on all models
	err = DB.AutoMigrate(
		&models.User{},
		&models.Course{}, &models.Chapter{}, &models.Lecture{}, &models.CourseRating{}, &models.UserCourse{},
		&models.Purchase{}, &models.CourseProgress{}, &models.CourseRating{},
	)
	if err != nil {
		log.Fatal("Failed to migrate database: ", err)
	}

	sqlDB, err := DB.DB()
	if err != nil {
		log.Fatal("Failed to get database instance: ", err)
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)

	fmt.Println("Database connected and migrated successfully")

	return DB
}

func GetDB() *gorm.DB {
	return DB
}
