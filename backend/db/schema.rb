# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[7.2].define(version: 2026_04_25_010000) do
  # These are extensions that must be enabled in order to support this database
  enable_extension "plpgsql"

  create_table "active_storage_attachments", force: :cascade do |t|
    t.string "name", null: false
    t.string "record_type", null: false
    t.bigint "record_id", null: false
    t.bigint "blob_id", null: false
    t.datetime "created_at", null: false
    t.index ["blob_id"], name: "index_active_storage_attachments_on_blob_id"
    t.index ["record_type", "record_id", "name", "blob_id"], name: "index_active_storage_attachments_uniqueness", unique: true
  end

  create_table "active_storage_blobs", force: :cascade do |t|
    t.string "key", null: false
    t.string "filename", null: false
    t.string "content_type"
    t.text "metadata"
    t.string "service_name", null: false
    t.bigint "byte_size", null: false
    t.string "checksum"
    t.datetime "created_at", null: false
    t.index ["key"], name: "index_active_storage_blobs_on_key", unique: true
  end

  create_table "active_storage_variant_records", force: :cascade do |t|
    t.bigint "blob_id", null: false
    t.string "variation_digest", null: false
    t.index ["blob_id", "variation_digest"], name: "index_active_storage_variant_records_uniqueness", unique: true
  end

  create_table "announcements", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "course_id", null: false
    t.uuid "educator_id", null: false
    t.string "title", null: false
    t.text "message", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["course_id", "created_at"], name: "index_announcements_on_course_id_and_created_at"
  end

  create_table "chapters", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "course_id", null: false
    t.integer "chapter_order", null: false
    t.string "chapter_title", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "course_doubt_votes", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "course_doubt_id", null: false
    t.uuid "user_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["course_doubt_id", "user_id"], name: "index_course_doubt_votes_on_course_doubt_id_and_user_id", unique: true
    t.index ["user_id", "created_at"], name: "index_course_doubt_votes_on_user_id_and_created_at"
  end

  create_table "course_doubts", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "course_id", null: false
    t.uuid "user_id", null: false
    t.uuid "educator_id"
    t.text "question", null: false
    t.text "reply"
    t.datetime "replied_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["course_id", "created_at"], name: "index_course_doubts_on_course_id_and_created_at"
    t.index ["course_id", "user_id"], name: "index_course_doubts_on_course_id_and_user_id"
  end

  create_table "course_progresses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "course_id", null: false
    t.text "lecture_completed", default: [], array: true
    t.boolean "completed", default: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "course_ratings", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "course_id", null: false
    t.integer "rating", limit: 2, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "course_id"], name: "index_course_ratings_on_user_id_and_course_id", unique: true
  end

  create_table "courses", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "course_title", null: false
    t.text "course_description", null: false
    t.decimal "course_price", precision: 10, scale: 2, null: false
    t.boolean "is_published", default: true
    t.decimal "discount", precision: 5, scale: 2, default: "0.0", null: false
    t.uuid "educator_id", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.jsonb "resources", default: [], null: false
  end

  create_table "lectures", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "chapter_id", null: false
    t.string "lecture_title", null: false
    t.integer "lecture_duration", null: false
    t.string "lecture_url", null: false
    t.boolean "is_preview_free", default: false, null: false
    t.integer "lecture_order", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
  end

  create_table "notifications", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "actor_id"
    t.uuid "course_id"
    t.uuid "course_doubt_id"
    t.string "kind", null: false
    t.string "title", null: false
    t.text "message", null: false
    t.datetime "read_at"
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["kind"], name: "index_notifications_on_kind"
    t.index ["user_id", "created_at"], name: "index_notifications_on_user_id_and_created_at"
    t.index ["user_id", "read_at"], name: "index_notifications_on_user_id_and_read_at"
  end

  create_table "purchases", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "course_id", null: false
    t.decimal "amount", precision: 10, scale: 2, null: false
    t.string "status", default: "pending", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.string "payment_intent_id"
    t.string "payment_method", default: "stripe_payment_intent"
  end

  create_table "user_courses", id: false, force: :cascade do |t|
    t.uuid "user_id", null: false
    t.uuid "course_id", null: false
    t.datetime "enrolled_at", default: -> { "CURRENT_TIMESTAMP" }, null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["user_id", "course_id"], name: "index_user_courses_on_user_id_and_course_id", unique: true
  end

  create_table "users", id: :uuid, default: -> { "gen_random_uuid()" }, force: :cascade do |t|
    t.string "name", null: false
    t.string "email", null: false
    t.string "password_digest", null: false
    t.string "role", default: "student", null: false
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.integer "learning_streak", default: 0, null: false
    t.date "last_learning_on"
    t.date "streak_missed_notified_on"
    t.index ["email"], name: "index_users_on_email", unique: true
    t.index ["role"], name: "index_users_on_role"
    t.check_constraint "role::text = ANY (ARRAY['student'::character varying, 'educator'::character varying]::text[])", name: "users_role_allowed_values"
  end

  add_foreign_key "active_storage_attachments", "active_storage_blobs", column: "blob_id"
  add_foreign_key "active_storage_variant_records", "active_storage_blobs", column: "blob_id"
  add_foreign_key "announcements", "courses", on_delete: :cascade
  add_foreign_key "announcements", "users", column: "educator_id", on_delete: :cascade
  add_foreign_key "chapters", "courses", on_delete: :cascade
  add_foreign_key "course_doubt_votes", "course_doubts", on_delete: :cascade
  add_foreign_key "course_doubt_votes", "users", on_delete: :cascade
  add_foreign_key "course_doubts", "courses", on_delete: :cascade
  add_foreign_key "course_doubts", "users", column: "educator_id", on_delete: :nullify
  add_foreign_key "course_doubts", "users", on_delete: :cascade
  add_foreign_key "course_progresses", "courses", on_delete: :cascade
  add_foreign_key "course_progresses", "users", on_delete: :cascade
  add_foreign_key "course_ratings", "courses", on_delete: :cascade
  add_foreign_key "course_ratings", "users", on_delete: :cascade
  add_foreign_key "courses", "users", column: "educator_id", on_delete: :cascade
  add_foreign_key "lectures", "chapters", on_delete: :cascade
  add_foreign_key "notifications", "course_doubts", on_delete: :cascade
  add_foreign_key "notifications", "courses", on_delete: :cascade
  add_foreign_key "notifications", "users", column: "actor_id", on_delete: :nullify
  add_foreign_key "notifications", "users", on_delete: :cascade
  add_foreign_key "purchases", "courses", on_delete: :cascade
  add_foreign_key "purchases", "users", on_delete: :cascade
  add_foreign_key "user_courses", "courses", on_delete: :cascade
  add_foreign_key "user_courses", "users", on_delete: :cascade
end
