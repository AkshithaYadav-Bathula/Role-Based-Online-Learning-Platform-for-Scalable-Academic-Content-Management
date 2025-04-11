class CreateCourseProgresses < ActiveRecord::Migration[7.2]
  def change
    create_table :course_progresses, id: :uuid do |t|
      t.uuid :user_id, null: false
      t.uuid :course_id, null: false
      t.text :lecture_completed, array: true, default: []
      t.boolean :completed, default: false

      t.timestamps
    end

    add_foreign_key :course_progresses, :users, on_delete: :cascade
    add_foreign_key :course_progresses, :courses, on_delete: :cascade
  end
end
