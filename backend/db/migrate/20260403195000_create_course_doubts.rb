class CreateCourseDoubts < ActiveRecord::Migration[7.2]
  def change
    create_table :course_doubts, id: :uuid do |t|
      t.uuid :course_id, null: false
      t.uuid :user_id, null: false
      t.uuid :educator_id
      t.text :question, null: false
      t.text :reply
      t.datetime :replied_at

      t.timestamps
    end

    add_foreign_key :course_doubts, :courses, on_delete: :cascade
    add_foreign_key :course_doubts, :users, on_delete: :cascade
    add_foreign_key :course_doubts, :users, column: :educator_id, on_delete: :nullify
    add_index :course_doubts, [:course_id, :created_at]
    add_index :course_doubts, [:course_id, :user_id]
  end
end