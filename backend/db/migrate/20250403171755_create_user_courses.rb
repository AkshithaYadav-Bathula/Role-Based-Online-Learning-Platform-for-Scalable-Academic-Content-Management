class CreateUserCourses < ActiveRecord::Migration[7.2]
  def change
    create_table :user_courses, id: false do |t|
      t.uuid :user_id, null: false
      t.uuid :course_id, null: false
      t.datetime :enrolled_at, null: false, default: -> { 'CURRENT_TIMESTAMP' }

      t.timestamps
    end
    add_foreign_key :user_courses, :users, on_delete: :cascade
    add_foreign_key :user_courses, :courses, on_delete: :cascade
    add_index :user_courses, [:user_id, :course_id], unique: true
  end
end
